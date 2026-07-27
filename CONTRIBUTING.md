# Contributing

Thanks for improving the starter. Read `AGENTS.md` first — it describes the architecture and the
invariants, and it applies to humans as well as agents.

## Getting set up

```bash
pnpm install
pnpm dev:demo   # runs the storefront with generated demo data, no Shopify account needed
```

## Before you open a PR

- Run `pnpm check`. It runs types, lint, tests, the Storefront query budget, the supply-chain audit
  and the repository scanner. CI runs the same thing.
- Run `pnpm browser:test` if you changed cart, navigation, or what a route renders. It needs
  `pnpm browser:install` once.
- Add tests proportional to risk. Never update a performance baseline just to make a regression pass.
- In the PR description, say what changed and note any effect on accessibility, performance,
  security, or backward compatibility for people who have already forked the starter.

## House rules

- **Nothing store-specific, ever.** No real merchant names, domains, copy, product data, imagery,
  theme exports or credentials. The repository scanner in `pnpm check` fails on tracked secrets and
  on binary assets that are not in its reviewed allowlist. Demo data must stay generic and generated.
- Keep Shopify as the system of record. Commerce behaviour stays typed, bounded and tested.
- Use the existing primitives: Server Components, `components/ui` on Base UI, registered sections,
  and semantic theme tokens. No second component library, no hardcoded colours.
- Pin dependencies and GitHub Actions by exact version or SHA. Preserve licence and attribution
  requirements — new third-party material must be added to `NOTICE`.
- A new integration starts as an optional, documented pack with a real consumer. It does not become
  a core promise from a provider stub.

By participating you agree to the Code of Conduct. Report security issues privately per
`SECURITY.md` — never in a public issue.
