export const NEUTRAL_FIXTURE_DOMAIN = "neutral-fixture.myshopify.com";
export const NEUTRAL_FIXTURE_TOKEN = "fixture-public-token";

export type StorefrontMode = "neutral-demo" | "shopify";

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function read(source: EnvironmentSource, name: string): string | undefined {
  const value = source[name]?.trim();
  return value || undefined;
}

export function resolveStorefrontMode(source: EnvironmentSource = process.env): StorefrontMode {
  const fixtureMode = read(source, "SHOPIFY_STOREFRONT_FIXTURE");
  if (fixtureMode && fixtureMode !== "neutral") {
    throw new Error("SHOPIFY_STOREFRONT_FIXTURE must be 'neutral' when set");
  }

  const storeDomain = read(source, "PUBLIC_STORE_DOMAIN") ?? read(source, "SHOPIFY_STORE_DOMAIN");
  const publicToken =
    read(source, "PUBLIC_STOREFRONT_API_TOKEN") ?? read(source, "SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  const hasDomain = Boolean(storeDomain);
  const hasPublicToken = Boolean(publicToken);
  const hasDependentConfiguration = Boolean(
    read(source, "PRIVATE_STOREFRONT_API_TOKEN") ||
    read(source, "PUBLIC_STOREFRONT_ID") ||
    read(source, "PUBLIC_CHECKOUT_DOMAIN"),
  );

  if (!hasDomain && !hasPublicToken && !hasDependentConfiguration) return "neutral-demo";

  if (!hasDomain || !hasPublicToken) {
    const missing = [
      !hasDomain ? "PUBLIC_STORE_DOMAIN" : null,
      !hasPublicToken ? "PUBLIC_STOREFRONT_API_TOKEN" : null,
    ].filter(Boolean);
    throw new Error(
      `Missing required Shopify environment variables: ${missing.join(", ")}. See .env.example.`,
    );
  }

  // A complete pair is configured storefront mode even when CI explicitly routes it to the
  // deterministic transport. Only a genuinely empty environment gets the demo presentation.
  return "shopify";
}
