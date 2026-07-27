# Storefront capability contract

A current-state inventory of what this starter actually does. If something is not listed as Core here,
do not assume it works.

The same inventory is machine-readable in `lib/commerce/capabilities.ts` and mirrored for coding agents
in `.agents/capability-map.json`. Keep all three in sync — an entry here that the code does not implement
is a bug, not a roadmap note.

Status vocabulary:

- **Core** — implemented and available in every storefront built from this starter.
- **Conditional** — implemented, but off until you configure it.
- **Planned** — an agreed boundary with no safe implementation yet.
- **Hosted** — deliberately handed off to Shopify rather than rebuilt in Next.js.
- **Unsupported** — needs a provider-specific adapter you write yourself.

A capability is not "supported" because a dependency is installed. To be Core it needs an explicit
capability ID and status, its configuration and environment names, at least one route or component
consumer, a cache/data classification, tests for both enabled and disabled behaviour, and documented
unsupported cases.

## Shopper routes

| Surface           | Route contract             | Status | Current behavior                                                                                                                                               |
| ----------------- | -------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home              | `/`                        | Core   | Server-rendered section composition using neutral configuration.                                                                                               |
| Product detail    | `/products/[handle]`       | Core   | Metadata, variant URL state, gallery, options, add/buy actions, related-products flag and hard 404.                                                            |
| Collection index  | `/collections`             | Core   | Published collection navigation.                                                                                                                               |
| Collection detail | `/collections/[handle]`    | Core   | Metadata, filters, sorting, pagination and hard 404.                                                                                                           |
| All products      | `/collections/all`         | Core   | Catalogue listing behavior.                                                                                                                                    |
| Search            | `/search`                  | Core   | Storefront product search, filters, sorting and pagination.                                                                                                    |
| Content page      | `/pages/[handle]`          | Core   | Shopify page content, metadata and hard 404.                                                                                                                   |
| Policy            | `/policies/[handle]`       | Core   | Shopify policy content, metadata and hard 404.                                                                                                                 |
| Cart              | `/cart`                    | Core   | Hydrogen request-bound cart, warnings, discounts, progressive line forms and hosted checkout handoff. Streamed, so it needs JavaScript to display — see below. |
| Customer account  | configured external URL    | Hosted | No local account session by default.                                                                                                                           |
| Checkout          | Shopify `cart.checkoutUrl` | Hosted | No custom checkout.                                                                                                                                            |
| Blog/article      | `/blogs/[handle]/**`       | Core   | Shopify-backed listing/article routes, pagination, metadata, Article schema, sitemap and hard 404.                                                             |
| Landing pages     | `/landing/[handle]`        | Core   | Versioned metadata/indexing and section recipes; empty until merchant config supplies approved pages.                                                          |
| Unknown path      | any unmatched URL          | Core   | Safe redirect lookup for paths outside the app manifest, otherwise a static hard 404.                                                                          |

The app also exposes neutral SEO/agent representations: `robots.txt`, a sharded sitemap, `llms.txt`,
dynamic default Open Graph imagery and markdown representations for product, collection and search
surfaces. Draft mode and the Shopify webhook handler are server endpoints, not shopper capabilities.

## Commerce and content operations

| Capability                                      | Status      | Notes                                                                                                                |
| ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Products, variants and encoded availability     | Core        | Hydrogen transport, bundled-schema-validated documents and app-owned normalized domain types.                        |
| Collections and catalogue pagination            | Core        | Collection tags and broad catalogue tags support revalidation.                                                       |
| Menus, pages and policies                       | Core        | Shopify remains the content system of record for these resources.                                                    |
| Product/collection search and filters           | Core        | Search uses Shopify's search field and preserves query state.                                                        |
| Product recommendations                         | Conditional | Disabled by default through `shop.config.ts`.                                                                        |
| Bundles/componentized products                  | Conditional | Domain/cart types support components; UI is disabled by default.                                                     |
| Complementary products                          | Conditional | Disabled by default.                                                                                                 |
| Create/add/update/remove cart lines             | Core        | Hydrogen server handlers, HTTP-only cart identity and progressively enhanced forms.                                  |
| Discount codes                                  | Core        | Hydrogen forms surface Shopify warnings and user errors.                                                             |
| Cart note                                       | Core        | Hydrogen note form works with and without JavaScript and surfaces mutation errors.                                   |
| Buyer country                                   | Conditional | Verified market selection updates both locale and Hydrogen cart buyer identity.                                      |
| Gift cards and shipping estimate display        | Planned     | Must move to supported Hydrogen cart fragments and UI before being claimed.                                          |
| Shop Pay handoff                                | Core        | Uses Hydrogen's real Shop Pay custom element; no local checkout.                                                     |
| Markets selector and contextual pricing         | Conditional | Single-market default; bounded cookie/cart identity selector activates with verified locales.                        |
| Selling plans/subscriptions                     | Core        | Native Shopify allocations, required-plan handling, pricing and cart lines; app portals vary.                        |
| Predictive search                               | Core        | Bounded Shopify predictive results power the navigation search surface.                                              |
| First-party consent-aware analytics contract    | Conditional | Disabled by default; page/product/collection/search/cart and confirmed cart-delta events use Hydrogen's consent bus. |
| Headless customer accounts                      | Planned     | Optional pack only; hosted accounts remain default.                                                                  |
| Reviews, loyalty, wishlists and external search | Unsupported | Require a provider-specific adapter you write yourself.                                                              |

## JavaScript requirements

Catalogue and content routes render fully server-side and are readable with JavaScript disabled.
Adding to cart also works without it: the product form is a native `POST`.

`/cart` is the exception. It is per-shopper, so `cacheComponents` requires the cart read to sit
inside a Suspense boundary, and React swaps a Suspense fallback in with an inline script. With
scripts disabled that fallback is the final render, so the page shows its heading, an explanation
and a link back to the catalogue rather than the line items. Everything else degrades gracefully:
collection pagination falls back to plain links, and the header cart icon is a real anchor to
`/cart`.

## Cache ownership and invalidation

Catalogue/content operations use Next Cache Components. Current tag families are `products`,
`product-{handle|id}`, `recommendations-{handle}`, `collections`, `collections-index`,
`collection-{handle}`, `menus`, `pages`, `page-{handle}`, `policies`, `blogs`, `blog-{handle}`,
`article-{blog}-{article}`, sitemap resource tags and CMS tags.
Cart identity comes from an HTTP-only cookie and never belongs in shared catalogue caches.

Hydrogen's optional response cache is not an additional cache layer for these paths. Webhook invalidation
covers allowlisted product, collection and optional CMS metaobject topics only after raw-body HMAC, shop,
API-version, webhook-ID and body-size validation. Durable cross-instance delivery deduplication remains a
deployment capability rather than an in-memory runtime claim.

Hydrogen checkout and validated cart-permalink routing is enabled. Its general Storefront API, AJAX cart,
GraphiQL, MCP and agent proxy surfaces are hard 404 by default. When Shopify analytics is explicitly
enabled, the nominal `/api/unstable/graphql.json` path accepts only Hydrogen's fixed consent-cookie query,
with same-origin, method, media-type and body-size enforcement; it is not a general GraphQL proxy.
Ordinary catalogue routes create no Hydrogen request client or Storefront call. See
[ADR 0003](../adr/0003-cache-and-request-lifecycle.md).

## Configuration and credentials

Canonical runtime names are `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN` and
`SHOPIFY_API_VERSION`. The old `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_ACCESS_TOKEN` names remain
bounded, warning aliases. The public token is read-only storefront access; it is never promoted to a
private buyer-context token. A real `PRIVATE_STOREFRONT_API_TOKEN` from the Headless channel is required
before a private client is created.

Optional configuration includes the public site name/base URL, hosted account URL, webhook secret, draft
mode secret, debug logging and per-feature flags in `shop.config.ts`. Shopify analytics remains off until
`analytics.shopify.enabled` is deliberately set; its default-banner mode does not override Hydrogen's
Customer Privacy consent decision. Migration-only Admin access belongs
in the external credential broker and must not be placed in the storefront environment or repository.

## Errors and degraded behavior

The Hydrogen adapter returns stable data/GraphQL errors, rejects HTTP, network, timeout, malformed JSON
and observed API-version drift with a redacted `StorefrontApiError`, and never reflects an upstream
response body. Cart mutations preserve Shopify user errors and warnings. Expired add-to-cart identities
recover by replaying only the idempotent add intent against a newly created Hydrogen cart;
update/remove/discount/note intents are never replayed onto a different cart. Richer structured
observability remains a migration target.

## Customization ownership

The starter owns semantic tokens, Base UI behaviour, commerce domain types and generic primitives. You
own your brand values, licensed assets, copy and page composition. Versioned theme and section schemas,
contrast validation, the section registry and the default recipes are implemented. This is a source
contract you and your agent edit — not a hidden no-code editor. See
[`docs/customization/`](../customization/design-tokens.md).

## Conditional packs

`analytics.shopify` turns on with `NEXT_PUBLIC_SHOPIFY_ANALYTICS_ENABLED=true`. It uses Hydrogen's
default privacy banner, a bounded consent bootstrap and confirmed cart deltas. The purchase event still
belongs to Shopify checkout.

`markets` turns on when you publish more than one verified locale in `lib/i18n/index.ts`. Bundles,
complementary products and recommendations are switched in `shop.config.ts`. Hosted accounts need
`NEXT_PUBLIC_SHOPIFY_ACCOUNT_URL`.

Native Shopify selling plans are Core, not a pack: the product page shows approved plans, passes
`sellingPlanId` through Hydrogen, and preserves the plan label in the cart. Provider-specific
subscription portals and cancellation flows are adapters you write.

## Third-party apps

Reviews, loyalty, wishlists, forms and newsletters, subscription portals and third-party search each
need a named adapter that you write. Before building one, establish which provider you are on, the
behaviour you need, what browser scripts it injects, who owns the data, its consent category, its
webhook and API requirements, and how it should fail.

The starter deliberately does not ship provider-neutral UI for these, because a generic stub silently
drops those contracts and looks like it works.

A disabled capability must not read credentials, create browser globals, make requests, or emit
analytics. When you add one, update the TypeScript registry, the JSON mirror, this document and the
tests together.

## What "full-featured" means here

The core is complete and the optional packs have explicit dependencies, tests for their disabled cost,
and a real consumer. It does not mean every Shopify app is bundled, or that checkout is custom.
