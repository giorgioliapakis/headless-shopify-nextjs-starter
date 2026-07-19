import "server-only";
import { resolveStorefrontEnvironment } from "@/lib/shopify/hydrogen/env";

let shopIdPromise: Promise<string> | undefined;

export function resolveShopId(): Promise<string> {
  if (!shopIdPromise) {
    shopIdPromise = (async () => {
      const { storeDomain } = resolveStorefrontEnvironment();
      const response = await fetch(`https://${storeDomain}/.well-known/openid-configuration`, {
        next: { revalidate: 86_400 },
      });
      if (!response.ok) {
        throw new Error(`Failed to load Shopify OIDC discovery: ${response.status}`);
      }

      const discovery: { issuer?: string } = await response.json();
      const shopId = discovery.issuer?.split("/").pop();
      if (!shopId) throw new Error("Could not derive Shopify shop ID from OIDC issuer");
      return shopId;
    })().catch((error) => {
      shopIdPromise = undefined;
      throw error;
    });
  }

  return shopIdPromise;
}
