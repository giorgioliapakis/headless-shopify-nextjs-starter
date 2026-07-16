# Storefront capability contract

This document is the honest current-state inventory for the neutral starter. It distinguishes shipped
foundation behavior from optional packs and roadmap work. A downstream merchant migration must generate
its own evidence-backed compatibility report; this file is not proof that an arbitrary Shopify store can
cut over safely.

Status vocabulary:

- **Core** — implemented in the neutral runtime and expected in every generated storefront.
- **Conditional** — implemented behind configuration and included only when discovery finds a consumer.
- **Planned** — part of the approved platform plan but not yet safe to claim as available.
- **Hosted** — intentionally handed off to Shopify rather than rebuilt in Next.js.
- **Unsupported** — an explicit boundary until a separate adapter and proof exist.

## Shopper routes

| Surface           | Route contract             | Status  | Current behavior                                                                                      |
| ----------------- | -------------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| Home              | `/`                        | Core    | Server-rendered section composition using neutral configuration.                                      |
| Product detail    | `/products/[handle]`       | Core    | Metadata, variant URL state, gallery, options, add/buy actions, related-products flag and hard 404.   |
| Collection index  | `/collections`             | Core    | Published collection navigation.                                                                      |
| Collection detail | `/collections/[handle]`    | Core    | Metadata, filters, sorting, pagination and hard 404.                                                  |
| All products      | `/collections/all`         | Core    | Catalogue listing behavior.                                                                           |
| Search            | `/search`                  | Core    | Storefront product search, filters, sorting and pagination.                                           |
| Content page      | `/pages/[handle]`          | Core    | Shopify page content, metadata and hard 404.                                                          |
| Policy            | `/policies/[handle]`       | Core    | Shopify policy content, metadata and hard 404.                                                        |
| Cart              | `/cart`                    | Core    | Hydrogen request-bound cart, warnings, discounts, progressive line forms and hosted checkout handoff. |
| Customer account  | configured external URL    | Hosted  | No local account session by default.                                                                  |
| Checkout          | Shopify `cart.checkoutUrl` | Hosted  | No custom checkout.                                                                                   |
| Blog/article      | `/blogs/[handle]/**`       | Core    | Shopify-backed listing/article routes, pagination, metadata, Article schema, sitemap and hard 404.    |
| Landing pages     | downstream recipes         | Planned | Section registry and route recipe contract not yet complete.                                          |
| Unknown path      | any unmatched URL          | Core    | Safe redirect lookup for paths outside the app manifest, otherwise a static hard 404.                 |

The app also exposes neutral SEO/agent representations: `robots.txt`, a sharded sitemap, `llms.txt`,
dynamic default Open Graph imagery and markdown representations for product, collection and search
surfaces. Draft mode and the Shopify webhook handler are server endpoints, not shopper capabilities.

## Commerce and content operations

| Capability                                                     | Status      | Notes                                                                                         |
| -------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| Products, variants and encoded availability                    | Core        | Hydrogen transport, bundled-schema-validated documents and app-owned normalized domain types. |
| Collections and catalogue pagination                           | Core        | Collection tags and broad catalogue tags support revalidation.                                |
| Menus, pages and policies                                      | Core        | Shopify remains the content system of record for these resources.                             |
| Product/collection search and filters                          | Core        | Search uses Shopify's search field and preserves query state.                                 |
| Product recommendations                                        | Conditional | Disabled by default through `shop.config.ts`.                                                 |
| Bundles/componentized products                                 | Conditional | Domain/cart types support components; UI is disabled by default.                              |
| Complementary products                                         | Conditional | Disabled by default.                                                                          |
| Create/add/update/remove cart lines                            | Core        | Hydrogen server handlers, HTTP-only cart identity and progressively enhanced forms.           |
| Discount codes                                                 | Core        | Hydrogen forms surface Shopify warnings and user errors.                                      |
| Cart note                                                      | Core        | Hydrogen note form works with and without JavaScript and surfaces mutation errors.            |
| Buyer country                                                  | Planned     | Market foundations exist; complete shopper controls and recovery proof remain.                |
| Gift cards and shipping estimate display                       | Planned     | Must move to supported Hydrogen cart fragments and UI before being claimed.                   |
| Shop Pay handoff                                               | Core        | Uses Hydrogen's real Shop Pay custom element; no local checkout.                              |
| Markets selector and contextual pricing                        | Conditional | Single-market default; bounded cookie/cart identity selector activates with verified locales. |
| Selling plans/subscriptions                                    | Planned     | Conditional adapter required.                                                                 |
| Predictive search                                              | Core        | Bounded Shopify predictive results power the navigation search surface.                       |
| First-party consent-aware analytics contract                   | Conditional | Disabled by default; page/cart and confirmed cart-delta events use Hydrogen's consent bus.    |
| Headless customer accounts                                     | Planned     | Optional pack only; hosted accounts remain default.                                           |
| Reviews, loyalty, wishlists, subscriptions and external search | Unsupported | Require provider-specific downstream adapters and parity evidence.                            |

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
response body. Cart mutations preserve Shopify user errors and warnings. Expired-cart recovery and richer
structured observability remain migration targets.

## Customization ownership

The foundation currently owns semantic Tailwind tokens, Base UI behavior, commerce domain types and
generic primitives. A downstream store owns brand values, licensed assets, copy and page composition.
The versioned three-layer contract—tokens, component variants and section recipes—is planned; until it
lands, the presence of configurable primitives must not be presented as a complete no-code section system.

## Definition of full-featured

“Full-featured” means the invariant core is complete and optional packs have explicit dependencies,
disabled-cost tests and proving consumers. It does not mean every Shopify app is bundled, that checkout is
custom, or that unproven discovery output is safe to launch.
