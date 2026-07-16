# Hydrogen upgrade runbook

Hydrogen is an exact dependency and a commerce-boundary change, never a routine floating update.

1. Create a dedicated branch and record the current package version, integrity, Storefront API version,
   Node/pnpm versions, neutral asset baseline and last accepted production verification result.
2. Read the candidate package changelog, bundled type declarations, schema and matching versioned
   Hydrogen skills. Confirm its license and lifecycle scripts before installation.
3. Install one exact version with pnpm. Do not use `preview`, `latest`, a range or an unreviewed lockfile.
4. Refresh `docs/provenance/hydrogen-sdk.json`, `agent-workflows/skills.json` and the copied package skills
   through the repository sync commands. Record checksum and API differences.
5. Run transport, routing/cache, cart, money, Shop Pay, analytics, Markets, selling-plan and webhook
   characterization tests. Any change to cookie, header, cache, redirect, event or user-error semantics is
   an explicit migration decision.
6. Run `pnpm check` and `pnpm verify:production`; compare query count/cost and compressed JS/CSS against
   the committed baseline. Run the full browser/accessibility/Lighthouse matrix when available.
7. Test a production-like protected Shopify fixture, then a merchant preview. Never treat the neutral
   fixture as merchant performance proof.
8. Update ADR 0002 with the version, date, results, exceptions, owner, expiry and rollback commit. Merge
   only when every affected contract passes.

Rollback is the last accepted lockfile/package/provenance/skill set as one atomic revert. Do not retain
parallel legacy and new providers after rollback or ship a partially refreshed skill/schema set.
