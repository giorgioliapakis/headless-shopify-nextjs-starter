const API_VERSION = "2026-07";
const MAX_RESPONSE_BYTES = 65_536;
const QUERY = `query StorefrontDoctor($menuHandle: String!) {
  shop { id privacyPolicy { id } }
  localization { country { isoCode currency { isoCode } } }
  products(first: 1) { nodes { id } }
  collections(first: 1) { nodes { id } }
  menu(handle: $menuHandle) { id }
  pages(first: 1) { nodes { id } }
}`;

export async function inspectStorefrontConnection(environment, fetchImplementation = fetch) {
  const domain = environment.PUBLIC_STORE_DOMAIN?.trim();
  const token = environment.PUBLIC_STOREFRONT_API_TOKEN?.trim();
  const apiVersion = environment.SHOPIFY_API_VERSION?.trim();
  const checks = [
    check(
      "store-domain",
      Boolean(domain && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(domain)),
      "Use the permanent your-store.myshopify.com domain, without a scheme or path",
    ),
    check(
      "public-storefront-token",
      Boolean(token && token.length <= 512 && !/\s/.test(token)),
      "Create a read-only Storefront API token in Shopify's Headless channel",
    ),
    check(
      "api-version",
      apiVersion === API_VERSION,
      `Set SHOPIFY_API_VERSION=${API_VERSION}`,
      apiVersion || "missing",
    ),
  ];
  if (checks.some((entry) => entry.status === "fail")) return result(checks);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetchImplementation(
      `https://${domain}/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-shopify-storefront-access-token": token,
        },
        body: JSON.stringify({ query: QUERY, variables: { menuHandle: "main-menu" } }),
      },
    );
    const body = await readBoundedJson(response);
    checks.push(
      check(
        "storefront-http",
        response.ok,
        "Verify the permanent store domain and regenerate the Storefront token",
        String(response.status),
      ),
    );
    const observedVersion = response.headers.get("x-shopify-api-version");
    checks.push(
      check(
        "observed-api-version",
        observedVersion === API_VERSION,
        `Shopify must serve the configured ${API_VERSION} API version`,
        observedVersion ?? "header-absent",
      ),
    );
    checks.push(
      check(
        "storefront-graphql",
        response.ok && body && !body.errors && Boolean(body.data?.shop?.id),
        "Confirm the token has Storefront read access for catalogue and content fields",
      ),
    );
  } catch (error) {
    checks.push(
      check(
        "storefront-network",
        false,
        error?.name === "AbortError"
          ? "Shopify did not respond within 8 seconds; retry before building"
          : "Check DNS/network access and the permanent myshopify.com domain",
      ),
    );
  } finally {
    clearTimeout(timeout);
  }
  return result(checks);
}

async function readBoundedJson(response) {
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error("Storefront doctor response exceeded its size limit");
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("Storefront doctor response exceeded its size limit");
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function check(id, passed, remediation, observed) {
  return {
    id,
    status: passed ? "pass" : "fail",
    ...(observed ? { observed } : {}),
    remediation,
  };
}

function result(checks) {
  return {
    schemaVersion: 1,
    ok: checks.every((entry) => entry.status === "pass"),
    apiVersion: API_VERSION,
    checks,
  };
}
