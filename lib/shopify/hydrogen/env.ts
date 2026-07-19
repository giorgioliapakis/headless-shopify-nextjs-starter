import "server-only";

const DEFAULT_API_VERSION = "2026-07";

export interface StorefrontEnvironment {
  apiVersion: string;
  checkoutDomain?: string;
  privateStorefrontToken?: string;
  publicStorefrontToken: string;
  storefrontId: string;
  storeDomain: string;
  usedLegacyAliases: string[];
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function read(source: EnvironmentSource, name: string): string | undefined {
  const value = source[name]?.trim();
  return value || undefined;
}

function normalizeDomain(
  value: string,
  name: string,
  options: { requirePermanentShopifyDomain?: boolean } = {},
): string {
  const candidate = value.includes("://") ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error(`${name} must be a valid Shopify store domain`);
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `${name} must be an HTTPS hostname without credentials, path, query or fragment`,
    );
  }

  const hostname = url.hostname.toLowerCase();
  if (
    options.requirePermanentShopifyDomain &&
    (!hostname.endsWith(".myshopify.com") || hostname === ".myshopify.com")
  ) {
    throw new Error(`${name} must use the permanent *.myshopify.com store domain`);
  }
  return hostname;
}

export function resolveStorefrontEnvironment(
  source: EnvironmentSource = process.env,
): StorefrontEnvironment {
  const canonicalDomain = read(source, "PUBLIC_STORE_DOMAIN");
  const legacyDomain = read(source, "SHOPIFY_STORE_DOMAIN");
  const canonicalPublicToken = read(source, "PUBLIC_STOREFRONT_API_TOKEN");
  const legacyPublicToken = read(source, "SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  const usedLegacyAliases: string[] = [];

  const rawDomain = canonicalDomain ?? legacyDomain;
  if (!rawDomain) {
    throw new Error("Missing PUBLIC_STORE_DOMAIN. See .env.example.");
  }
  if (!canonicalDomain && legacyDomain) usedLegacyAliases.push("SHOPIFY_STORE_DOMAIN");

  const publicStorefrontToken = canonicalPublicToken ?? legacyPublicToken;
  if (!publicStorefrontToken) {
    throw new Error("Missing PUBLIC_STOREFRONT_API_TOKEN. See .env.example.");
  }
  if (!canonicalPublicToken && legacyPublicToken) {
    usedLegacyAliases.push("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  }

  const apiVersion = read(source, "SHOPIFY_API_VERSION") ?? DEFAULT_API_VERSION;
  if (!/^20\d{2}-(01|04|07|10)$/.test(apiVersion)) {
    throw new Error("SHOPIFY_API_VERSION must be a dated quarterly Shopify API version");
  }

  const checkoutDomain = read(source, "PUBLIC_CHECKOUT_DOMAIN");

  return {
    apiVersion,
    checkoutDomain: checkoutDomain
      ? normalizeDomain(checkoutDomain, "PUBLIC_CHECKOUT_DOMAIN")
      : undefined,
    privateStorefrontToken: read(source, "PRIVATE_STOREFRONT_API_TOKEN"),
    publicStorefrontToken,
    storefrontId: read(source, "PUBLIC_STOREFRONT_ID") ?? "0",
    storeDomain: normalizeDomain(rawDomain, "PUBLIC_STORE_DOMAIN", {
      requirePermanentShopifyDomain: true,
    }),
    usedLegacyAliases,
  };
}

let warnedAboutLegacyAliases = false;

export function warnAboutLegacyStorefrontEnvironment(environment: StorefrontEnvironment): void {
  if (
    process.env.NODE_ENV === "test" ||
    warnedAboutLegacyAliases ||
    environment.usedLegacyAliases.length === 0
  )
    return;
  warnedAboutLegacyAliases = true;
  console.warn(
    `[shopify] Deprecated environment names in use: ${environment.usedLegacyAliases.join(", ")}. ` +
      "Use the canonical PUBLIC_* Storefront names from .env.example.",
  );
}
