# Foundation work

The loop for any change to this starter.

1. Read `AGENTS.md`. Read the code you are about to change before changing it.
2. Check `/styleguide` and `components/sections/registry.tsx` before building new UI — the
   primitive you need usually already exists.
3. When a pinned skill in `.agents/skills/` covers what you are doing (Hydrogen cart, variant form,
   collection browsing, analytics, React performance, shadcn), read it first.
4. Make the smallest change that fully solves the problem. Add tests proportional to risk:
   a unit test for logic, a contract test for a Shopify operation, a Playwright test for a
   user-visible flow.
5. Run `pnpm check`. For anything touching cart, navigation or a route's rendered output, also run
   `pnpm browser:test`.
6. Update the docs that describe what you changed — `docs/customization/` for design system and
   sections, `docs/compatibility/storefront-capabilities.md` for what the storefront supports.
7. Report honestly: what you changed, what you verified, and anything you left incomplete.
