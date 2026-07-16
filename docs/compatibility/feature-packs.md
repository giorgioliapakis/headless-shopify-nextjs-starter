# Feature-pack contract

The invariant storefront ships Shopify resources that have a stable Storefront API contract: catalogue,
variants, collections, search, menus, pages, policies, blogs/articles, cart, redirects and hosted
checkout. Everything else is declared in `lib/commerce/capabilities.ts` and mirrored for coding agents in
`agent-workflows/capability-map.json`.

A capability is not “supported” merely because a dependency is installed. It needs:

- an explicit capability ID and status;
- configuration and required environment names;
- at least one route or component consumer;
- cache/data classification;
- neutral tests for enabled and disabled behavior;
- documented unsupported cases.

Statuses mean:

- `core`: available in every generated storefront;
- `conditional`: implemented but disabled until discovery finds a real consumer;
- `hosted`: deliberately handed off to Shopify;
- `planned`: an approved boundary with no safe implementation claim yet;
- `unsupported`: requires a merchant/provider-specific adapter and parity evidence.

## Current conditional packs

`analytics.shopify` is enabled with `NEXT_PUBLIC_SHOPIFY_ANALYTICS_ENABLED=true`. It uses Hydrogen's
default privacy banner, a bounded consent bootstrap, and confirmed cart deltas. The purchase event still
belongs on Shopify checkout.

`markets` is enabled only by publishing more than one verified locale in `lib/i18n/index.ts`.
Merchandising bundles, complementary products and recommendations are controlled in `shop.config.ts`.
Hosted accounts require `NEXT_PUBLIC_SHOPIFY_ACCOUNT_URL`.

## Provider packs

Reviews, loyalty, wishlists, subscriptions, forms/newsletters and third-party search must be implemented
as named provider adapters. Discovery must identify the existing provider, approved behavior, browser
scripts, data ownership, consent category, webhook/API requirements and failure behavior. The starter
does not ship fake provider-neutral UI that silently drops those contracts.

Disabled packs must not read credentials, create browser globals, make requests or publish analytics.
Agents should inspect the capability manifest before proposing code and update the TypeScript registry,
JSON mirror, compatibility documentation and tests together.
