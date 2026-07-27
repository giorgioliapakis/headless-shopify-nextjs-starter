# Hydrogen compatibility

## Supported platform contract

This is a Next.js 16 application for Vercel that consumes Shopify's framework-agnostic Hydrogen SDK as a
commerce library. It is not the React Router Hydrogen framework and it does not require Oxygen. The
application owns routes, rendering, cache policy and deployment; Shopify owns catalogue/cart truth and
hosted checkout.

| Surface          | Foundation contract                                                                  |
| ---------------- | ------------------------------------------------------------------------------------ |
| Hydrogen package | Exact `0.0.0-preview-8a708a8-20260708155454`; moving preview tags forbidden          |
| Storefront API   | `2026-07`, enforced at runtime and GraphQL validation                                |
| Next.js          | `16.2.10`, App Router, React Server Components and Cache Components                  |
| Runtime          | Node 24, pnpm 11.5.0, Vercel first                                                   |
| Transport        | Request-scoped Hydrogen Storefront client behind app-owned operations                |
| Cart             | Hydrogen cart handlers/forms/provider with one hardened standard cart cookie         |
| Checkout         | Shopify-hosted checkout; no custom payment flow                                      |
| Analytics        | Consent-aware Shopify events through checkout handoff; purchase remains Shopify-side |
| Markets          | Single-market fast path; bounded opt-in selector synchronizes cart buyer identity    |

The exact preview is a dated exception governed by [ADR 0002](../adr/0002-hydrogen-preview-adoption.md).
It expires on 2026-10-31 unless reviewed. Stable Hydrogen is preferred once it satisfies the same
transport, cart, routing, caching, analytics, bundle and browser contracts.

## Compatibility envelope

Core support includes products, variants, collections, search, menus, pages, policies, Shopify blogs,
cart, hosted checkout, redirects, selling plans, semantic themes and registered page sections. Webhooks,
Markets, analytics, bundles, complementary products and recommendations are conditional. Hosted customer
accounts remain a handoff. Arbitrary app blocks, provider portals and renderable metaobject landing pages
are not generic zero-configuration promises; see the [capability contract](storefront-capabilities.md).

Hydrogen package compatibility does not prove that your store is compatible. Verify
its published catalogue shape, markets, apps, URLs, content, media, accessibility, performance and
checkout handoff against a production-like preview.

## Intentional choices

- Storefront GraphQL documents remain app-owned and validated against Hydrogen's bundled schema.
- Next controls public caching; personalized cart/account data is never placed in a public/shared cache.
- Product selection uses URL-addressable server rendering and progressive Hydrogen cart forms rather
  than requiring a client-side product provider for the entire PDP.
- The public migration crawler accepts no credentials. Protected Admin discovery belongs to the external
  allowlisted credential broker described in the trust-boundary document.
- WebMCP/browser-agent storefront exposure is disabled until it has an independent privacy, abuse,
  consent and performance review.
