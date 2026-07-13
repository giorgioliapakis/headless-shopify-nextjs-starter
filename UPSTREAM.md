# Upstream provenance

The storefront runtime is derived from the MIT-licensed `apps/template` subtree of
[`vercel/shop`](https://github.com/vercel/shop) at the immutable commit
`04a29f8276598e58ec28e74218f38601f6203470`.

Run `node scripts/upstream/import.mjs` to reproduce the allowlisted import and
`node scripts/upstream/verify.mjs` to verify every imported file against its recorded source checksum.
The complete machine-readable manifest is `docs/provenance/vercel-shop.json`.

The import deliberately excludes the customer-facing AI assistant, headless customer accounts, their
supporting authentication/customer code, upstream binary branding, and a small set of composition files
that this starter owns. Exclusion is a product boundary, not a claim that those upstream features are
defective. Upstream files subsequently adapted by this project must retain both source and current
checksums in the provenance manifest.

The upstream template's MIT license is preserved in its source repository. This project's MIT license
and this notice must remain with redistributed copies.
