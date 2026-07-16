# Contributing

Thank you for improving the foundation. Read `AGENTS.md`, `CLEAN_ROOM.md`, the active plan and the earliest
eligible `docs/TASKS.md` item first.

- Never contribute merchant names, domains, copy, assets, screenshots, theme exports, migration evidence,
  credentials or copied merchant Git history.
- Keep Shopify/commerce behavior typed, bounded and covered by deterministic tests. Prefer Server
  Components, registered sections, semantic tokens and source-owned Base UI primitives.
- New integrations begin as conditional downstream packs with a concrete consumer; they do not become
  core promises from a provider stub.
- Pin dependencies and GitHub Actions. Preserve license, provenance and generated-schema boundaries.
- Add focused tests, run `pnpm check`, and run `pnpm verify:production` when runtime or asset output can
  change. Never update a performance baseline merely to make a regression pass.
- Explain capability, security, accessibility, performance and backward-compatibility effects in the PR.

By participating, you agree to the Code of Conduct. Security issues must follow `SECURITY.md`, not a
public issue.
