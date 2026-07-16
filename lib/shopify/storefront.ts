import "server-only";
import {
  getStaticStorefrontTransport,
  StorefrontApiError,
  type StorefrontRequestOptions,
  type StorefrontResponse,
} from "@/lib/shopify/hydrogen/storefront";

export { StorefrontApiError };

export const storefront = {
  request<T>(query: string, options?: StorefrontRequestOptions): Promise<StorefrontResponse<T>> {
    const country = options?.variables?.country;
    const language = options?.variables?.language;
    return getStaticStorefrontTransport({
      country: typeof country === "string" ? country : undefined,
      language: typeof language === "string" ? language : undefined,
    }).request<T>(query, options);
  },
};
