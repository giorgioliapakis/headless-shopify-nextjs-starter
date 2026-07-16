# Storefront performance budgets

Performance is a release contract, not a one-time score. These budgets govern the neutral starter and
must be rerun for every generated merchant storefront because real fonts, images, sections, scripts and
catalogue shapes can materially change results.

## Field outcomes

At the 75th percentile, segmented by mobile/desktop and key route family:

| Metric                    |    Budget |
| ------------------------- | --------: |
| Largest Contentful Paint  |  <= 2.5 s |
| Interaction to Next Paint | <= 200 ms |
| Cumulative Layout Shift   |   <= 0.10 |

Field data is the outcome gate once a store has enough traffic. Lab checks prevent obvious regressions
before field data exists; they do not prove real-user performance.

## Neutral production-mode lab gate

The required route set is `/`, one product, one collection, `/search` and `/cart`. Tests run against a
production build with deterministic neutral Shopify fixtures, fixed viewport/network/CPU profiles and no
browser extensions.

| Measure                             |                                     Initial budget |
| ----------------------------------- | -------------------------------------------------: |
| Lighthouse performance              |                                              >= 95 |
| Lighthouse accessibility            |                                                100 |
| Lighthouse best practices           |                                                100 |
| Lighthouse SEO (indexable routes)   |                                                100 |
| Total emitted client JavaScript     |                              <= 450,000 gzip bytes |
| Largest emitted client chunk        |                               <= 90,000 gzip bytes |
| Total emitted CSS                   |                               <= 30,000 gzip bytes |
| Route-level JavaScript regression   | <= +5 KiB compressed without an approved exception |
| Layout shift in scripted route flow |                                            <= 0.10 |
| Accessibility violations            |                              0 serious or critical |

Absolute emitted asset and GraphQL document ceilings are enforced by `pnpm budget:bundle` and
`pnpm budget:query`; values live in `config/performance-budgets.json`. Per-route image bytes, request
count, Lighthouse and Server-Timing baselines remain **calibration required** until the deterministic
interactive browser pass is explicitly authorized and recorded. A missing required route or measurement
fails rather than silently skipping it.

## Architectural budgets

- Catalogue routes render meaningful HTML without waiting for cart/account state.
- Cart/account data is isolated behind narrow Suspense boundaries and never public-cacheable.
- An ordinary cached route gains zero additional Shopify calls from Hydrogen request/routing plumbing.
- Disabled optional sections add zero route JavaScript and no third-party request.
- Below-fold heavy sections stream or lazy-load; the primary product image and chosen LCP asset do not.
- Images declare dimensions, responsive `sizes` and intentional priority; source assets are never shipped
  at unbounded dimensions.
- Fonts are self-hosted or deliberately loaded, subset where licensing permits and protected against
  layout shift.
- Third-party scripts are absent by default. Each enabled script needs a named owner, consent category,
  data inventory, loading strategy, measured cost and kill switch.
- GraphQL documents request only rendered data. Pagination, query cost and Shopify throttling are measured
  on scale fixtures.

## Measurement protocol

1. Build with exact Node/pnpm/dependency versions and deterministic neutral fixtures.
2. Warm and cold runs are recorded separately; take enough repetitions to report the median and spread.
3. Capture route, commit, tool/browser versions, fixture hash, viewport, throttling, bundle assets,
   requests, server timing and Lighthouse/a11y outputs.
4. Compare against the versioned baseline and explain every regression. Variance outside the declared
   tolerance is a failure, not a flaky retry until green.
5. Rerun with downstream merchant evidence before review approval and again before cutover if material
   assets, integrations or catalogue structure changed.

## Exceptions

An exception must name the route/capability, measured delta, user value, alternatives considered, owner,
expiry and removal condition. It cannot waive serious accessibility failures, shared caching of personal
data, missing content/status behavior or a field Core Web Vital failure. Expired exceptions fail CI.

## Current state

The field targets, GraphQL ceilings, emitted JS/CSS limits, secretless production build and CI enforcement
are active. Lighthouse, axe, visual and per-route network baselines remain pending the required interactive
browser run; the repository does not claim those scores until its versioned artifacts exist.
