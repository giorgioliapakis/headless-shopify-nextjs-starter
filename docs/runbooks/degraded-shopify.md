# Degraded Shopify runbook

`/api/health` proves the Next.js process can respond. `/api/readiness` proves required Storefront
configuration is valid without sending a Shopify request. Neither endpoint exposes domains, tokens or
upstream response bodies.

During elevated Storefront errors:

1. Confirm liveness/readiness and inspect redacted timeout/status/request-ID telemetry.
2. Separate cached catalogue reads from private cart/checkout failures; never cache a personalized error.
3. Keep hosted checkout links already present in a settled cart available. Do not invent cart state.
4. Serve bounded route error UI or previously valid shared catalogue cache where the route contract allows.
5. Disable optional analytics/integration packs before changing invariant commerce behavior.
6. After recovery, verify product, collection, search, add/update/remove cart and checkout handoff.

Do not rotate credentials, change Shopify configuration, deploy, purge all caches or alter DNS without the
corresponding operator approval. Record incident timing and the exact recovery evidence.
