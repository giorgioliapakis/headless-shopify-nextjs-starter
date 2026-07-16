# Storefront rollback runbook

Rollback restores the last known-good storefront presentation without changing Shopify catalogue,
orders, customers or checkout truth.

## Rehearsal record

Each merchant records the old storefront target, DNS/domain configuration, TTL, cache purge behavior,
tracking ownership, responsible operator, decision maker, measured recovery-time objective, smoke tests
and rollback deadline. Test this procedure before cutover with non-production routing.

## Trigger

Use the signed rollback authority when an agreed threshold is crossed: checkout/cart failure, material
route/SEO loss, wrong pricing/market behavior, severe accessibility regression, data exposure, sustained
error/latency budget breach or missing conversion telemetry. Safety incidents fail closed.

## Procedure

1. Preserve timestamps, deployment/source/evidence hashes and redacted symptoms; never capture secrets.
2. Repoint the storefront domain/routing to the documented known-good target using the merchant's
   approved platform procedure.
3. Purge only affected CDN/application caches and confirm Shopify-hosted checkout/account destinations.
4. Run the minimal smoke suite from multiple networks: home, collection, PDP, cart, checkout handoff,
   redirects, sitemap/robots and tracking receipt.
5. Confirm DNS propagation and error/conversion recovery through the measured observation window.
6. Communicate actual impact and recovery time. Revoke temporary access and end the change window.
7. Open a fresh remediation change. Never roll forward during the incident without new evidence and
   approval.

The coding agent may prepare evidence and commands for review, but only the named human operator may
execute production rollback.
