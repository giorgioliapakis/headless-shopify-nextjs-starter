---
status: accepted
date: 2026-07-16
review_by: 2026-08-15
expires: 2026-10-31
owners: storefront-foundation-maintainers
supersedes: 0001-platform-baseline (Hydrogen exclusion only)
---

# Bounded adoption of the framework-agnostic Hydrogen preview

## Context

Shopify's July 2026 Hydrogen developer preview is a framework-agnostic SDK and matching set of agent
skills. It can be used inside Next.js on Vercel; it is not the older React Router Hydrogen framework and
does not require Oxygen. The SDK now owns several Shopify-specific concerns that this starter currently
implements itself: Storefront request context, GraphQL schema typing, cart behavior, routing, Markets,
money, Shop Pay, analytics and customer-account primitives.

The starter normally permits stable dependencies only. The preview is valuable enough to evaluate, but
an unbounded preview dependency would make established merchants involuntary beta testers.

## Decision

Keep Next.js 16 and Vercel as the supported application and hosting baseline. Adopt Hydrogen behind the
app-owned `lib/shopify/operations/**` boundary in characterized, reversible slices.

The only authorized preview dependency is:

- package: `@shopify/hydrogen`
- version: `0.0.0-preview-8a708a8-20260708155454`
- npm shasum: `8f40a1bef510b6be13c507da2e7a43e6ae3e6e14`
- npm integrity: `sha512-JNd3ZRaMvSZLKDBsPqMa1a0zsCBuLtaoedkzyUOyvXq6eTqSAVhClxpig+I6O9EFrY1cRKh9S43AeTqDBJ9fqQ==`

The package must be installed by exact version, captured in the frozen lockfile and verified by repository
provenance checks. A `preview`, `latest`, Git branch or other moving selector is not allowed. This narrow
exception supersedes only ADR 0001's Hydrogen exclusion; all other stable-channel rules remain in force.

### Runtime boundaries

- Next Cache Components owns catalogue/content caching. Hydrogen's optional response cache remains off
  unless a later ADR proves ownership, invalidation and no double caching.
- Cart, account and other buyer-specific data must remain request-bound and privately cached or uncached.
- Routes and components keep importing app-owned operations. Direct Hydrogen transport imports are
  limited to `lib/shopify/hydrogen/**`; later React bindings live in explicit commerce adapters.
- The starter continues to hand off to Shopify-hosted checkout. Hosted accounts remain the default;
  headless accounts are an optional capability.
- GraphiQL is development-only. MCP, WebMCP and agent-facing HTTP routes remain absent unless a capability
  is explicitly enabled with independent method, origin, rate, body and data controls.
- Legacy public Storefront environment names may temporarily alias canonical Hydrogen public-token names.
  A public token must never be treated as a private buyer-context token.

## Adoption gates

Each slice must satisfy all applicable gates before the legacy implementation is removed:

1. Existing behavior is captured in deterministic contract tests.
2. The Hydrogen implementation produces equivalent stable domain results and error semantics.
3. No credential, buyer context or personalized response becomes client-visible or shared-cacheable.
4. The slice stays within route, bundle and request budgets and adds no Storefront call to unrelated routes.
5. The package and copied skill provenance checks pass from a frozen-lockfile install.
6. The old implementation is removed after the cutover; no permanent runtime provider switch remains.

## Review, stabilization and removal

Maintainers review the exception at least every 30 days, beginning 2026-08-15. Before the 2026-10-31
expiry, they must choose and record one of these outcomes:

- replace the preview with a compatible stable Hydrogen release after conformance passes;
- extend the exception with a new exact version, security/supply-chain review and dated ADR amendment; or
- remove Hydrogen and restore the last characterized direct transport.

An expired exception fails the repository policy check. A newly published preview never updates
automatically.

## Rollback

Every adoption slice lands as a separately verified commit. Roll back the latest slice, restore the exact
previous lockfile and run the full transport/cart/route contracts. Shopify data, hosted checkout and the
merchant's live theme are unaffected because the migration changes only the storefront presentation
repository.

## Consequences

- The starter can use Shopify-maintained commerce primitives while retaining Next.js, Vercel and its own
  stable domain API.
- Preview churn is contained, measurable and removable.
- Some temporary characterization code is expected during a slice, but dual production providers are not.
- Stable Hydrogen is preferred as soon as it meets the same tests and performance/security gates.
