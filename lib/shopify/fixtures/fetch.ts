import "server-only";
import type { StorefrontEnvironment } from "@/lib/shopify/hydrogen/env";

import { DEMO_FIXTURE_DOMAIN, DEMO_FIXTURE_TOKEN, demoFixtureDataset } from "./data/demo";
import {
  NEUTRAL_FIXTURE_DOMAIN,
  NEUTRAL_FIXTURE_TOKEN,
  neutralFixtureDataset,
} from "./data/neutral";
import { resolveFixtureOperation } from "./resolver";
import type { FixtureDataset } from "./types";

export type StorefrontFixtureMode = "demo" | "neutral";

interface FixtureModeDefinition {
  dataset: FixtureDataset;
  domain: string;
  token: string;
}

/**
 * Reserved, non-merchant identities. A mode only activates when the environment
 * matches its entry exactly, so the fixture can never mask a real store.
 */
const FIXTURE_MODES: Record<StorefrontFixtureMode, FixtureModeDefinition> = {
  demo: {
    dataset: demoFixtureDataset,
    domain: DEMO_FIXTURE_DOMAIN,
    token: DEMO_FIXTURE_TOKEN,
  },
  neutral: {
    dataset: neutralFixtureDataset,
    domain: NEUTRAL_FIXTURE_DOMAIN,
    token: NEUTRAL_FIXTURE_TOKEN,
  },
};

const FIXTURE_MODE_NAMES = Object.keys(FIXTURE_MODES) as StorefrontFixtureMode[];

function operationName(query: string): string {
  return query.match(/\b(?:query|mutation)\s+(\w+)/)?.[1] ?? "anonymous";
}

/** Frozen `neutral` payloads. Kept as the default export name for existing contract tests. */
export function neutralStorefrontFixtureData(
  operation: string,
  variables: Record<string, unknown> = {},
): Record<string, unknown> | null {
  return resolveFixtureOperation(neutralFixtureDataset, operation, variables);
}

export function demoStorefrontFixtureData(
  operation: string,
  variables: Record<string, unknown> = {},
): Record<string, unknown> | null {
  return resolveFixtureOperation(demoFixtureDataset, operation, variables);
}

export function createStorefrontFixtureFetch(mode: StorefrontFixtureMode): typeof globalThis.fetch {
  const { dataset } = FIXTURE_MODES[mode];
  return async (_input, init) => {
    let query = "";
    let variables: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(String(init?.body)) as { query?: unknown; variables?: unknown };
      if (typeof parsed.query === "string") query = parsed.query;
      if (parsed.variables && typeof parsed.variables === "object") {
        variables = parsed.variables as Record<string, unknown>;
      }
    } catch {
      // The explicit error response below makes malformed fixture requests visible.
    }

    const operation = operationName(query);
    const data = resolveFixtureOperation(dataset, operation, variables);
    return Response.json(
      data
        ? { data }
        : { errors: [{ message: `${mode} fixture does not implement ${operation}` }] },
      {
        status: data ? 200 : 501,
        headers: {
          "cache-control": "no-store",
          "x-shopify-api-version": "2026-07",
          "x-request-id": `fixture-${operation}`,
        },
      },
    );
  };
}

export const neutralStorefrontFixtureFetch = createStorefrontFixtureFetch("neutral");
export const demoStorefrontFixtureFetch = createStorefrontFixtureFetch("demo");

const FIXTURE_FETCHERS: Record<StorefrontFixtureMode, typeof globalThis.fetch> = {
  demo: demoStorefrontFixtureFetch,
  neutral: neutralStorefrontFixtureFetch,
};

/**
 * Fail-closed gate. The fixture never turns itself on, and it refuses to run
 * against anything that looks like a real merchant: the domain and public token
 * must be the mode's reserved constants and no private token may be present.
 */
export function resolveStorefrontFixtureFetch(
  environment: StorefrontEnvironment,
  source: Readonly<Record<string, string | undefined>> = process.env,
): typeof globalThis.fetch | undefined {
  const mode = source.SHOPIFY_STOREFRONT_FIXTURE;
  if (!mode) return undefined;
  if (!FIXTURE_MODE_NAMES.includes(mode as StorefrontFixtureMode)) {
    throw new Error(
      `SHOPIFY_STOREFRONT_FIXTURE must be one of ${FIXTURE_MODE_NAMES.map((name) => `'${name}'`).join(", ")} when set`,
    );
  }

  const definition = FIXTURE_MODES[mode as StorefrontFixtureMode];
  if (
    environment.storeDomain !== definition.domain ||
    environment.publicStorefrontToken !== definition.token ||
    environment.privateStorefrontToken
  ) {
    throw new Error(
      `${mode} fixture mode requires the documented fixture domain/public token and no private token`,
    );
  }
  return FIXTURE_FETCHERS[mode as StorefrontFixtureMode];
}

/** @deprecated Use `resolveStorefrontFixtureFetch`; kept for import stability. */
export const resolveNeutralStorefrontFixtureFetch = resolveStorefrontFixtureFetch;
