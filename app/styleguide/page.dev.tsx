import type { Metadata } from "next";

import { RegisteredSection, sectionRegistry } from "@/components/sections/registry";
import { Container } from "@/components/ui/container";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { styleguideSectionRecipe } from "@/config/presets/styleguide-sections";
import { getLocale } from "@/lib/params";
import { shopConfig } from "@/shop.config";

import { PrimitiveGallery } from "./primitives";
import { TokenReference } from "./tokens";

export const metadata: Metadata = {
  title: "Styleguide",
  description: "Live reference for the design tokens, primitives and sections in this storefront.",
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "#colors", label: "Colour" },
  { href: "#typography", label: "Type" },
  { href: "#spacing", label: "Spacing" },
  { href: "#shape", label: "Shape" },
  { href: "#motion", label: "Motion" },
  { href: "#primitives", label: "Primitives" },
  { href: "#sections", label: "Sections" },
] as const;

/**
 * The visual surface of the design system, rendered against the live theme.
 *
 * It doubles as a smoke test: every token, every kept primitive and every registered section type
 * renders here, in whichever colour scheme the visitor is in, so a broken token or an orphaned
 * component is visible on one page instead of hiding until a merchant hits it.
 */
export default async function StyleguidePage() {
  const locale = await getLocale();
  const theme = shopConfig.theme;

  return (
    <div className="grid gap-section-gap pb-section">
      <Container className="grid gap-stack py-section">
        <header className="grid gap-stack">
          <div className="flex flex-wrap items-start justify-between gap-stack">
            <div className="grid gap-1.5">
              <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                Styleguide
              </p>
              <h1 className="text-4xl sm:text-5xl">{theme.name} theme</h1>
              <p className="max-w-2xl text-muted-foreground">
                Everything on this page is driven by{" "}
                <code className="font-mono">shopConfig.theme</code> and the section registry. Change
                a token in <code className="font-mono">config/presets/neutral-theme.ts</code> and
                this page moves with it. Excluded from the sitemap and marked{" "}
                <code className="font-mono">noindex</code>.
              </p>
            </div>
            <ThemeToggle />
          </div>
          <nav aria-label="Styleguide sections">
            <ul className="flex flex-wrap gap-inline" role="list">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    className="inline-flex rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    href={item.href}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <TokenReference theme={theme} />

        <section className="grid gap-stack" id="primitives">
          <header className="grid gap-1">
            <h2 className="text-2xl">Primitives</h2>
            <p className="text-sm text-muted-foreground">
              Every component in <code className="font-mono">components/ui</code> that the starter
              keeps, in its default, focus, disabled and error states. Anything not on this page has
              been deleted rather than left unused.
            </p>
          </header>
          <PrimitiveGallery />
        </section>
      </Container>

      <section className="grid gap-stack" id="sections">
        <Container className="grid gap-1">
          <h2 className="text-2xl">Sections</h2>
          <p className="text-sm text-muted-foreground">
            All {styleguideSectionRecipe.sections.length} registered section types with sample
            content, in recipe order.
          </p>
        </Container>
        <div className="grid gap-section-gap">
          {styleguideSectionRecipe.sections.map((section) => {
            const registration = sectionRegistry[section.type];
            return (
              <article key={section.id} className="grid gap-stack border-t pt-section">
                <Container className="grid gap-1.5">
                  <h3 className="font-mono text-sm font-medium">{section.type}</h3>
                  <dl className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="inline font-medium">Anatomy: </dt>
                      <dd className="inline">{registration.anatomy.join(", ")}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">Variants: </dt>
                      <dd className="inline">{registration.variants.join(", ")}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">Data: </dt>
                      <dd className="inline">
                        {registration.dataNeeds.length ? registration.dataNeeds.join(", ") : "none"}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">Client JS: </dt>
                      <dd className="inline">{registration.clientJavaScript ? "yes" : "no"}</dd>
                      <dt className="inline font-medium"> · Cost: </dt>
                      <dd className="inline">{registration.performanceCost}</dd>
                    </div>
                  </dl>
                </Container>
                <RegisteredSection locale={locale} section={section} />
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
