# Merchant getting started

This guide is the non-technical handoff for a private downstream migration. The foundation repository
contains no merchant source, assets, credentials or generated storefront. Complete these steps in the
merchant's private copy.

## What you need

- The permanent `your-store.myshopify.com` domain and current public storefront URL.
- A Shopify staff role that can manage sales channels.
- The published theme exported as a directory or `.zip`, plus the right to use its theme, fonts, media
  and app assets for this migration.
- Node 24 and pnpm 11.5.0.
- A private Git repository for the generated storefront.

Do not begin by creating an Admin app. The credential-free report should establish that the store is a
reasonable headless candidate first.

## 1. Create the runtime Storefront token

In Shopify admin, open the **Headless** sales channel (add/pin it if necessary), choose **Add storefront**,
and give the storefront a recognizable name. The Headless channel creates public/private Storefront API
access. Shopify documents this flow in
[Manage the Headless channel](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/manage-headless-channels).

Use the public token for `PUBLIC_STOREFRONT_API_TOKEN`. It is designed for public storefront access, but
still belongs in environment configuration rather than source control. Token-based Storefront access is
required for menus, tags, metafields and metaobjects; Shopify's authentication distinctions are in the
[Storefront API reference](https://shopify.dev/docs/api/storefront).

The private Headless token is optional. Add `PRIVATE_STOREFRONT_API_TOKEN` only if the storefront needs
trusted buyer-context behavior such as Shopify URL redirect lookup. Never reuse the public token in the
private variable. Rotate private tokens from the Headless channel when access changes.

Copy the sanitized example and fill only the required values:

```bash
cp .env.example .env.local
pnpm storefront:doctor
```

The doctor proves the exact API version and bounded catalogue/content read contract. Its report never
contains the token, Shopify response bodies or merchant content. Resolve every failed check before the
first build.

## 2. Export the published theme

Export the theme that is actually live—not a stale development copy. Keep it outside this repository or
inside an ignored merchant-only source directory. The migration inventory reads it without executing
Liquid, scripts, hooks or archive entries; ZIP files are never extracted.

A directory with local Git metadata must be a clean, normal checkout at one exact commit. Worktrees,
submodules, nested repositories, object alternates and executable attribute filters are refused. Hooks,
credential helpers, LFS smudge and network access are unavailable to the inspection command. Commit or
remove unrelated dirty/ignored files first, or use a Shopify-exported ZIP. The source identity is checked
again before the public crawl; if it changed, start a new run so evidence from different source versions
cannot be mixed.

Confirm rights before ingestion. This assertion is downstream-only and does not grant permission to
publish the theme or its assets in the starter:

```bash
pnpm migrate doctor \
  --store-url https://shop.example \
  --theme-source /absolute/path/to/published-theme.zip \
  --theme-rights-confirmed \
  --new-run
```

Open `reports/theme-rights-inventory-v1.json` in the new ignored run. Resolve every listed item using its
generated `id`; approve it only for this downstream storefront after checking ownership/license/app
terms, or exclude it and plan a replacement:

```bash
pnpm migrate rights \
  --item font-file-0123456789abcdef \
  --status approved-downstream \
  --basis license-reviewed \
  --summary "Merchant confirmed the storefront font license"

pnpm migrate rights \
  --item client-script-file-fedcba9876543210 \
  --status excluded \
  --basis excluded-from-migration \
  --summary "Replace this theme script with a native primitive"
```

The command rejects bulk approval, binds each outcome to the exact theme source/manifest, never grants
foundation redistribution and leaves reconstruction review open until all items are resolved. These are
local review records, not signed launch approvals.

Migration state uses monotonic revisions and a single-writer lock; an agent resuming from stale context
must run `pnpm migrate resume --json` instead of overwriting newer work. The redacted ledger is bounded
and hash-chained to expose edits, but because it lives in the agent-writable run it is evidence—not
cryptographic human authorization.

Foundation-owned runtime, migration and skill contracts are content-addressed when a run starts. A later
foundation update does not discard the theme/public captures, but it blocks ordinary commands until
`pnpm migrate resume --json` records the changed paths and resets reconstruction, verification and
review. Merchant-owned recipe/component/asset paths are outside this identity.

## 3. Generate the credential-free migration model

```bash
pnpm migrate capability --json
pnpm migrate snapshot --max-pages 100 --json
pnpm migrate status --json
pnpm migrate review
```

Review these ignored artifacts before allowing an agent to rebuild pages:

- `snapshots/public-v1.json` — bounded public route/content metadata;
- `snapshots/theme-inventory-v1.json` — hashes, immutable archive/Git identity, safe JSON structure and
  brand observations;
- `reports/theme-rights-inventory-v1.json` — every observed font, media, client-script and app-output
  licensing risk. It contains references and hashes, not raw assets; every item remains unresolved until
  the merchant reviews its ownership/license and permitted downstream use;
- `reports/theme-rights-status-v1.json` — source-bound resolved/unresolved totals from per-item `rights`
  decisions;
- `model/reconstruction-plan-v1.json` — route/section candidates and explicit unknowns;
- `model/capture-manifest-v1.json` — required source/preview viewports and interaction states;
- `reports/reconstruction-readiness-v1.json` — blockers, review decisions and next actions.
- `snapshots/public/<sha256>.json` — immutable content-addressed public captures;
- `reports/source-drift-v1.json` — baseline/unchanged/changed comparison and affected routes;
- `reports/decision-validity-v1.json` — source-bound review decisions that remain current or became stale;
- `review/index.html` — script-free, CSP-locked local report with grouped mappings, filters, decisions,
  artifact integrity and provenance. It contains no raw scraped HTML and grants no launch authority.

A password gate, unknown revenue route, unknown section or app block is not parity. Resolve it or retain
it as an explicit blocker. The initial `--theme-rights-confirmed` assertion permits bounded source
inspection only; it does not clear the per-item rights review or grant foundation redistribution.

## 4. Migration-only Admin discovery

Do this only after credential-free eligibility passes. New Shopify custom apps are created through the
Dev Dashboard; Shopify no longer lets merchants create a legacy custom app and copy a new token from the
admin. New apps obtain tokens through the client-credentials flow. See Shopify's
[custom app token guidance](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin).

The eventual broker requests only read scopes required by observed capabilities. A typical baseline is
`read_products`, `read_content`, `read_themes` and `read_metaobjects`; publication, market, translation or
file scopes are conditional. `read_customers`, `read_orders`, payment, fulfillment and every write scope
are prohibited. The broker must inspect the actually granted scopes, reject extras, keep credentials in
the OS keychain and return only allowlisted discovery results.

The current alpha specifies this broker boundary but does not ship an in-repository Admin-token reader.
That is deliberate: repository code is writable by the coding agent and cannot safely custody a
long-lived Admin client secret. Runtime commerce continues using Storefront access after migration-only
Admin access is removed.

## 5. Build, review and cut over

The coding agent maps approved observations to semantic tokens and registered sections in downstream
merchant-owned files. It then runs:

```bash
pnpm migrate verify --production
pnpm browser:test
pnpm lighthouse
```

Browser proof requires source and preview captures from separate credential-free contexts. A migration
decision file records review state only. Deploy, webhook/tracking changes, domain attachment, DNS,
cutover and rollback each require separate current human approval; the migration CLI intentionally has
no command for them.
