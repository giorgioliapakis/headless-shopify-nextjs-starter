# Agentic Shopify Starter

A parity-first, agent-ready foundation for migrating established Shopify storefronts to Next.js.

The intended workflow is:

1. Supply the live storefront URL and published theme source.
2. Generate a compatibility report before sharing API credentials.
3. Connect narrowly scoped Shopify access.
4. Reconstruct the approved storefront from reusable commerce primitives.
5. Verify content, behavior, responsive design, SEO, accessibility, and performance.
6. Cut over only after explicit merchant approval.

This repository is private and pre-alpha. It contains the audited storefront runtime; the autonomous
migration workflow is still under construction.

The current roadmap deliberately proves a thin URL-to-review migration before generalizing the agent
framework. The first public milestone will be an evidence-limited experimental alpha with a declared
compatibility matrix, not an “any Shopify store” claim.

## Current runtime

- Next.js 16 App Router, React Server Components, Server Actions, Cache Components, and Tailwind CSS 4
- shadcn source-owned components on Base UI
- Typed Shopify Storefront API `2026-07` operations for products, collections, search, pages, policies,
  cart, sitemap, and cache revalidation
- Shopify-hosted checkout and optional hosted customer-account handoff
- Exact-SHA Vercel Shop provenance with the shopper assistant and preview headless accounts excluded
- Pinned React performance, composition, shadcn, and interface-review skills; Next.js guidance comes
  from the installed version's bundled docs

## Hydrogen adoption

The starter remains a Next.js application deployed to Vercel. It is adopting Shopify's new
framework-agnostic Hydrogen SDK as a commerce library—not migrating to the older React Router Hydrogen
framework or to Oxygen. The exact preview is bounded by
[ADR 0002](docs/adr/0002-hydrogen-preview-adoption.md), characterization tests and an expiry; no moving
preview tag is permitted.

Current claims and gaps are tracked in the
[storefront capability contract](docs/compatibility/storefront-capabilities.md). Performance targets and
the distinction between policy, neutral lab proof and downstream merchant proof are in the
[performance budgets](docs/performance/budgets.md).

## Local setup

Prerequisites are Node 24 and pnpm 11.5.0.

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm codegen
pnpm dev
```

Add a Storefront API domain/token to `.env.local`. The token is runtime read access only; future
migration discovery uses a separate short-lived, allowlisted Admin credential broker.

Run the deterministic local gate with:

```bash
pnpm check
```

Run only the stable pre/post commerce contracts with:

```bash
pnpm test:contracts
```

The production build requires valid Storefront credentials because catalogue-backed static work is
resolved during the build. Synthetic products are never substituted silently.

## Project documents

- [Product requirements](docs/requirements/2026-07-11-agentic-shopify-starter.md)
- [Execution backlog](docs/TASKS.md)
- [Clean-room policy](CLEAN_ROOM.md)
- [Migration trust boundaries](docs/security/trust-boundaries.md)
- [Active implementation plan](docs/plans/2026-07-13-001-feat-autonomous-shopify-starter-plan.md)
- [Hydrogen storefront platform plan](docs/plans/2026-07-16-001-feat-hydrogen-storefront-platform-plan.md)
