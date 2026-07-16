import { createHash } from "node:crypto";
import { join } from "node:path";

import { attachSnapshotIdentity } from "./drift.mjs";
import { safePublicGet } from "./network.mjs";
import { writeTextAtomic } from "./workspace.mjs";

const MAX_SITEMAPS = 10;
const MAX_URLS = 5_000;
const DEFAULT_MAX_PAGES = 100;

export async function capturePublicSnapshot({
  runDirectory,
  storeUrl,
  maxPages = DEFAULT_MAX_PAGES,
  get = safePublicGet,
}) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 500) {
    throw new Error("--max-pages must be an integer from 1 to 500");
  }
  const root = new URL(storeUrl);
  const approvedOrigin = root.origin;
  const robotsResponse = await fetchOptional(new URL("/robots.txt", root), { approvedOrigin, get });
  const robots = parseRobots(robotsResponse?.body ?? "");
  const sitemap = await discoverSitemapUrls(new URL("/sitemap.xml", root), { approvedOrigin, get });
  const rootPage = isDisallowed(root.pathname, robots)
    ? null
    : await capturePage(root.toString(), { approvedOrigin, get, runDirectory });
  const candidates = uniqueUrls(
    [root.toString(), ...(rootPage?.links ?? []), ...sitemap.urls],
    root,
  ).slice(0, MAX_URLS);
  const allowed = candidates.filter((url) => !isDisallowed(new URL(url).pathname, robots));
  const selected = allowed.slice(0, maxPages);
  const pages = await mapConcurrent(selected, 4, async (url) =>
    rootPage?.url === url ? rootPage : capturePage(url, { approvedOrigin, get, runDirectory }),
  );
  const capturedAt = new Date().toISOString();
  return attachSnapshotIdentity({
    schemaVersion: 1,
    capturedAt,
    source: { origin: approvedOrigin, mode: "credential-free-public", evidenceTrust: "untrusted" },
    limits: { maxPages, maxSitemaps: MAX_SITEMAPS, maxUrls: MAX_URLS, maxResponseBytes: 1_048_576 },
    robots: {
      fetched: Boolean(robotsResponse),
      sha256: robotsResponse ? sha256(robotsResponse.body) : null,
      disallow: robots,
      skippedCount: candidates.length - allowed.length,
    },
    sitemap: {
      fetchedCount: sitemap.fetchedCount,
      discoveredCount: sitemap.urls.length,
      errors: sitemap.errors,
    },
    pages,
    summary: summarizePages(pages, candidates.length, selected.length),
  });
}

async function discoverSitemapUrls(initialUrl, { approvedOrigin, get }) {
  const queue = [initialUrl.toString()];
  const seen = new Set();
  const urls = [];
  const errors = [];
  while (queue.length && seen.size < MAX_SITEMAPS) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const response = await fetchOptional(url, { approvedOrigin, get });
    if (!response) {
      errors.push({ url, reason: "unavailable" });
      continue;
    }
    const locations = parseSitemapLocations(response.body);
    for (const location of locations) {
      let candidate;
      try {
        candidate = new URL(location, url);
      } catch {
        continue;
      }
      if (candidate.origin !== approvedOrigin || candidate.protocol !== "https:") continue;
      if (/\.xml(?:\.gz)?$/i.test(candidate.pathname) && seen.size + queue.length < MAX_SITEMAPS) {
        if (!candidate.pathname.endsWith(".gz")) queue.push(candidate.toString());
      } else if (urls.length < MAX_URLS) {
        urls.push(candidate.toString());
      }
    }
  }
  return { urls: [...new Set(urls)], fetchedCount: seen.size, errors };
}

async function capturePage(url, { approvedOrigin, get, runDirectory }) {
  const path = new URL(url).pathname;
  try {
    const response = await get(url, { approvedOrigin });
    const contentType = headerValue(response.headers["content-type"]);
    const bodySha256 = sha256(response.body);
    const page = {
      url: response.url ?? url,
      path,
      type: classifyPath(path),
      status: response.status,
      contentType,
      bytes: response.bytes,
      bodySha256,
      title: null,
      description: null,
      headings: [],
      evidencePath: null,
    };
    if (response.status >= 200 && response.status < 300 && /text\/html/i.test(contentType)) {
      const evidencePath = join("evidence", "public", "pages", `${bodySha256}.html`);
      await writeTextAtomic(join(runDirectory, evidencePath), response.body);
      Object.assign(page, extractHtmlMetadata(response.body), {
        evidencePath,
        accessState: detectAccessState(response.body),
      });
      page.links = extractSameOriginLinks(response.body, page.url, approvedOrigin);
    }
    return page;
  } catch (error) {
    return { url, path, type: classifyPath(path), status: 0, error: safeError(error) };
  }
}

export function detectAccessState(html) {
  return /(?:template-password|shopify-section-main-password|<form\b[^>]*action=["'][^"']*\/password)/i.test(
    html,
  )
    ? "password-gated"
    : "public";
}

export function extractSameOriginLinks(html, baseUrl, approvedOrigin) {
  const result = [];
  const seen = new Set();
  for (const match of html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
    const raw = decodeXml(match[1].trim());
    if (!raw || raw.startsWith("#")) continue;
    let url;
    try {
      url = new URL(raw, baseUrl);
    } catch {
      continue;
    }
    url.hash = "";
    if (url.protocol !== "https:" || url.origin !== approvedOrigin) continue;
    const normalized = url.toString();
    if (!seen.has(normalized)) result.push(normalized);
    seen.add(normalized);
    if (result.length >= 200) break;
  }
  return result;
}

export function parseSitemapLocations(xml) {
  return [...xml.matchAll(/<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/gi)]
    .map((match) => decodeXml(stripTags(match[1]).trim()))
    .filter(Boolean)
    .slice(0, MAX_URLS);
}

export function parseRobots(input) {
  const rules = [];
  let applies = false;
  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") applies = value === "*";
    if (field === "disallow" && applies && value.startsWith("/")) rules.push(value);
  }
  return [...new Set(rules)].slice(0, 500);
}

export function isDisallowed(path, rules) {
  return rules.some((rule) => (rule !== "/" ? path.startsWith(rule.replace(/\*.*$/, "")) : true));
}

export function classifyPath(path) {
  if (path === "/" || !path) return "home";
  if (/^\/collections\/?$/.test(path)) return "collection-index";
  if (/^\/products\/[^/]+\/?$/.test(path)) return "product";
  if (/^\/collections\/[^/]+\/?$/.test(path)) return "collection";
  if (/^\/blogs\/[^/]+\/[^/]+\/?$/.test(path)) return "article";
  if (/^\/blogs\/[^/]+\/?$/.test(path)) return "blog";
  if (/^\/pages\/[^/]+\/?$/.test(path)) return "page";
  if (/^\/landing\/[^/]+\/?$/.test(path)) return "landing";
  if (/^\/policies\/[^/]+\/?$/.test(path)) return "policy";
  if (/^\/search\/?$/.test(path)) return "search";
  if (/^\/cart\/?$/.test(path)) return "cart";
  if (/^\/account(?:\/|$)/.test(path)) return "account";
  if (/^\/checkout(?:\/|$)/.test(path)) return "checkout";
  return "other";
}

function extractHtmlMetadata(html) {
  const title = firstMatch(html, /<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i);
  const description =
    firstMatch(html, /<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ??
    firstMatch(html, /<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const headings = [...html.matchAll(/<h([1-3])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi)]
    .slice(0, 30)
    .map((match) => ({
      level: Number(match[1]),
      text: normalizeText(decodeXml(stripTags(match[2]))).slice(0, 300),
    }))
    .filter((heading) => heading.text);
  const linkTags = [...html.matchAll(/<link\s+[^>]*>/gi)].slice(0, 200);
  const canonical = linkTags
    .map((match) => extractAttributes(match[0]))
    .find((attributes) => attributes.rel?.toLowerCase().split(/\s+/).includes("canonical"))?.href;
  const hreflang = linkTags
    .map((match) => extractAttributes(match[0]))
    .filter(
      (attributes) =>
        attributes.rel?.toLowerCase().split(/\s+/).includes("alternate") &&
        attributes.hreflang &&
        attributes.href,
    )
    .map((attributes) => ({
      language: attributes.hreflang.slice(0, 50),
      href: attributes.href.slice(0, 500),
    }))
    .slice(0, 50);
  const robots = [...html.matchAll(/<meta\s+[^>]*>/gi)]
    .slice(0, 200)
    .map((match) => extractAttributes(match[0]))
    .find((attributes) => attributes.name?.toLowerCase() === "robots")?.content;
  return {
    title: title ? normalizeText(decodeXml(stripTags(title))).slice(0, 300) : null,
    description: description ? normalizeText(decodeXml(description)).slice(0, 500) : null,
    headings,
    canonical: canonical?.slice(0, 500) ?? null,
    robots: robots?.slice(0, 300) ?? null,
    hreflang,
    structuredDataTypes: extractStructuredDataTypes(html),
  };
}

function extractAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attributes[match[1].toLowerCase()] = decodeXml(match[2] ?? match[3] ?? "");
  }
  return attributes;
}

function extractStructuredDataTypes(html) {
  const types = new Set();
  for (const match of html.matchAll(
    /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    if (match[1].length > 64 * 1024) continue;
    try {
      const pending = [JSON.parse(match[1])];
      let nodes = 0;
      while (pending.length && nodes < 2_000) {
        const value = pending.shift();
        nodes += 1;
        if (Array.isArray(value)) {
          pending.push(...value);
          continue;
        }
        if (!value || typeof value !== "object") continue;
        const type = value["@type"];
        for (const candidate of Array.isArray(type) ? type : [type]) {
          if (typeof candidate === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,99}$/.test(candidate)) {
            types.add(candidate);
          }
        }
        pending.push(
          ...Object.values(value).filter((nested) => nested && typeof nested === "object"),
        );
      }
    } catch {}
    if (types.size >= 100) break;
  }
  return [...types].sort().slice(0, 100);
}

function summarizePages(pages, discoveredCount, selectedCount) {
  const byType = {};
  let successfulCount = 0;
  let passwordGateCount = 0;
  for (const page of pages) {
    byType[page.type] = (byType[page.type] ?? 0) + 1;
    if (page.status >= 200 && page.status < 400) successfulCount += 1;
    if (page.accessState === "password-gated") passwordGateCount += 1;
  }
  return {
    discoveredCount,
    selectedCount,
    capturedCount: pages.length,
    successfulCount,
    failedCount: pages.length - successfulCount,
    passwordGateCount,
    byType,
  };
}

async function fetchOptional(url, { approvedOrigin, get }) {
  try {
    const response = await get(url.toString(), { approvedOrigin });
    return response.status >= 200 && response.status < 300 ? response : null;
  } catch {
    return null;
  }
}

function uniqueUrls(values, root) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    try {
      const url = new URL(value, root);
      url.hash = "";
      if (url.origin !== root.origin || url.protocol !== "https:") continue;
      const normalized = url.toString();
      if (!seen.has(normalized)) result.push(normalized);
      seen.add(normalized);
    } catch {}
  }
  return result;
}

async function mapConcurrent(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function firstMatch(input, pattern) {
  return input.match(pattern)?.[1] ?? null;
}
function stripTags(input) {
  return input.replace(/<[^>]*>/g, " ");
}
function normalizeText(input) {
  return input.replace(/\s+/g, " ").trim();
}
function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}
function headerValue(value) {
  return Array.isArray(value) ? value.join(", ") : (value ?? "");
}
function safeError(error) {
  return String(error?.message ?? error)
    .replace(/\b(?:shpat|shpca|shpss|shppa)_[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .slice(0, 300);
}

function decodeXml(input) {
  return input.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (entity) => {
    const named = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const hexadecimal = entity.toLowerCase().startsWith("&#x");
    const value = Number.parseInt(entity.slice(hexadecimal ? 3 : 2, -1), hexadecimal ? 16 : 10);
    return Number.isFinite(value) ? String.fromCodePoint(value) : entity;
  });
}
