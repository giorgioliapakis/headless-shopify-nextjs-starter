# Getting started

## Prerequisites

Node 24 and pnpm 11.5.0. Nothing else — you do not need a Shopify account to run the storefront.

## Try it with no account

```bash
pnpm install
pnpm dev:demo
```

This runs the storefront against a generated demo catalogue: products with real variants and options,
collections with working filters, blog articles, menus and policies. Nothing leaves your machine and no
credentials are involved.

Worth visiting first:

- `/` — the default home recipe
- `/collections/all` — filters, sorting and pagination
- `/products/...` — variant selection and add to cart
- `/styleguide` — every design token, UI primitive and page section rendered live

Demo mode refuses to activate against a real store domain or a real token, so you cannot accidentally
serve fake data to real shoppers.

## Connect your Shopify store

### 1. Create a Storefront API token

In Shopify admin, add the **Headless** sales channel, choose **Add storefront**, and name it. The channel
issues a **public** Storefront API access token — that is the one you want. Shopify documents the flow in
[Manage the Headless channel](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/manage-headless-channels).

The public token is designed to be readable by browsers, but still keep it in environment configuration
rather than source control.

A **private** token is optional. It is only needed for Shopify URL-redirect lookup and trusted
buyer-context requests, and it is used server-side only. Never put a private token in a
`PUBLIC_*` variable.

### 2. Configure the environment

```bash
cp .env.example .env.local
```

Set:

| Variable                      | What                                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| `PUBLIC_STORE_DOMAIN`         | `your-store.myshopify.com` — the permanent domain, not your custom one |
| `PUBLIC_STOREFRONT_API_TOKEN` | The public Storefront API token                                        |
| `NEXT_PUBLIC_SITE_NAME`       | Your store's display name                                              |

`.env.local` is gitignored. The repository scanner in `pnpm check` fails the build if a dotenv file is
ever committed.

### 3. Verify before you build

```bash
pnpm storefront:doctor
```

This checks that the domain resolves, the token authenticates, and the API version is one this starter
supports. The report is redacted — it never prints your token or the Shopify response body.

### 4. Run it

```bash
pnpm dev
```

## Make it yours

`shop.config.ts` is the file you edit. It holds:

- `site` — name, base URL, social links
- `navigation` — header and footer menus. Set your Shopify menu handles and it reads your store's own
  navigation; the static arrays are the fallback.
- `theme` — the token set: colour (light and dark), typography, spacing, radius, motion. Contrast is
  validated against WCAG at config time, so an unreadable palette fails fast rather than shipping.
- `recipes.home` / `recipes.landing` — the ordered page sections each page is composed from
- `pdp` — related products, complementary products and bundles

See [design tokens](customization/design-tokens.md) and [sections](customization/sections.md).

## Deploy

The storefront is a standard Next.js application. On Vercel, import the repository and set the same
environment variables you put in `.env.local`. `NEXT_PUBLIC_BASE_URL` defaults to your Vercel production
URL; set it explicitly once you have a custom domain so sitemaps and OG tags are absolute and correct.

The production build reads your catalogue at build time, so valid Storefront credentials must be present
in the deployment environment. It will not silently substitute demo products.

Before you point real traffic at it, run the gates and read
[performance budgets](performance/budgets.md) — the demo baseline is not your storefront's baseline.

```bash
pnpm check
pnpm browser:install   # once
pnpm browser:test
pnpm lighthouse
```

## Migrating from a Shopify theme

There is no migration command, and that is deliberate. The practical path is:

1. Get this starter running against your store, so your real catalogue, cart and checkout work.
2. Set your brand into `shop.config.ts` — theme tokens first, then navigation.
3. Rebuild your theme's pages as section recipes, adding new sections to `components/sections/` where
   the registry does not already cover a layout.
4. Point a coding agent at the repo for the long tail. `AGENTS.md` and `.agents/skills/` give it the
   architecture and version-matched Shopify guidance it needs.

Keep your existing theme live until the new storefront passes your own review. Shopify remains the system
of record throughout, so there is no data migration to perform — only presentation.
