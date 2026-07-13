---
date: 2026-07-11
topic: agentic-shopify-starter
---

# Agentic Shopify Starter Requirements

## Problem frame

Established Shopify merchants need a low-risk route to headless commerce. They should be able to direct
a coding agent to reconstruct the storefront their customers already know, inherit a high-quality
Next.js foundation, verify parity, and make controlled improvements afterward.

The initial user is a non-technical merchant or small team comfortable using coding agents. The product
is a migration system and storefront foundation, not a one-click theme generator.

## Requirements

### Migration promise

- R1. Faithful parity is the default: preserve approved URLs, content, brand, layout, responsive
  behavior, interactions, SEO, and commerce behavior as closely as technically practical.
- R2. Existing storefront behavior is presumed intentional. Deviations require evidence, a stated
  reason, and merchant approval.
- R3. Accessibility, security, correctness, platform constraints, and material performance defects may
  justify a documented deviation. WCAG 2.2 AA is the accessibility floor.

### Staged onboarding and access

- R4. The merchant first supplies a public storefront URL and published theme ZIP or read-only theme
  repository.
- R5. A public preflight produces a preliminary inventory, source-theme match result, and compatibility
  recommendation before API credentials are requested.
- R6. Full migration requires Storefront API access for runtime commerce and migration-only,
  least-privilege Admin API read access for discovery.
- R7. Admin discovery access excludes customer, order, payment, fulfilment, discount, catalogue-write,
  content-write, and theme-write authority and can be removed after the snapshot.
- R8. A setup doctor validates prerequisites, exact scopes, source-theme provenance, secret handling,
  and resumable state without printing credentials.

### Discovery and viability

- R9. Discovery reconciles public crawling, robots and sitemaps, navigation, responsive rendering,
  theme source, Storefront API data, Admin API data, redirects, and optional merchant analytics exports.
- R10. Every known URL receives a page type and a separate disposition. Disagreements and unprovable
  coverage remain visible evidence gaps.
- R11. Facts record provenance as observed, theme-sourced, Shopify-sourced, inferred, or
  merchant-confirmed.
- R12. Discovery produces a bounded, context-aware snapshot and detects material source changes during
  capture.
- R13. A viability gate returns proceed, proceed with exclusions, gather evidence, or stop before costly
  reconstruction begins.

### Storefront foundation

- R14. The invariant commerce core covers products, variants, collections, search, menus, pages,
  policies, cart, cache invalidation, hosted accounts, and hosted checkout.
- R15. The invariant UI covers product cards and grids, pricing, galleries, variant and quantity
  controls, add-to-cart, cart contents and totals, search, breadcrumbs, pagination, and complete loading,
  empty, and error states.
- R16. The invariant page recipes cover home, product, collection, search, cart, standard content,
  policy, and not-found pages.
- R17. Optional capabilities and recipes are added when proving migrations need them and promoted to the
  generic library only when reusable.
- R18. Brand reconstruction uses semantic design tokens, component variants, and section composition,
  not scattered raw values or call-site overrides.
- R19. The UI foundation uses shadcn source-owned components, Base UI, Tailwind CSS, and a representative
  parity spike before its public primitive contract is frozen.

### Agent package

- R20. Repository instructions hold permanent invariants, skills hold situational guidance, and
  automated checks enforce objective quality and safety gates.
- R21. The curated skill pack covers current Next.js, React performance, composition, shadcn, Shopify,
  discovery, parity reconstruction, browser verification, accessibility, SEO, and landing pages.
- R22. Skills have pinned source, version, license, compatibility, integrity, and update metadata.
- R23. Codex and Claude Code are the initial supported hosts and must pass equivalent behavioral
  conformance scenarios. Conductor is an optimized workflow, not a requirement.

### Verification and launch

- R24. Verification compares representative responsive widths and meaningful interactive states rather
  than static homepage screenshots alone.
- R25. Commerce verification covers variants, cart mutations, merchant-supplied discount scenarios,
  localization where present, hosted accounts, and checkout handoff without placing a real order.
- R26. SEO verification covers routes, redirects, status codes, metadata, canonicals, structured data,
  indexability, sitemaps, and internal links.
- R27. The parity report links evidence and classifies checks as matched, safely improved, awaiting a
  decision, unsupported, intentionally excluded, or failed.
- R28. Merchant approval is durable and item-specific for deviations. Matched checks may be accepted in
  bulk; unsupported or excluded items may not.
- R29. Production deployment, DNS, Shopify writes, tracking activation, and cutover remain human-gated.
- R30. Every launch includes rollback readiness, production smoke checks, monitoring, rollback triggers,
  and a defined observation window.

### Security and lifecycle

- R31. All crawled and imported material is untrusted data and cannot authorize agent actions.
- R32. Crawling prevents SSRF, unsafe redirects, unbounded work, and access outside approved hosts.
- R33. Theme ingestion is isolated, read-only, archive-safe, and never executes imported code.
- R34. Credentials are minimized, isolated, redacted, never committed, and revoked or removed when no
  longer required.
- R35. Snapshots, reports, and previews are access-controlled, non-indexable, sanitized, and excluded
  from distributable history by default.
- R36. Generated stores retain a versioned, conflict-aware path for receiving foundation updates.
- R37. Supported Shopify API versions and compatibility windows are explicit and intentionally upgraded.

### Autonomous execution contract

- R38. Every migration has a machine-readable run state with explicit phases, bounded tasks, retry
  metadata, success, partial, blocked, cancelled, rolled-back, and completed outcomes.
- R39. Agents signal task and phase completion explicitly with evidence; completion is never inferred
  from silence, file existence, or elapsed time.
- R40. Checkpoints cover preflight, discovery, reconstruction, verification, review, and launch
  preparation. Resume must not repeat expensive work or overwrite merchant changes.
- R41. User and agent share one ignored, schema-versioned migration workspace organized by evidence,
  model, decisions, checkpoints, reports, and redacted logs, with atomic writes and conflict rules.
- R42. Every agent turn receives compact trusted context describing run identity, progress, resources,
  capabilities, budgets, unresolved decisions, approvals, and permitted tools. Imported content remains
  clearly delimited untrusted evidence.
- R43. A capability map connects merchant outcomes to portable atomic commands, data authority,
  approval class, and verification. Core autonomy uses CLI, JSON schemas, and files; MCP is optional.
- R44. Approvals are enforced state bound to evidence, source, preview, and check hashes. Relevant change
  invalidates approval, and dangerous actions use separate propose and apply stages.
- R45. A redacted append-only run ledger records phases, actions, artifact hashes, host/model/skill
  versions, retries, duration, token/cost estimates, approval events, commits, and verification results.
- R46. Codex and Claude Code run the same outcome-based conformance suite, including interruption,
  failure injection, approval bypass, prompt injection, drift, idempotency, and open-ended migration
  scenarios.

### Exceptional boilerplate baseline

- R47. Conditional parity modules cover blogs/articles, landing pages, forms, analytics/consent,
  Markets, reviews, subscriptions, search providers, and other detected integrations without bloating
  the invariant core.
- R48. The runtime baseline enforces webhook authentication, security headers, safe rich-content
  rendering, domain validation, request limits, error redaction, degraded-Shopify behavior, health
  signals, and executable SEO, accessibility, performance, and bundle budgets.
- R49. Raw Admin credentials live in an OS-backed broker outside the agent-writable workspace. Agents
  receive short-lived, capability-scoped access only to allowlisted reads and cannot obtain credentials
  through prompts, files, environment variables, arguments, logs, child processes, or generated code.
- R50. Human approvals use an authentication/signature boundary the coding agent cannot forge. Every
  privileged apply operation independently validates actor, action, environment, expiry, source,
  preview, evidence, and check bindings.
- R51. Hostile browser capture and generated-code execution occur in disposable, credential-free,
  broker-free sandboxes with restricted filesystem and network access. Theme Git/ZIP ingestion disables
  execution, hooks, filters, submodules, LFS smudge, traversal, symlink escape, and unbounded work.
- R52. The merchant journey and evidence review are first-class product surfaces. Non-technical users
  can understand progress, viability, unknowns, blockers, stale evidence, decisions, next actions,
  cancellation, and resume without interpreting raw agent logs.
- R53. Product proof measures elapsed time, merchant effort, agent/tool cost, manual repair, decisions,
  rework, support intervention, route-template autonomy, and revenue-critical coverage—not only test
  completion.
- R54. Compatibility limits and public-release scorecards are pre-registered before proving merchants
  are selected. Real merchant work lives in separate private downstream repositories, and merchant
  waivers cannot manufacture a passing generic release.
- R55. The first public milestone is an explicitly evidence-limited alpha. A broader recommendation
  requires multiple varied migrations and a consented production cutover with observation and rehearsed
  rollback.

## Success criteria

- One eligible independent merchant migration completes the full URL-to-launch-readiness loop before
  broad platform expansion.
- The initial compatibility envelope targets standard Online Store 2.0 themes and rejects or qualifies
  stores outside tested capability and scale bounds before costly work.
- All bounded route sources reconcile or appear as explicit evidence gaps.
- No content, URL, SEO, behavior, integration, or safety deviation reaches cutover without a recorded
  decision.
- Runtime commerce continues after migration-only Admin credentials are removed.
- A deliberately varied fixture set covers a Dawn-derived theme, a non-Dawn Online Store 2.0 theme, and
  third-party app blocks.
- A neutral demonstration store contains no merchant-specific material.
- A migration interrupted during any major phase resumes from the latest valid checkpoint without
  leaking secrets, repeating accepted work, or overwriting merchant edits.
- Codex and Claude Code achieve the same required outcomes and respect the same approval gates using
  host-neutral artifacts and commands.
- A non-technical target user reaches the credential-free compatibility report, including recovery from
  a seeded setup error, without developer assistance.
- Zero unsupported behavior remains on revenue-critical routes, core commerce, URLs, SEO, navigation,
  or primary buyer interactions at launch readiness.

## Scope boundaries

- No one-click or zero-work promise.
- No autonomous production deployment, DNS cutover, tracking activation, or Shopify Admin writes.
- No custom checkout baseline or automatic replacement of every Shopify app.
- No simultaneous Base UI and Radix support.
- No first-party multi-tenant onboarding service in the initial release.
- No merchant content, assets, theme source, credentials, snapshots, or Git history in the template.

## Next step

See `docs/TASKS.md` and the active plan in `docs/plans/`.
