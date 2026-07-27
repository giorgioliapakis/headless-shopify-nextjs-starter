# Documentation

## Using the storefront

- [Getting started](getting-started.md) — connect your Shopify store and run it locally
- [What's supported](compatibility/storefront-capabilities.md) — every route and capability, and
  what is deliberately handed off to Shopify
- [Hydrogen and this starter](compatibility/hydrogen.md) — why this is Next.js using the Hydrogen
  SDK as a library, not the Hydrogen framework

## Customizing

- [Design tokens](customization/design-tokens.md) — the theme contract, colour, type, spacing,
  motion and dark mode
- [Sections and recipes](customization/sections.md) — composing home and landing pages from
  registered sections

Run `pnpm dev:demo` and open `/styleguide` to see the whole design system rendered live.

## Operating

- [Performance budgets](performance/budgets.md) — the targets, and how to run the gates
- [Degraded Shopify](runbooks/degraded-shopify.md) — what to do when the Storefront API is unhealthy
- [Hydrogen upgrades](runbooks/hydrogen-upgrade.md) — bumping the pinned Hydrogen SDK

## Architecture decisions

- [0001 — Platform baseline](adr/0001-platform-baseline.md)
- [0002 — Hydrogen preview adoption](adr/0002-hydrogen-preview-adoption.md)
- [0003 — Cache and request lifecycle](adr/0003-cache-and-request-lifecycle.md)

## Provenance

`provenance/` holds the machine-readable manifests for the upstream code this starter is derived
from. Attribution for all of it is in [`NOTICE`](../NOTICE).

## Contributing

See [`CONTRIBUTING.md`](../CONTRIBUTING.md), and [`AGENTS.md`](../AGENTS.md) for the architecture
rules that apply to humans and coding agents alike.
