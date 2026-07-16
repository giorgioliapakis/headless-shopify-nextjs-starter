# Performance runbook

Run `pnpm check` for source/query budgets and `pnpm verify:production` for the secretless neutral build
plus emitted asset budgets. The production verifier strips credential-like environment values and uses
only the explicit neutral Storefront fixture.

When a budget fails, inspect the exact reported document, asset or chunk before changing a limit. A limit
change needs a measured user benefit, alternatives considered, owner, expiry and removal condition. After
interactive browser tooling is authorized, run the required route matrix in
`config/performance-budgets.json`, archive machine-readable Lighthouse/network/axe results and compare the
merchant build separately from the neutral foundation baseline.

Do not use the neutral score to approve merchant fonts, imagery or third-party scripts. Re-run after any
change to theme tokens, recipe order, LCP media, analytics, app integrations, Hydrogen or Next.js.
