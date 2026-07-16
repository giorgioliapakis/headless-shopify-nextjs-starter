import "server-only";
import { gql } from "@shopify/hydrogen";

import { getCountryCode, getLanguageCode } from "@/lib/i18n";
import { assertStorefrontOk, ShopifyUserError, type UserError } from "@/lib/shopify/errors";

import { getStaticStorefrontTransport } from "./storefront";

const CART_GID_PREFIX = "gid://shopify/Cart/";

const CART_BUYER_IDENTITY_UPDATE_MUTATION = gql(`
  mutation CartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`);

export function normalizeHydrogenCartId(token: string): string | null {
  const decoded = decodeURIComponent(token).trim();
  if (!decoded || decoded.length > 2048 || /[\r\n;]/.test(decoded)) return null;
  return decoded.startsWith(CART_GID_PREFIX) ? decoded : `${CART_GID_PREFIX}${decoded}`;
}

/** Keep an existing Hydrogen cart in the market selected by the buyer. */
export async function syncHydrogenCartMarket(cartToken: string, locale: string): Promise<void> {
  const cartId = normalizeHydrogenCartId(cartToken);
  if (!cartId) throw new Error("Invalid Hydrogen cart cookie");

  const country = getCountryCode(locale);
  const language = getLanguageCode(locale);
  const response = await getStaticStorefrontTransport({ country, language }).request<{
    cartBuyerIdentityUpdate: {
      cart: { id: string } | null;
      userErrors: UserError[];
    };
  }>(CART_BUYER_IDENTITY_UPDATE_MUTATION, {
    variables: {
      buyerIdentity: { countryCode: country },
      cartId,
      country,
      language,
    },
  });
  assertStorefrontOk(response, "CartBuyerIdentityUpdate");

  const payload = response.data.cartBuyerIdentityUpdate;
  if (payload.userErrors.length > 0) {
    throw new ShopifyUserError(payload.userErrors, "CartBuyerIdentityUpdate");
  }
  if (!payload.cart) throw new Error("Shopify CartBuyerIdentityUpdate returned no cart");
}
