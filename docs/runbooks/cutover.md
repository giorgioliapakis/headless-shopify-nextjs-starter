# Storefront cutover runbook

Cutover is merchant-specific, human-gated operational work. The migration CLI and coding agent have no
authority to perform it.

## Before approval

- Freeze or delta-capture the source and bind review evidence to the final source, code, preview,
  dependency and verification hashes.
- Require zero unsupported revenue-critical routes, commerce behaviors, SEO surfaces, navigation paths
  and primary interactions. Document every bounded non-critical exclusion.
- Verify production-like home, collection, PDP, search, cart and hosted-checkout journeys on supported
  mobile/desktop browsers, keyboard and touch, with no-JS fallbacks where promised.
- Verify status codes, redirects, canonicals, hreflang, structured data, sitemap, robots, analytics consent,
  checkout-domain purchase tracking and all enabled Markets.
- Pass merchant-specific performance/resource budgets using real media, fonts and integrations.
- Confirm CSP, webhook, rate/body/domain limits, monitoring, health/readiness and degraded-Shopify states.
- Rehearse the rollback runbook, name the operator and decision owner, lower DNS TTL in advance where
  appropriate, and agree the rollback threshold and deadline.

## Separate approvals

Preview acceptance, production deploy, Shopify/webhook/tracking changes, domain attachment, DNS change,
cutover and rollback are distinct signed actions. Approval for one grants none of the others. Every
approval must bind actor, shop, environment, action, expiry and evidence hashes outside agent-writable
files.

## Execution and observation

An authorized human operator performs the approved deploy/domain/DNS steps using protected credentials.
Immediately smoke-test catalogue navigation, product variants/selling plans, cart mutations, discount,
Shop Pay eligibility, hosted checkout, account handoff, localized URLs/pricing and tracking. Observe error
rate, checkout starts, conversion telemetry, Core Web Vitals and Shopify/API failures for the agreed
window. Execute rollback when the pre-agreed threshold is crossed; do not negotiate the threshold during
an incident.
