import { Badge } from "@/components/ui/badge";
import {
  contrastRatio,
  PALETTE_VARIABLE_NAMES,
  RHYTHM,
  SURFACE_CONTRAST_MAXIMUM,
  SURFACE_TOKENS,
  TEXT_CONTRAST_MINIMUM,
  TEXT_CONTRAST_PAIRS,
  type ColorScheme,
  type Palette,
  type PaletteToken,
  type ThemeConfig,
} from "@/config/schema/theme";
import { cn } from "@/lib/utils";

const FOREGROUND_OF = new Map<PaletteToken, PaletteToken>(TEXT_CONTRAST_PAIRS);
const SURFACE_SET = new Set<PaletteToken>(SURFACE_TOKENS);

function ratioLabel(value: number): string {
  return `${value.toFixed(2)}:1`;
}

/**
 * A swatch that paints itself from the *literal* palette value rather than the CSS variable, so the
 * light table stays light and the dark table stays dark whichever scheme the page is viewed in.
 * That is the point: the styleguide is where you check both palettes at once.
 */
function Swatch({ palette, token }: { palette: Palette; token: PaletteToken }) {
  const value = palette[token];
  const foregroundToken = FOREGROUND_OF.get(token);
  const ink = foregroundToken ? palette[foregroundToken] : palette.foreground;
  const pairRatio = foregroundToken ? contrastRatio(value, ink) : undefined;
  const backgroundRatio = contrastRatio(palette.background, value);
  const isSurface = SURFACE_SET.has(token);

  return (
    <li className="grid gap-1.5">
      <div
        className="grid min-h-20 content-end rounded-lg border p-3 text-sm"
        style={{ backgroundColor: value, borderColor: palette.border, color: ink }}
      >
        <span className="font-medium">{token}</span>
      </div>
      <dl className="grid gap-0.5 text-xs text-muted-foreground">
        <div className="flex justify-between gap-inline">
          <dt>{PALETTE_VARIABLE_NAMES[token]}</dt>
          <dd className="font-mono tabular-nums">{value}</dd>
        </div>
        {pairRatio !== undefined && foregroundToken ? (
          <div className="flex justify-between gap-inline">
            <dt>vs {foregroundToken}</dt>
            <dd
              className={cn(
                "font-mono tabular-nums",
                pairRatio >= TEXT_CONTRAST_MINIMUM ? "text-positive" : "text-destructive",
              )}
            >
              {ratioLabel(pairRatio)}
            </dd>
          </div>
        ) : null}
        {isSurface ? (
          <div className="flex justify-between gap-inline">
            <dt>vs background</dt>
            <dd
              className={cn(
                "font-mono tabular-nums",
                backgroundRatio <= SURFACE_CONTRAST_MAXIMUM ? "text-positive" : "text-destructive",
              )}
            >
              {ratioLabel(backgroundRatio)}
            </dd>
          </div>
        ) : null}
      </dl>
    </li>
  );
}

function PaletteTable({ palette, scheme }: { palette: Palette; scheme: ColorScheme }) {
  const tokens = Object.keys(PALETTE_VARIABLE_NAMES) as PaletteToken[];
  return (
    <section className="grid gap-stack" aria-label={`${scheme} palette`}>
      <h3 className="text-lg font-medium capitalize">{scheme} palette</h3>
      <ul className="grid gap-stack sm:grid-cols-3 lg:grid-cols-4" role="list">
        {tokens.map((token) => (
          <Swatch key={token} palette={palette} token={token} />
        ))}
      </ul>
    </section>
  );
}

const TYPE_STEPS = [
  { className: "text-7xl", label: "text-7xl" },
  { className: "text-6xl", label: "text-6xl" },
  { className: "text-5xl", label: "text-5xl" },
  { className: "text-4xl", label: "text-4xl" },
  { className: "text-3xl", label: "text-3xl" },
  { className: "text-2xl", label: "text-2xl" },
  { className: "text-xl", label: "text-xl" },
  { className: "text-lg", label: "text-lg" },
  { className: "text-base", label: "text-base" },
  { className: "text-sm", label: "text-sm" },
  { className: "text-xs", label: "text-xs" },
  { className: "text-xxs", label: "text-xxs" },
] as const;

const RHYTHM_STEPS = [
  { name: "gutter", usage: "px-gutter — page inset", variable: "--spacing-gutter" },
  { name: "section", usage: "py-section — inside a band", variable: "--spacing-section" },
  { name: "gap", usage: "gap-section-gap — between bands", variable: "--spacing-section-gap" },
  { name: "stack", usage: "gap-stack — between blocks", variable: "--spacing-stack" },
  { name: "inline", usage: "gap-inline — between controls", variable: "--spacing-inline" },
] as const;

const RADII = [
  { className: "rounded-sm", label: "rounded-sm" },
  { className: "rounded-md", label: "rounded-md" },
  { className: "rounded-lg", label: "rounded-lg" },
  { className: "rounded-xl", label: "rounded-xl" },
  { className: "rounded-full", label: "rounded-full" },
] as const;

export function TokenReference({ theme }: { theme: ThemeConfig }) {
  const rhythm = RHYTHM[theme.layout.density];

  return (
    <div className="grid gap-section">
      <section className="grid gap-stack" id="colors">
        <header className="grid gap-1">
          <h2 className="text-2xl">Colour tokens</h2>
          <p className="text-sm text-muted-foreground">
            Every semantic colour in the contract, with the contrast ratio the Zod schema enforces.
            Text pairs must clear {TEXT_CONTRAST_MINIMUM}:1; surfaces must stay within{" "}
            {SURFACE_CONTRAST_MAXIMUM}:1 of the background so a dark theme cannot leave white cards
            behind.
          </p>
        </header>
        <PaletteTable palette={theme.colors.light} scheme="light" />
        <PaletteTable palette={theme.colors.dark} scheme="dark" />
      </section>

      <section className="grid gap-stack" id="typography">
        <header className="grid gap-1">
          <h2 className="text-2xl">Type scale</h2>
          <p className="text-sm text-muted-foreground">
            Scale multiplier <code className="font-mono">{theme.typography.scale}</code>. Headings
            tighten their tracking as they grow.
          </p>
        </header>
        <ul className="grid gap-3 border-y py-5" role="list">
          {TYPE_STEPS.map((step) => (
            <li key={step.label} className="flex flex-wrap items-baseline gap-inline">
              <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                {step.label}
              </span>
              <span className={cn("truncate", step.className)}>Grid, gutter, rhythm</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-stack" id="spacing">
        <header className="grid gap-1">
          <h2 className="text-2xl">Spacing and rhythm</h2>
          <p className="text-sm text-muted-foreground">
            Five named steps, all driven by <code className="font-mono">layout.density</code> (
            currently <Badge variant="secondary">{theme.layout.density}</Badge>).
          </p>
        </header>
        <ul className="grid gap-3" role="list">
          {RHYTHM_STEPS.map((step) => (
            <li key={step.name} className="flex flex-wrap items-center gap-inline">
              <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                {step.name}
              </span>
              <span
                aria-hidden
                className="h-4 rounded-sm bg-primary"
                style={{ width: `var(${step.variable})` }}
              />
              <span className="font-mono text-xs tabular-nums">
                {rhythm[step.name as keyof typeof rhythm]}
              </span>
              <span className="text-xs text-muted-foreground">{step.usage}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-stack" id="shape">
        <header className="grid gap-1">
          <h2 className="text-2xl">Radii and hairlines</h2>
          <p className="text-sm text-muted-foreground">
            Radius <code className="font-mono">{theme.shape.radius}</code>, border width{" "}
            <code className="font-mono">{theme.shape.borderWidth}</code>. Border width is wired into
            every unqualified <code className="font-mono">border</code> utility.
          </p>
        </header>
        <ul className="flex flex-wrap gap-stack" role="list">
          {RADII.map((radius) => (
            <li key={radius.label} className="grid justify-items-center gap-1.5">
              <span aria-hidden className={cn("block size-16 border bg-card", radius.className)} />
              <span className="font-mono text-xs text-muted-foreground">{radius.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-stack" id="motion">
        <header className="grid gap-1">
          <h2 className="text-2xl">Motion</h2>
          <p className="text-sm text-muted-foreground">
            <code className="font-mono">motion.duration: {theme.motion.duration}</code> feeds
            Tailwind&rsquo;s <code className="font-mono">--default-transition-duration</code>, so
            every <code className="font-mono">transition-*</code> utility in the tree follows it. A
            global <code className="font-mono">prefers-reduced-motion</code> rule collapses all of
            it.
          </p>
        </header>
        <p className="text-sm">
          Hover the swatch: it uses a bare <code className="font-mono">transition-colors</code> with
          no duration of its own.
        </p>
        <span
          aria-hidden
          className="inline-flex h-12 w-40 items-center justify-center rounded-lg border bg-card transition-colors hover:bg-accent"
        >
          <span className="text-sm text-muted-foreground">hover me</span>
        </span>
      </section>
    </div>
  );
}
