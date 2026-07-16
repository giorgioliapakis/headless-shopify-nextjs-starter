# Agentic Shopify Starter

A parity-first, agent-ready foundation for migrating established Shopify storefronts to Next.js.

The intended workflow is:

1. Supply the live storefront URL and published theme source.
2. Generate a compatibility report before sharing API credentials.
3. Connect narrowly scoped Shopify access.
4. Reconstruct the approved storefront from reusable commerce primitives.
5. Verify content, behavior, responsive design, SEO, accessibility, and performance.
6. Cut over only after explicit merchant approval.

This repository is a private experimental alpha candidate. It contains the audited storefront runtime
and a credential-free, resumable migration thin slice. It does not yet claim that any arbitrary Shopify
store can migrate or cut over autonomously.

The current roadmap deliberately proves a thin URL-to-review migration before generalizing the agent
framework. The first public milestone will be an evidence-limited experimental alpha with a declared
compatibility matrix, not an “any Shopify store” claim.

## Current runtime

- Next.js 16 App Router, React Server Components, Server Actions, Cache Components, and Tailwind CSS 4
- shadcn source-owned components on Base UI
- Hydrogen-backed Shopify Storefront API `2026-07` operations with bundled-schema `gql.tada`
  validation for products, collections, search, pages, policies, cart, sitemap, and cache revalidation
- Shopify-hosted checkout and optional hosted customer-account handoff
- Safe Hydrogen checkout/permalink routing and post-404 Shopify redirects; proxy APIs and agent surfaces
  remain closed by default
- Single-market fast path with an opt-in bounded Markets selector and buyer-identity synchronization
- Exact-SHA Vercel Shop provenance with the shopper assistant and preview headless accounts excluded
- Pinned React performance, composition, shadcn, and interface-review skills; Next.js guidance comes
  from the installed version's bundled docs
- Versioned semantic theme tokens, 14 registered global/page sections and merchant-owned page recipes
- Native selling-plan selection, Shopify blogs/articles and a machine-readable capability registry
- CSP/security headers, rich-content sanitization, health/readiness endpoints, Storefront operation
  budgets and compressed JS/CSS regression gates
- A pinned, networkless generated-code quarantine with immutable dependency/security controls and no
  credential or broker access

## Credential-free migration start

Run migrations in a private downstream repository, never in the distributable foundation. You need the
current public storefront URL and the merchant's published theme as a local directory or `.zip`. No API
credential is required for this first pass.

```bash
pnpm migrate doctor \
  --store-url https://shop.example \
  --theme-source /absolute/path/to/published-theme \
  --theme-rights-confirmed \
  --new-run
pnpm migrate capability
pnpm migrate snapshot --max-pages 100
pnpm migrate status
pnpm migrate review
pnpm migrate resume --json
```

The snapshot is bounded, same-origin, DNS-pinned, robots-aware and treated as untrusted evidence. Theme
source is inventoried read-only; archives are lazily path/size/type validated, never extracted or
executed. A local Git source must be a clean, ordinary worktree: the inspector binds it to its exact HEAD
and manifest through staged minimal metadata while disabling hooks and credential access and rejecting
filters, submodules, alternates, nested repositories and worktree indirection. The theme identity is
checked again before public capture so a changed source requires a new isolated run. State, evidence and logs remain in
ignored `.migration/`. Secret-bearing CLI flags are rejected. Protected Shopify Admin discovery is a
future allowlisted OS-keychain broker—not an access token passed to an agent.

Snapshotting also produces a route/template/section reconstruction plan. Known patterns point to the
commerce core or registered sections; heuristic mappings require review, while app blocks and unknown
patterns remain merchant-owned downstream work. Bounded theme-setting observations provide color, font,
logo-reference and layout candidates without copying Liquid or editorial content; the agent must map
these observations into semantic tokens and confirm them visually. The same command emits a deterministic
source/preview capture manifest and a readiness report that keeps unknown routes, sections and app blocks
explicitly blocking instead of silently treating a successful crawl as parity. Recaptures are
content-addressed, retain immutable originals, report route-level source drift and stale earlier review
decisions instead of overwriting their evidence silently.

Use `--json` for agent-readable success and failure reports. Failed prerequisite checks include a bounded
remediation and never create a partially initialized run.

After reconstruction, record non-authoritative review decisions and run the complete local gate:

```bash
pnpm migrate decision --id homepage-parity --status accepted --summary "Approved against the source evidence"
pnpm migrate review
pnpm migrate verify --production
```

Generated code must first pass the OS-isolated command in
[`docs/security/generated-code-quarantine.md`](docs/security/generated-code-quarantine.md), invoked from
a separate clean foundation checkout. Node permission flags are not treated as a malicious-code sandbox.

There is intentionally no deploy, launch, DNS or cutover command. Those actions require separate human
approval outside the agent-writable repository. Read the canonical
[migration workflow](agent-workflows/canonical/migrate-storefront.md) before starting.

## Hydrogen adoption

The starter remains a Next.js application deployed to Vercel. It uses Shopify's new
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
pnpm dev
```

Add a Storefront API domain/token to `.env.local`. The token is runtime read access only; future
migration discovery uses a separate short-lived, allowlisted Admin credential broker.

Verify the configuration before the first build. The report is redacted and never prints the token or
Shopify response content:

```bash
pnpm storefront:doctor
```

A private Headless-channel Storefront token is optional, but required for Shopify URL-redirect lookup.
The public storefront token is never reused as private access. Additional markets should be enabled only
after they are published in Shopify and their localized pricing, availability, URLs and checkout handoff
have passed the market browser contract.

Run the deterministic local gate with:

```bash
pnpm check
```

Run only the stable pre/post commerce contracts with:

```bash
pnpm test:contracts
```

Install the pinned Chromium revision and run the production desktop/mobile/no-JavaScript, axe and
Lighthouse gates with `pnpm browser:install`, `pnpm browser:test` and `pnpm lighthouse`.

The production build requires valid Storefront credentials because catalogue-backed static work is
resolved during the build. Synthetic products are never substituted silently. For a credential-free
platform build, explicitly set the three neutral fixture values documented in `.env.example`; fixture
mode refuses any real merchant domain, token or private credential and fails on unknown operations.

## Project documents

- [Merchant getting started](docs/onboarding/getting-started.md)
- [Product requirements](docs/requirements/2026-07-11-agentic-shopify-starter.md)
- [Execution backlog](docs/TASKS.md)
- [Clean-room policy](CLEAN_ROOM.md)
- [Migration trust boundaries](docs/security/trust-boundaries.md)
- [Migration workflow](agent-workflows/canonical/migrate-storefront.md)
- [Hydrogen compatibility](docs/compatibility/hydrogen.md)
- [Migration compatibility and scale envelope](docs/compatibility/migration-envelope.md)
- [Hydrogen upgrade runbook](docs/runbooks/hydrogen-upgrade.md)
- [Downstream foundation update runbook](docs/runbooks/foundation-updates.md)
- [Foundation release runbook](docs/runbooks/release.md)
- [Cutover runbook](docs/runbooks/cutover.md) and [rollback runbook](docs/runbooks/rollback.md)
- [Active implementation plan](docs/plans/2026-07-13-001-feat-autonomous-shopify-starter-plan.md)
- [Hydrogen storefront platform plan](docs/plans/2026-07-16-001-feat-hydrogen-storefront-platform-plan.md)
