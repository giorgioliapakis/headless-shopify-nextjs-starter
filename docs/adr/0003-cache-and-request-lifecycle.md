---
status: accepted
date: 2026-07-16
owners: storefront-foundation-maintainers
---

# Next owns catalogue caching; request state stays isolated

## Context

The starter combines Next.js Cache Components with Hydrogen request context. Both can cache or attach
request lifecycle headers, so using both indiscriminately can double-cache catalogue data or make an
anonymous page personalized. Hydrogen's preview route helper also currently bundles checkout, Storefront
API, AJAX cart, MCP and agent proxies into one convenience function.

## Decision

- Next Cache Components is the only cache owner for catalogue and Shopify content operations.
- Hydrogen receives no cache instance on those operations. Webhooks invalidate the same bounded Next tag
  families used by operation code.
- Cart, account, checkout and any response affected by buyer state are `private, no-store`; CDN and
  surrogate cache directives are removed.
- Ordinary routes use Proxy only to forward the original URL to the real 404 boundary. They do not create
  a Hydrogen client, attach Shopify session cookies or make Shopify requests.
- `handleShopifyRoutes` is called only for `/checkout` and validated cart permalinks. Storefront API,
  AJAX cart, GraphiQL, MCP and agent proxies are hard 404 until an independently bounded adapter is
  designed and verified.
- Next 16 Cache Components cannot read request headers in `not-found.tsx` without streaming the 404 (and
  potentially returning status 200). The app therefore keeps 404 rendering static and classifies its own
  route manifest in Proxy. Only paths outside that manifest are redirect candidates; known catalogue
  routes never make the extra call. This is a documented framework-specific adaptation to Hydrogen's
  generic post-404 recipe, and the route-manifest contract must prevent newly added routes going stale.
- Redirect lookup needs an actual private token and trusted Vercel buyer IP. Without those, the candidate
  proceeds to the normal 404. `/admin` is a deterministic permanent handoff and needs no API request.
- Redirect targets must be same-origin except the explicit `/admin` handoff. Self loops and unsafe
  schemes fail closed. Next emits its permanent redirect status while preserving permanent semantics.
- The default single market reads no request cookie. Additional published markets are opt-in; their
  bounded locale cookie changes market context and cart buyer identity.

## Cache matrix

| Data class             | Client/context                    | Cache owner                 | Response policy         | Invalidation             |
| ---------------------- | --------------------------------- | --------------------------- | ----------------------- | ------------------------ |
| Catalogue/content      | static public or private-no-buyer | Next Cache Components       | public framework policy | Shopify webhook tags     |
| Search results         | static market-scoped              | Next bounded keys           | app route policy        | `products`/`collections` |
| Sitemap                | static no-buyer                   | Next remote cache           | public                  | resource family tag      |
| Cart                   | request/cookie-bound              | none/shared cache forbidden | private, no-store       | mutation/read-through    |
| Checkout/permalink     | request-bound                     | none                        | private, no-store       | not applicable           |
| Accounts               | Shopify-hosted by default         | Shopify                     | no local response       | not applicable           |
| URL redirect candidate | request-scoped private            | none                        | redirect or static 404  | Shopify source of truth  |

## Consequences

The common path stays cacheable and avoids redundant Shopify traffic. Market switching is an explicit
performance decision rather than an ambient cookie on every install. Hydrogen preview additions cannot
silently widen the public HTTP surface; adopting a new handler requires changing and testing the local
policy first.
