# Section recipes

The homepage is assembled from `shopConfig.recipes.home`. Recipes are versioned, strict and contain
only content/layout data; commerce stays in the shared operations and Hydrogen layers.

The registry at `components/sections/registry.tsx` documents each section's anatomy, variants, data
needs, accessibility contract, client-JavaScript cost and source owner. The neutral registry includes:

- announcement, header, hero, rich text and media/text;
- logo list, collection grid, product carousel and editorial grid;
- testimonials, FAQ, newsletter, trust strip and footer.

Header and footer occupy the global layout slot. The other entries can appear in a page recipe. Disabled
sections render nothing. Every shipped recipe section is a Server Component; native HTML provides FAQ
interaction, and the newsletter form remains inert until an approved provider endpoint is configured.
Enabling an external newsletter endpoint also requires adding that exact origin to the CSP `form-action`
allowlist in `lib/security/headers.ts` and rerunning the security/browser gates.

## Reconstruction rules

- Map a discovered source section to a registered section when anatomy and behavior match.
- Preserve approved order, text, links, responsive precedence and media crop in the downstream recipe.
- Keep an unmatched pattern in the downstream storefront as a one-off section. Record why it did not
  match; do not weaken a generic registry entry to force parity.
- Promote a new foundation section only after the pattern repeats across independent stores.

## Landing-page recipes

Add approved performance/editorial pages to `shopConfig.recipes.landing` using a lowercase handle,
metadata, indexing choice and the same validated section recipe used by the homepage. The foundation
serves them at `/landing/[handle]`, includes indexable entries in the static sitemap shard and hard-404s
unknown handles. Preserve a different existing merchant URL by creating a merchant-owned route that
renders the same recipe; do not redirect an approved revenue URL merely to fit the generic prefix.

- Store approved local media under the downstream project's public assets. Do not commit source capture
  files or unlicensed merchant assets to this starter.

Unknown types, duplicate IDs, external internal-link values and invalid section-specific values fail
with a schema path. Run the registry/theme unit tests, full check, production build and browser gallery
before accepting a recipe.
