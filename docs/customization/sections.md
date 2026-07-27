# Sections and recipes

Pages are assembled from **sections**. A _recipe_ is an ordered, validated list of them.
`shopConfig.recipes.home` builds the homepage; `shopConfig.recipes.landing` builds any number of
landing pages served at `/landing/[handle]`.

Recipes carry content and layout only. Commerce data stays in the shared Shopify operations, so a
recipe can never reach around the caching or security layers.

## The registry

`components/sections/registry.tsx` is the source of truth. Each entry declares its anatomy, variants,
data needs, accessibility contract, client-JavaScript cost and owner — which is what lets a coding
agent compose a page without inventing markup.

Global layout slots: `header`, `footer`.

Page sections: `announcement`, `banner`, `hero`, `rich-text`, `media-text`, `logo-list`,
`collection-grid`, `product-carousel`, `editorial-grid`, `testimonials`, `faq`, `newsletter`,
`trust-strip`.

Every section is a Server Component with one deliberate exception: `banner` sets
`clientJavaScript: true` because video autoplay requires it. FAQ interaction uses native `<details>`.
A disabled section renders nothing.

See them all rendered at **`/styleguide`**, with their registry metadata.

## Writing a recipe

```ts
recipes: {
  home: {
    version: 1,
    sections: [
      { id: "hero", type: "hero", headline: "…", action: { label: "Shop", href: "/collections/all" } },
      { id: "featured", type: "product-carousel", collectionHandle: "new-arrivals" },
    ],
  },
}
```

Validation is strict and fails with a schema path. Unknown types, duplicate IDs, external values in
internal-link fields, and invalid section-specific values are all rejected at config time.

Internal links must start with `/`. Local media must live under your project's public assets — never
commit unlicensed imagery to this repository.

## Landing pages

Add an entry to `shopConfig.recipes.landing` with a lowercase handle, metadata and an indexing choice.
The starter serves it at `/landing/[handle]`, includes indexable entries in the sitemap, and hard-404s
unknown handles.

To keep an existing URL that does not fit the `/landing/` prefix, add your own route that renders the
same recipe. Do not redirect a revenue URL just to fit the generic path.

## Adding a section

1. Add its schema to `config/schema/sections.ts`.
2. Add the component to `components/sections/`.
3. Register it in `components/sections/registry.tsx` with complete metadata.
4. Add it to a recipe so it is actually exercised — a test asserts that the shipped recipes cover
   every registered type.
5. `pnpm check`, then look at it in `/styleguide`.

## Newsletter

The newsletter section stays inert until you configure a provider endpoint. Enabling one also requires
adding that exact origin to the CSP `form-action` allowlist in `lib/security/headers.ts` and rerunning
`pnpm check` and `pnpm browser:test`.
