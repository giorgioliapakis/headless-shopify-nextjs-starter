# Agentic Shopify Starter

A parity-first, agent-ready foundation for migrating established Shopify storefronts to Next.js.

The intended workflow is:

1. Supply the live storefront URL and published theme source.
2. Generate a compatibility report before sharing API credentials.
3. Connect narrowly scoped Shopify access.
4. Reconstruct the approved storefront from reusable commerce primitives.
5. Verify content, behavior, responsive design, SEO, accessibility, and performance.
6. Cut over only after explicit merchant approval.

This repository is private and pre-alpha. It does not yet contain an application scaffold.

The current roadmap deliberately proves a thin URL-to-review migration before generalizing the agent
framework. The first public milestone will be an evidence-limited experimental alpha with a declared
compatibility matrix, not an “any Shopify store” claim.

## Project documents

- [Product requirements](docs/requirements/2026-07-11-agentic-shopify-starter.md)
- [Execution backlog](docs/TASKS.md)
- [Clean-room policy](CLEAN_ROOM.md)
- [Migration trust boundaries](docs/security/trust-boundaries.md)
- [Active implementation plan](docs/plans/2026-07-13-001-feat-autonomous-shopify-starter-plan.md)
