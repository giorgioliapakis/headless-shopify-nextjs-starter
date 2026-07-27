# Storefront performance budgets

Performance is a release contract, not a one-time score. These budgets govern the starter itself. Re-run
them against your own storefront before you launch — real fonts, imagery, sections, apps and catalogue
shape all move the numbers.

## Field outcomes

At the 75th percentile, segmented by mobile/desktop and key route family:

| Metric                    |    Budget |
| ------------------------- | --------: |
| Largest Contentful Paint  |  <= 2.5 s |
| Interaction to Next Paint | <= 200 ms |
| Cumulative Layout Shift   |   <= 0.10 |

Field data is the outcome gate once a store has enough traffic. Lab checks prevent obvious regressions
before field data exists; they do not prove real-user performance.

## Production-mode lab gate

The required route set is `/`, one product, one collection, `/search` and `/cart`. Tests run against a
production build with the deterministic Shopify fixture, fixed viewport/network/CPU profiles and no
browser extensions.

| Measure                                                     |                                     Initial budget |
| ----------------------------------------------------------- | -------------------------------------------------: |
| Lighthouse performance (shell/PDP/cart)                     |                                              >= 95 |
| Lighthouse performance (streamed catalogue/search)          |                                              >= 93 |
| Lighthouse accessibility                                    |                                                100 |
| Lighthouse best practices                                   |                                                100 |
| Lighthouse SEO (indexable routes)                           |                                                100 |
| Lighthouse simulated mobile LCP (shell/PDP/cart)            |                                           <= 3.0 s |
| Lighthouse simulated mobile LCP (streamed catalogue/search) |                                           <= 3.4 s |
| Total emitted client JavaScript                             |                              <= 450,000 gzip bytes |
| Largest emitted client chunk                                |                               <= 90,000 gzip bytes |
| Total emitted CSS                                           |                               <= 30,000 gzip bytes |
| Route-level JavaScript regression                           | <= +5 KiB compressed without an approved exception |
| Layout shift in scripted route flow                         |                                            <= 0.10 |
| Accessibility violations                                    |                              0 serious or critical |

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

1. Build with exact Node/pnpm/dependency versions and the deterministic fixture.
2. Lighthouse runs each required route three times. Category scores gate LHCI's coherent representative
   `median-run`; LCP overrides that with the per-audit `median`, because one representative run can carry
   a non-median LCP value. The streamed route ceiling includes 150 ms of declared cross-runner tolerance
   above the original 3.25 s calibration; the performance-score and field-outcome gates remain unchanged.
   Record warm and cold diagnostics separately when investigating regressions.
3. Capture route, commit, tool/browser versions, fixture hash, viewport, throttling, bundle assets,
   requests, server timing and Lighthouse/a11y outputs.
4. Compare against the versioned baseline and explain every regression. Variance outside the declared
   tolerance is a failure, not a flaky retry until green.
5. Re-run against your own storefront before launch, and again whenever assets, integrations or
   catalogue structure change materially.

Failed CI runs preserve the complete Lighthouse report set for seven days. Diagnose the failing audit and
runner variance from those reports before changing a threshold; do not retry a red gate until it happens
to pass.

## Exceptions

An exception must name the route/capability, measured delta, user value, alternatives considered, owner,
expiry and removal condition. It cannot waive serious accessibility failures, shared caching of personal
data, missing content/status behavior or a field Core Web Vital failure. Expired exceptions fail CI.

## Running the gates

```bash
pnpm check              # source and GraphQL document budgets
pnpm verify:production  # credential-free production build + emitted asset budgets

pnpm browser:install    # once — installs the pinned Chromium revision
pnpm browser:test       # desktop, mobile and no-JavaScript journeys, plus axe
pnpm lighthouse         # route Lighthouse budgets
```

The production verifier strips credential-like environment values and builds against the deterministic
fixture, so it runs anywhere without a Shopify account. Artifacts land in ignored `.artifacts/`.

When a budget fails, inspect the exact reported document, asset or chunk before touching a limit. Failed
CI runs preserve the full Lighthouse report set for seven days — diagnose from those rather than retrying
a red gate until it happens to pass.

Re-run after any change to theme tokens, home or landing recipes, LCP media, analytics, Hydrogen or
Next.js.

## Your storefront is not this baseline

These numbers describe the starter with generated demo data. Your real fonts, photography, apps and
catalogue shape will change them materially. Measure your own build separately before you launch, and
never use the demo score to sign off on your own assets or third-party scripts.

## Current state

The field targets, GraphQL ceilings, emitted JS/CSS limits, credential-free production build and CI
enforcement are active. A pinned Playwright 1.61.1, axe 4.12.1 and Lighthouse CI 0.15.1 harness runs in
CI, covering desktop, mobile and JavaScript-disabled behaviour, and gating performance, accessibility,
best practices and indexable-route SEO.
