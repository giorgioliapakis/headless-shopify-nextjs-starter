# Design tokens

Theming is a typed, validated input — not a trail of one-off CSS overrides. The active theme is
`shopConfig.theme`, its contract is `config/schema/theme.ts`, and the shipped example is
`config/presets/neutral-theme.ts`.

Run `pnpm dev:demo` and open **`/styleguide`** to see the entire system rendered against your live
theme: every colour token with its computed contrast ratio, the type scale, the rhythm scale, radii,
motion, every UI primitive in each of its states, and all 13 page sections.

## What the contract covers

**Colour.** 25 semantic tokens, declared twice — once for `colors.light`, once for `colors.dark`:

| Group    | Tokens                                                                             |
| -------- | ---------------------------------------------------------------------------------- |
| Page     | `background`, `foreground`                                                         |
| Surfaces | `card`, `popover`, `secondary`, `muted`, `accent`, `input` (+ their `*Foreground`) |
| Action   | `primary`, `primaryForeground`                                                     |
| Status   | `destructive`, `positive`, `info` (+ their `*Foreground`)                          |
| Chrome   | `border`, `ring`                                                                   |
| Scrim    | `overlay`, `overlayForeground`                                                     |

The rule that keeps this honest: **if a token is not in the schema it must not appear in
`app/globals.css`, and if it appears there it must be in the schema.** A test enforces the match, so
a component can never reach for a colour a merchant cannot set.

**Typography.** `typography.body`, `typography.heading` and `typography.scale`.

**Rhythm.** `layout.density` drives five named steps exposed as Tailwind keys — `px-gutter`,
`py-section`, `gap-section-gap`, `gap-stack`, `gap-inline`. Use these instead of ad-hoc padding.

**Shape and motion.** `shape.radius`, `shape.borderWidth`, `motion.duration`. Motion feeds Tailwind's
default transition duration, so `motion.duration: "none"` genuinely stills the storefront, and a
global `prefers-reduced-motion` policy applies on top.

## Validation

Invalid themes fail at config time rather than shipping a broken storefront. `themeToCssVariables`
emits semantic CSS variables only — never raw CSS, scripts or remote font URLs.

- **Text pairs ≥ 4.5:1** (WCAG 2.2 AA body text) across all 11 fill/ink pairs.
- **Surfaces within 3:1 of the background.** This is the one that catches the classic mistake: a dark
  `background` with near-white `card`, `accent` and `input` left untouched. Each offending token is
  reported by path.
- **Focus ring ≥ 3:1** against the background (WCAG 1.4.11), and `border` within a 1.2–3 band.
- Unknown keys and malformed colours are rejected outright.

## Dark mode

Three layers, applied in order: the light palette is the base, `prefers-color-scheme` switches it, and
an explicit `data-theme` attribute on `<html>` overrides both. A small pre-paint script sets the
attribute before first paint, so there is no flash and no hydration mismatch. With JavaScript
disabled the media query still works.

`components/ui/theme-toggle.tsx` is a ready light/dark/system control. It is mounted on `/styleguide`;
add it to your header or footer with a one-line import if you want it in the storefront.

## Fonts

The default preset uses the platform system stack and downloads nothing.

To use your own faces, self-host the licensed files with `next/font/local`, expose the generated
variables as `--font-brand-body` and `--font-brand-heading` on the root layout, then set the matching
typography roles to `brand`. Body and heading stay separate because display and text faces usually
differ. Missing brand variables fall back safely to the system stack. Remote font URLs are not valid
theme input.

## Changing the theme

1. Copy `config/presets/neutral-theme.ts` to your own preset and edit the values.
2. Import it in `shop.config.ts`.
3. `pnpm dev:demo`, open `/styleguide`, and check both colour schemes.
4. `pnpm check` — the contrast gates run as part of it.

Only your preset and recipe files are yours. The components and schemas can take upstream fixes
without overwriting your decisions.
