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

## Agent workflow

1. Copy `config/presets/neutral-theme.ts` to a clearly named merchant preset.
2. Translate approved evidence into semantic values; do not paste source CSS wholesale.
3. Import the preset in `shop.config.ts`.
4. Run `pnpm test tests/unit/config/theme-contract.test.ts`, `pnpm check` and `pnpm build`.
5. Verify contrast, focus, reduced motion, mobile and desktop visually before approval.

Only the preset and recipe files are merchant-owned. Foundation components and schemas can receive
upstream fixes without silently overwriting merchant decisions.
