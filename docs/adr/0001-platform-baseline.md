---
status: accepted
date: 2026-07-13
---

# Stable storefront and agent baseline

## Decision

The starter targets Node 24, pnpm 11.5.0, Next.js 16.2.10, React 19.2.7, Tailwind CSS 4.3.2,
Base UI 1.6.0, and Shopify Storefront API 2026-07. Dependencies are exact rather than ranged.

Vercel Shop commit `04a29f8276598e58ec28e74218f38601f6203470` is the audited runtime source. Its
canary Next.js release, preview Hydrogen transport, shopper-facing assistant, and headless customer
accounts are not part of this baseline. The starter owns a direct typed Storefront GraphQL transport and
uses Shopify-hosted checkout/accounts.

Cache Components remain enabled. Catalogue/content reads belong in cached server operations with tags;
cart and other request-bound state remain outside shared caches and behind narrow Suspense boundaries.

Next.js reference guidance comes from `node_modules/next/dist/docs`, which is version-matched to the
installed framework. Next.js moved the former `next-best-practices` and `next-upgrade` reference skills
into bundled documentation. The repository vendors only relevant current workflow skills with immutable
source commits and checksums.

## Consequences

- A clean install is reproducible and cannot silently take a new framework or API channel.
- Quarterly Shopify upgrades are deliberate bundled-schema and query-validation changes, not automatic
  fall-forward.
- Upstream updates use the import/provenance tools and must record adapted checksums and rationale.
- Storefront builds require valid Shopify read credentials; the starter never hides missing commerce
  truth behind demo products.
- A canary, preview, or unstable exception requires a dated ADR with an owner, reason, expiry, and removal
  condition.
