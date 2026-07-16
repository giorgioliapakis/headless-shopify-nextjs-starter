# Migration compatibility and scale envelope

Version: 1 (experimental alpha candidate)

This envelope is pre-registered before selecting a proving merchant. It separates whether the starter
can technically represent a store from whether a headless migration is advisable for that business. A
coding agent must produce one of four outcomes: `compatible`, `compatible-with-downstream-work`,
`blocked`, or `not-advisable`. Unknowns never become implicit support.

## Required starting conditions

- The merchant controls a public HTTPS Shopify storefront and supplies the current published theme as a
  local directory or `.zip`, with rights to use its code/assets/content for the migration.
- Shopify remains the catalogue, cart, customer/order and hosted-checkout system of record. The
  migration replaces the presentation layer, not checkout/payment truth.
- A Headless-channel public Storefront token is available before catalogue-backed runtime verification.
  A private Storefront token is optional and used only for capabilities such as redirect lookup that
  require it. Admin discovery is never a token pasted to an agent; it requires the external read-only
  credential broker.
- The team can preserve or map every approved URL, navigation path, indexable page, redirect, locale and
  revenue-critical interaction, and can run a production-like preview plus rollback rehearsal.
- Theme source, public pages and API content are untrusted data. No source scripts, Liquid, hooks or
  packages execute during discovery.

## Credential-free discovery bounds

| Input                    |                                     Version-1 bound | Behavior outside the bound                             |
| ------------------------ | --------------------------------------------------: | ------------------------------------------------------ |
| Theme directory          |                5,000 regular files and 50 MiB total | Preflight fails closed                                 |
| Theme archive            |              One `.zip`, 50 MiB; hash/metadata only | Isolated archive-safe inspection remains required      |
| Symlinks/special files   |                                                None | Preflight fails closed                                 |
| Theme JSON               |               1 MiB/file and 10,000 traversed nodes | Marked bounded/unknown; never executed                 |
| Public sitemap inventory |          10 same-origin XML sitemaps and 5,000 URLs | Reported as a bounded partial inventory                |
| Public page capture      |                   Default 100; operator maximum 500 | Additional pages need a new reviewed run               |
| Public response          |       1 MiB, 10-second request timeout, 3 redirects | Request fails; partial status is explicit              |
| Redirect/network scope   | HTTPS port 443, same origin, revalidated public DNS | Cross-origin/private/reserved destinations fail closed |
| Robots policy            |           `User-agent: *` disallow prefixes honored | Disallowed URLs are inventoried only as skipped counts |

Public discovery is preliminary. Password-gated stores, JavaScript-only surfaces, locale/consent variants,
app behavior and unpublished Shopify resources require separate evidence; “not observed” is not “absent.”

## Current storefront representation bounds

These are deliberate query/UI contracts, not Shopify platform maxima:

| Surface                                           |                      Current bound | Required outcome when exceeded                                             |
| ------------------------------------------------- | ---------------------------------: | -------------------------------------------------------------------------- |
| Product variants rendered by the full PDP query   |                        250/product | Revenue-critical blocker until cursor/selection proof supports the product |
| Product media in the generic gallery              |                         10/product | Downstream gallery/query adaptation and performance proof                  |
| Selling-plan allocations for the selected variant |                                 50 | Downstream selection strategy and provider parity proof                    |
| Product collection memberships used for tags      |                         10/product | Review invalidation/merchandising needs                                    |
| Bundle groups/components                          |     10 groups, 30 components/group | Downstream bundle UI/cart proof                                            |
| Cart lines returned by the generic cart fragment  |                                250 | Block or implement bounded pagination/recovery                             |
| Navigation nesting represented by the menu query  |                           3 levels | Downstream navigation query/component and keyboard/mobile proof            |
| Catalogue/search page request                     | 50 products with cursor pagination | Supported while every route preserves pagination state                     |
| Collection index/listing query                    |                    250 collections | Downstream pagination if the published set exceeds it                      |
| Recipe sections                                   |                            40/page | Split/restructure and remeasure; no silent truncation                      |
| Product-carousel items                            |                         12/section | Compose more sections or implement a measured downstream surface           |

The neutral build supports Shopify products/collections/search/menus/pages/policies/blogs, generic landing
recipes, selling plans, cart mutations/discount/note, hosted checkout/accounts, optional Markets,
redirects, webhooks, recommendations, complementary products, bundles and consent-aware analytics exactly
as described in the capability contract. Provider-specific reviews, loyalty, wishlists, subscription
portals, third-party search/forms and app blocks remain downstream adapters.

## Technical compatibility is not migration advice

Return `not-advisable` even when code is possible if the expected performance/SEO/operational benefit does
not justify the new deployment, cache, monitoring, tracking and rollback surface; if the team cannot own
ongoing Next/Hydrogen/Shopify upgrades; or if current revenue-critical app behavior cannot be observed and
proven. Also stop when checkout customization expectations exceed the merchant's Shopify plan, headless
accounts/B2B behavior is essential but unimplemented, licensed assets cannot be used, or no safe rollback
operator/window exists.

Return `blocked` for missing theme rights/source, unavailable Storefront access, an unreachable or
robots/password-limited source that prevents required evidence, unsupported >250-variant products,
unmapped revenue URLs/interactions, unverified market pricing/checkout, or unsupported app blocks on the
buy path. A blocker may be resolved; it is not permission to guess.

## Evidence required to leave the envelope

An exception needs the exact merchant surface, source and proposed behavior; why the bound is insufficient;
the smallest downstream implementation; security/privacy/data ownership; route/cache/bundle impact;
desktop/mobile/keyboard/no-JavaScript evidence; real merchant performance; rollback; owner; and expiry.
Repeated, independently proven patterns may later become conditional packs. One merchant implementation
does not silently expand the foundation's compatibility claim.
