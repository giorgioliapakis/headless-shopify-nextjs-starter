# Design-token contract

Merchant styling is a versioned input, not a trail of one-off CSS overrides. The active preset is
`shopConfig.theme`; its schema is `config/schema/theme.ts`, and the neutral example lives in
`config/presets/neutral-theme.ts`.

The three layers are:

1. **Observed evidence** — screenshots, computed styles and theme-source facts stay in the ignored
   migration workspace. They are untrusted evidence, never runtime configuration.
2. **Semantic merchant tokens** — approved colors, typography roles, density, container width, shape
   and motion are copied into a merchant-owned preset and validated at build time.
3. **Component and section variants** — recipes choose bounded layout/tone variants. Source remains
   available when faithful reconstruction needs a downstream-only component.

Theme validation rejects unknown keys, malformed colors and text/background pairs below WCAG 4.5:1.
`themeToCssVariables` applies only semantic CSS variables at the root. It never accepts raw CSS, scripts
or remote font URLs.

The neutral preset uses the platform system stack and downloads no font assets. For a faithful merchant
reconstruction, self-host licensed files with `next/font/local`, expose the generated variables as
`--font-brand-body` and `--font-brand-heading` on the root layout, then select `brand` for the matching
typography roles in the merchant preset. The roles intentionally remain separate because display and
body faces often differ. Missing brand variables fail safely back to the system stack; remote font URLs
are not valid theme input.

## Agent workflow

1. Copy `config/presets/neutral-theme.ts` to a clearly named merchant preset.
2. Translate approved evidence into semantic values; do not paste source CSS wholesale.
3. Import the preset in `shop.config.ts`.
4. Run `pnpm test tests/unit/config/theme-contract.test.ts`, `pnpm check` and `pnpm build`.
5. Verify contrast, focus, reduced motion, mobile and desktop visually before approval.

Only the preset and recipe files are merchant-owned. Foundation components and schemas can receive
upstream fixes without silently overwriting merchant decisions.
