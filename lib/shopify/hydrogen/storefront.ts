import "server-only";
import {
  createStorefrontClient,
  StorefrontApiError as HydrogenStorefrontApiError,
  StorefrontTimeoutError,
  type I18nConfig,
  type StorefrontClient,
} from "@shopify/hydrogen";

import { defaultLocale, getCountryCode, getLanguageCode } from "@/lib/i18n";
import type { GraphQLFormattedError } from "@/lib/shopify/types/graphql";

import {
  resolveStorefrontEnvironment,
  type StorefrontEnvironment,
  warnAboutLegacyStorefrontEnvironment,
} from "./env";
import {
  createIncomingShopifyRequestContext,
  createStaticShopifyRequestContext,
  resolveTrustedBuyerIp,
} from "./request-context";

const DEFAULT_TIMEOUT_MS = 8_000;

export interface StorefrontResponse<T> {
  data?: T | null;
  errors?: GraphQLFormattedError[];
}

export interface StorefrontRequestOptions {
  signal?: AbortSignal;
  variables?: Record<string, unknown>;
}

export interface StorefrontTransport {
  client: StorefrontClient;
  request<T>(query: string, options?: StorefrontRequestOptions): Promise<StorefrontResponse<T>>;
}

export class StorefrontApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId: string | null,
  ) {
    super(message);
    this.name = "StorefrontApiError";
  }
}

function operationName(query: string): string {
  return query.match(/\b(?:query|mutation)\s+(\w+)/)?.[1] ?? "anonymous";
}

function stableTransportError(error: unknown, operation: string): StorefrontApiError {
  if (error instanceof StorefrontApiError) return error;
  if (error instanceof StorefrontTimeoutError) {
    return new StorefrontApiError(
      `Shopify ${operation} timed out`,
      error.status ?? 0,
      error.requestId ?? null,
    );
  }
  if (error instanceof HydrogenStorefrontApiError) {
    const status = error.status ?? 0;
    const message =
      status >= 400
        ? `Shopify ${operation} failed with HTTP ${status}`
        : /json/i.test(error.message)
          ? `Shopify ${operation} returned an invalid JSON response`
          : `Shopify ${operation} request failed`;
    return new StorefrontApiError(message, status, error.requestId ?? null);
  }
  return new StorefrontApiError(`Shopify ${operation} request failed`, 0, null);
}

function createTransport(
  client: StorefrontClient,
  environment: StorefrontEnvironment,
  i18n: Pick<I18nConfig, "country" | "language">,
): StorefrontTransport {
  const graphql = client.graphql as unknown as (
    query: string,
    options: { signal?: AbortSignal; variables: Record<string, unknown> },
  ) => Promise<{
    data: unknown;
    errors?: ReadonlyArray<{
      extensions?: Record<string, unknown>;
      locations?: ReadonlyArray<{ column: number; line: number }>;
      message: string;
      path?: ReadonlyArray<number | string>;
    }>;
    headers: Headers;
  }>;

  return {
    client,
    async request<T>(
      query: string,
      options?: StorefrontRequestOptions,
    ): Promise<StorefrontResponse<T>> {
      const operation = operationName(query);
      const start = process.env.DEBUG_SHOPIFY === "true" ? performance.now() : 0;
      try {
        const result = await graphql(query, {
          signal: options?.signal,
          variables: {
            country: i18n.country,
            language: i18n.language,
            ...options?.variables,
          },
        });

        const observedVersion = result.headers.get("x-shopify-api-version");
        if (observedVersion && observedVersion !== environment.apiVersion) {
          throw new StorefrontApiError(
            `Shopify served API ${observedVersion}; configured ${environment.apiVersion}`,
            200,
            result.headers.get("x-request-id"),
          );
        }

        return {
          data: result.data as T | null,
          errors: result.errors?.map((error) => ({
            extensions: error.extensions,
            locations: error.locations?.map((location) => ({ ...location })),
            message: error.message,
            path: error.path,
          })),
        };
      } catch (error) {
        throw stableTransportError(error, operation);
      } finally {
        if (process.env.DEBUG_SHOPIFY === "true") {
          console.log(`[shopify] ${operation} ${(performance.now() - start).toFixed(0)}ms`);
        }
      }
    },
  };
}

export function createStaticStorefrontTransport(options?: {
  environment?: StorefrontEnvironment;
  fetch?: typeof globalThis.fetch;
  i18n?: Partial<Pick<I18nConfig, "country" | "language">>;
  locale?: string;
}): StorefrontTransport {
  const environment = options?.environment ?? resolveStorefrontEnvironment();
  const locale = options?.locale ?? defaultLocale;
  const i18n = {
    country: options?.i18n?.country ?? (getCountryCode(locale) as I18nConfig["country"]),
    language: options?.i18n?.language ?? (getLanguageCode(locale) as I18nConfig["language"]),
  };
  const requestContext = createStaticShopifyRequestContext(locale, i18n);
  const common = {
    apiVersion: environment.apiVersion,
    defaultTimeoutInMs: DEFAULT_TIMEOUT_MS,
    fetch: options?.fetch,
    storeDomain: environment.storeDomain,
  };
  const client = environment.privateStorefrontToken
    ? createStorefrontClient({
        type: "private_no_buyer_context",
        requestContext,
        config: {
          ...common,
          privateStorefrontToken: environment.privateStorefrontToken,
        },
      })
    : createStorefrontClient({
        type: "public",
        requestContext,
        config: {
          ...common,
          publicStorefrontToken: environment.publicStorefrontToken,
        },
      });

  return createTransport(client, environment, i18n);
}

export function createRequestStorefrontClient(
  request: Request,
  options?: {
    environment?: StorefrontEnvironment;
    fetch?: typeof globalThis.fetch;
    isVercel?: boolean;
    locale?: string;
  },
): StorefrontClient {
  const environment = options?.environment ?? resolveStorefrontEnvironment();
  const requestContext = createIncomingShopifyRequestContext(
    request,
    options?.locale ?? defaultLocale,
  );
  const common = {
    apiVersion: environment.apiVersion,
    defaultTimeoutInMs: DEFAULT_TIMEOUT_MS,
    fetch: options?.fetch,
    storeDomain: environment.storeDomain,
  };
  const buyerIp = resolveTrustedBuyerIp(request.headers, {
    isVercel: options?.isVercel ?? process.env.VERCEL === "1",
  });

  if (environment.privateStorefrontToken && buyerIp) {
    return createStorefrontClient({
      type: "private",
      requestContext,
      config: { ...common, buyerIp, privateStorefrontToken: environment.privateStorefrontToken },
    });
  }

  return createStorefrontClient({
    type: "public",
    requestContext,
    config: { ...common, publicStorefrontToken: environment.publicStorefrontToken },
  });
}

const staticTransports = new Map<string, StorefrontTransport>();

export function getStaticStorefrontTransport(i18n?: {
  country?: string;
  language?: string;
}): StorefrontTransport {
  const country = (i18n?.country ?? getCountryCode(defaultLocale)) as I18nConfig["country"];
  const language = (i18n?.language ?? getLanguageCode(defaultLocale)) as I18nConfig["language"];
  const key = `${country}:${language}`;
  let transport = staticTransports.get(key);
  if (!transport) {
    const environment = resolveStorefrontEnvironment();
    warnAboutLegacyStorefrontEnvironment(environment);
    transport = createStaticStorefrontTransport({ environment, i18n: { country, language } });
    staticTransports.set(key, transport);
  }
  return transport;
}
