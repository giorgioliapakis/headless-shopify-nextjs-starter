import crypto from "node:crypto";

import { revalidateTag } from "next/cache";

import { getNumericShopifyId } from "@/lib/shopify/utils";

const MAX_WEBHOOK_BYTES = 1024 * 1024;
const ALLOWED_TOPICS = new Set([
  "articles/create",
  "articles/delete",
  "articles/update",
  "collections/create",
  "collections/delete",
  "collections/update",
  "metaobjects/create",
  "metaobjects/delete",
  "metaobjects/update",
  "products/create",
  "products/delete",
  "products/update",
]);
const NO_STORE_HEADERS = { "cache-control": "private, no-store" };

function response(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("cache-control", NO_STORE_HEADERS["cache-control"]);
  return Response.json(data, { ...init, headers });
}

export function verifyShopifyWebhook(
  body: Uint8Array,
  hmacHeader: string | null,
  secret: string,
): boolean {
  if (!hmacHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(hmacHeader, "base64");
  } catch {
    return false;
  }
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
}

function expectedShopDomain(): string | null {
  const value = process.env.PUBLIC_STORE_DOMAIN ?? process.env.SHOPIFY_STORE_DOMAIN;
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function tagsForProduct(payload: Record<string, unknown>): string[] {
  const tags = ["products"];
  if (typeof payload.handle === "string" && payload.handle) {
    tags.push(`product-${payload.handle}`, `recommendations-${payload.handle}`);
  }
  const rawId = payload.admin_graphql_api_id ?? payload.id;
  if (typeof rawId === "string" || typeof rawId === "number") {
    const numericId = getNumericShopifyId(String(rawId));
    if (numericId) tags.push(`product-${numericId}`);
  }
  return tags;
}

function tagsForCollection(topic: string, payload: Record<string, unknown>): string[] {
  const tags = ["collections"];
  if (topic.endsWith("/create") || topic.endsWith("/delete")) tags.push("collections-index");
  if (typeof payload.handle === "string" && payload.handle) {
    tags.push(`collection-${payload.handle}`);
  }
  return tags;
}

function tagsForArticle(payload: Record<string, unknown>): string[] {
  const tags = ["blogs"];
  const blogHandle = payload.blog_handle ?? payload.blogHandle;
  const articleHandle = payload.handle;
  if (typeof blogHandle === "string" && blogHandle) {
    tags.push(`blog-${blogHandle}`);
    if (typeof articleHandle === "string" && articleHandle) {
      tags.push(`article-${blogHandle}-${articleHandle}`);
    }
  }
  return tags;
}

function tagsForMetaobject(payload: Record<string, unknown>): string[] {
  const tags = ["cms:all"];
  const nested =
    typeof payload.metaobject === "object" && payload.metaobject
      ? (payload.metaobject as Record<string, unknown>)
      : undefined;
  const type = payload.type ?? nested?.type ?? payload.metaobject_type;
  const handle = payload.handle ?? nested?.handle ?? payload.metaobject_handle;

  if (type === "cms_page") {
    tags.push("cms:pages");
    if (typeof handle === "string") {
      const slug = handle.split("--")[0];
      if (slug) tags.push(`cms:page:${slug}`);
    }
  } else if (type === "cms_homepage") {
    tags.push("cms:homepage");
  } else if (type === "cms_section" || type === "cms_hero") {
    tags.push("cms:pages", "cms:homepage");
  }
  return tags;
}

export function cacheTagsForShopifyWebhook(
  topic: string,
  payload: Record<string, unknown>,
): string[] {
  const tags = topic.startsWith("products/")
    ? tagsForProduct(payload)
    : topic.startsWith("articles/")
      ? tagsForArticle(payload)
      : topic.startsWith("collections/")
        ? tagsForCollection(topic, payload)
        : topic.startsWith("metaobjects/")
          ? tagsForMetaobject(payload)
          : [];
  return [...new Set(tags)];
}

export async function POST(request: Request) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const shopDomain = expectedShopDomain();
  const apiVersion = process.env.SHOPIFY_API_VERSION ?? "2026-07";
  if (!secret || !shopDomain) {
    return response({ error: "Webhook endpoint is not configured" }, { status: 503 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return response({ error: "Payload too large" }, { status: 413 });
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_WEBHOOK_BYTES) {
    return response({ error: "Payload too large" }, { status: 413 });
  }

  if (!verifyShopifyWebhook(bytes, request.headers.get("x-shopify-hmac-sha256"), secret)) {
    return response({ error: "Invalid signature" }, { status: 401 });
  }

  const topic = request.headers.get("x-shopify-topic")?.toLowerCase();
  const receivedShop = request.headers.get("x-shopify-shop-domain")?.toLowerCase();
  const receivedVersion = request.headers.get("x-shopify-api-version");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  if (!topic || !ALLOWED_TOPICS.has(topic)) {
    return response({ error: "Unsupported topic" }, { status: 400 });
  }
  if (receivedShop !== shopDomain) {
    return response({ error: "Unexpected shop" }, { status: 403 });
  }
  if (receivedVersion !== apiVersion) {
    return response({ error: "Unexpected API version" }, { status: 409 });
  }
  if (!webhookId) {
    return response({ error: "Missing webhook ID" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    payload = parsed as Record<string, unknown>;
  } catch {
    return response({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const tagsInvalidated = cacheTagsForShopifyWebhook(topic, payload);
  for (const tag of tagsInvalidated) revalidateTag(tag, "max");

  return response({ success: true, topic, tagsInvalidated });
}
