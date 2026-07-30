# Headless Shopify Next.js Starter

A production-shaped headless Shopify storefront on Next.js 16 — every standard page type, a themed
design system, and a demo mode that runs without a Shopify account.

Point it at your store, or hand it to a coding agent and let it build.

```bash
git clone https://github.com/giorgioliapakis/headless-shopify-nextjs-starter
cd headless-shopify-nextjs-starter
pnpm install
pnpm dev:demo
```

That runs the full storefront on generated demo data — no credentials, no Shopify account. Open
[localhost:3000](http://localhost:3000) to browse it, and `/styleguide` to see the design system.

## What you get

- **Every Shopify page type**: home, product, collection, collection list, search, cart, blog,
  article, content pages, policies, landing pages, 404 — each with metadata, JSON-LD, error and
  empty states.
- **A real conversion path**: a cart with lines, quantities, discounts, notes and selling plans, an
  accessible drawer with optimistic updates, Shop Pay, predictive search with Shopify attribution,
  and hosted Shopify checkout. Adding to cart works with JavaScript disabled.
- **A design system you can retheme from one file** — semantic tokens for colour, type, spacing,
  radius and motion, with light and dark mode and WCAG contrast validated at config time.
- **Composable page sections** — a registry of typed, server-rendered sections that home and landing
  pages are built from, so an agent can assemble pages without inventing markup.
- **SEO and agent surfaces** — `robots.txt`, sharded sitemaps, `llms.txt`, dynamic OG images, and
  markdown representations of products, collections and search.
- **Performance and accessibility enforced, not aspired to** — Storefront query budgets, bundle
  budgets, Lighthouse runs, and Playwright + axe across desktop, mobile and JavaScript-disabled,
  all failing CI when they slip; types, lint, unit and contract tests and supply-chain audits ride
  the same `pnpm check` gate.
- **Pinned agent skills** for Hydrogen, React performance and shadcn, in `.agents/skills/`.

Built on Next.js 16 (App Router, Server Components, Cache Components), React 19, Tailwind CSS 4,
shadcn source-owned components on Base UI, and Shopify's framework-agnostic Hydrogen SDK.

## Connect your Shopify store

1. In Shopify admin, install the **Headless** sales channel and create a storefront. Copy the
   public Storefront API access token.
2. Configure the environment:

   ```bash
   cp .env.example .env.local
   ```

   Set `PUBLIC_STORE_DOMAIN` to `your-store.myshopify.com` and `PUBLIC_STOREFRONT_API_TOKEN` to the
   public token. The public token is safe in the browser by design.

3. Verify the connection. The report is redacted and never prints your token:

   ```bash
   pnpm storefront:doctor
   ```

4. Run it:

   ```bash
   pnpm dev
   ```

Then edit `shop.config.ts` — that's the one file that holds your store's name, navigation, theme and
page recipes.

Full walkthrough: [docs/getting-started.md](docs/getting-started.md).

## Customize

| I want to…                               | Go to                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Change colours, type, spacing, dark mode | `shop.config.ts` → `theme`, see [design tokens](docs/customization/design-tokens.md) |
| Rearrange the homepage                   | `shop.config.ts` → `recipes.home`, see [sections](docs/customization/sections.md)    |
| Add a landing page                       | `shop.config.ts` → `recipes.landing`                                                 |
| Change navigation                        | `shop.config.ts` → `navigation`, or let it read your Shopify menus                   |
| Add a UI primitive                       | `components/ui/` — source-owned, edit in place                                       |
| Add a Storefront query                   | `lib/shopify/operations/`                                                            |

## What's supported

The [storefront capability contract](docs/compatibility/storefront-capabilities.md) lists every
route and capability with an honest status.

Deliberately handed off to Shopify: **checkout**, **payments** and **customer accounts**. This
starter never touches card data, and links out to Shopify's hosted account pages rather than
rebuilding authentication. Third-party apps (reviews, loyalty, wishlists, subscriptions portals)
need their own adapters — the starter does not ship fake provider-neutral UI that silently drops
those contracts.

## Working with coding agents

`AGENTS.md` is the instruction source, and it is read automatically by Claude Code, Codex and other
agent hosts. It describes the architecture, the invariants, and where things live. `.agents/skills/`
carries pinned Shopify Hydrogen, React and shadcn skills so an agent gets current, version-matched
guidance instead of guessing.

The practical loop: run `pnpm dev:demo`, point your agent at the repo, and ask for what you want.
`pnpm check` is the gate it should pass before it claims to be done.

## Project status

Young but real. The storefront runtime, design system, demo mode and quality gates work today and
are covered by CI. Expect the API surface of `shop.config.ts` and the section schema to still move
before a 1.0.

The Hydrogen SDK is pinned to a preview build under a dated, reviewed exception — see
[ADR 0002](docs/adr/0002-hydrogen-preview-adoption.md).

## Documentation

Start at [docs/README.md](docs/README.md).

## Contributing

[`CONTRIBUTING.md`](CONTRIBUTING.md). The one hard rule: nothing store-specific ever enters the
repository — no real merchant names, product data, imagery or credentials. `pnpm check` enforces it.

## License

MIT — see [`LICENSE`](LICENSE). Derived from and bundling MIT-licensed work by Vercel, Shopify and
shadcn; attribution in [`NOTICE`](NOTICE).
