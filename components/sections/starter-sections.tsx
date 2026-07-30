import Image from "next/image";
import Link from "next/link";

import { ProductsGrid } from "@/components/product/products-grid";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CardAspect, LocalMedia, SectionDefinition } from "@/config/schema/sections";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SectionOf<T extends SectionDefinition["type"]> = Extract<SectionDefinition, { type: T }>;

function sectionTone(tone: SectionDefinition["tone"]): string {
  if (tone === "muted") return "bg-muted text-foreground";
  if (tone === "contrast") {
    // The contrast tone flips ink and surface, so `text-muted-foreground` inside the band must be
    // remapped too: a mix of the flipped ink over the flipped surface keeps secondary copy muted
    // while staying WCAG AA against `bg-foreground` in both schemes.
    return "bg-foreground text-background [--muted-foreground:color-mix(in_srgb,var(--background)_78%,var(--foreground))]";
  }
  return "bg-background text-foreground";
}

const ASPECTS: Record<Exclude<CardAspect, "none">, string> = {
  landscape: "aspect-[3/2]",
  portrait: "aspect-[4/5]",
  square: "aspect-square",
};

/**
 * Every section band uses the same rhythm tokens (`py-section` inside, `gap-stack` between blocks,
 * `gap-inline` between sibling controls) so `theme.layout.density` moves the whole storefront.
 */
function SectionShell({
  children,
  id,
  tone,
  className,
}: {
  children: React.ReactNode;
  className?: string;
  id: string;
  tone: SectionDefinition["tone"];
}) {
  return (
    <Container id={id} className={cn("py-section", sectionTone(tone), className)}>
      {children}
    </Container>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-3xl sm:text-4xl">{children}</h2>;
}

function CardMedia({ aspect, media }: { aspect: CardAspect; media?: LocalMedia }) {
  if (aspect === "none") return null;
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", ASPECTS[aspect])}>
      {media ? (
        <Image
          src={media.src}
          alt={media.alt}
          fill
          className="object-cover transition-transform group-hover:scale-[1.02]"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      ) : (
        <ImagePlaceholder className="absolute inset-0 size-full" />
      )}
    </div>
  );
}

export function AnnouncementSection({ section }: { section: SectionOf<"announcement"> }) {
  return (
    <section
      id={section.id}
      className={cn("px-gutter py-2.5 text-center text-sm", sectionTone(section.tone))}
    >
      <p>
        {section.message}
        {section.link ? (
          <>
            {" "}
            <Link
              className="font-medium underline underline-offset-4"
              href={section.link.href}
              prefetch={false}
            >
              {section.link.label}
            </Link>
          </>
        ) : null}
      </p>
    </section>
  );
}

export function HeroRecipeSection({ section }: { section: SectionOf<"hero"> }) {
  return (
    <SectionShell
      id={section.id}
      tone={section.tone}
      className="py-[calc(var(--spacing-section)*1.5)]"
    >
      <div
        className={cn(
          "grid gap-stack",
          section.variant === "centered"
            ? "mx-auto max-w-4xl justify-items-center text-center"
            : "max-w-5xl lg:grid-cols-[1fr_auto] lg:items-end",
        )}
      >
        <div className="grid gap-stack">
          {section.eyebrow ? (
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              {section.eyebrow}
            </p>
          ) : null}
          <h1 className="text-4xl font-medium leading-tight sm:text-6xl">{section.heading}</h1>
          {section.body ? (
            <p className="max-w-2xl text-lg text-muted-foreground">{section.body}</p>
          ) : null}
        </div>
        {section.primaryAction || section.secondaryAction ? (
          <div className="flex flex-wrap gap-inline">
            {section.primaryAction ? (
              <Button
                render={<Link href={section.primaryAction.href} prefetch={false} />}
                size="lg"
              >
                {section.primaryAction.label}
              </Button>
            ) : null}
            {section.secondaryAction ? (
              <Button
                render={<Link href={section.secondaryAction.href} prefetch={false} />}
                size="lg"
                variant="outline"
              >
                {section.secondaryAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}

export function RichTextSection({ section }: { section: SectionOf<"rich-text"> }) {
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <div
        className={cn(
          "grid max-w-3xl gap-stack",
          section.align === "center" && "mx-auto text-center",
        )}
      >
        {section.heading ? <SectionHeading>{section.heading}</SectionHeading> : null}
        <p className="whitespace-pre-line text-base leading-7 opacity-80">{section.body}</p>
      </div>
    </SectionShell>
  );
}

export function MediaTextSection({ section }: { section: SectionOf<"media-text"> }) {
  const media = (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
      {section.media ? (
        <Image
          src={section.media.src}
          alt={section.media.alt}
          width={section.media.width}
          height={section.media.height}
          className="size-full object-cover"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      ) : (
        <ImagePlaceholder className="absolute inset-0 size-full" />
      )}
    </div>
  );
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <div className="grid items-center gap-section-gap lg:grid-cols-2">
        {section.mediaPosition === "start" ? media : null}
        <div className="grid gap-stack">
          <SectionHeading>{section.heading}</SectionHeading>
          <p className="leading-7 opacity-80">{section.body}</p>
          {section.action ? (
            <Button
              render={<Link href={section.action.href} prefetch={false} />}
              className="justify-self-start"
            >
              {section.action.label}
            </Button>
          ) : null}
        </div>
        {section.mediaPosition === "end" ? media : null}
      </div>
    </SectionShell>
  );
}

export function LogoListSection({ section }: { section: SectionOf<"logo-list"> }) {
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <div className="grid gap-stack text-center">
        {section.heading ? <h2 className="text-2xl">{section.heading}</h2> : null}
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-stack" role="list">
          {section.logos.map((logo) => (
            <li key={logo} className="text-lg font-medium text-muted-foreground">
              {logo}
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}

export function CollectionGridSection({ section }: { section: SectionOf<"collection-grid"> }) {
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <div className="grid gap-stack">
        <SectionHeading>{section.heading}</SectionHeading>
        <div
          className={cn(
            "grid gap-stack sm:grid-cols-2",
            section.columns === 3 && "lg:grid-cols-3",
            section.columns === 4 && "lg:grid-cols-4",
          )}
        >
          {section.collections.map((collection) => (
            <Link
              key={collection.title}
              href={collection.href ?? "/collections"}
              prefetch={false}
              className={cn(
                "group grid gap-3 rounded-xl transition-transform hover:-translate-y-0.5",
                "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                section.aspect === "none" &&
                  "min-h-56 content-end border bg-card p-6 text-card-foreground",
              )}
            >
              <CardMedia aspect={section.aspect} media={collection.media} />
              <div className="grid gap-1">
                <h3 className="text-xl">{collection.title}</h3>
                {collection.body ? (
                  <p className="text-muted-foreground">{collection.body}</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export async function ProductCarouselSection({
  section,
  locale,
}: {
  locale: Locale;
  section: SectionOf<"product-carousel">;
}) {
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <ProductsGrid
        collectionHandle={section.collectionHandle}
        collectionUrl={`/collections/${section.collectionHandle}`}
        limit={section.limit}
        locale={locale}
        title={section.heading}
      />
    </SectionShell>
  );
}

export function EditorialGridSection({ section }: { section: SectionOf<"editorial-grid"> }) {
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <div className="grid gap-stack">
        <SectionHeading>{section.heading}</SectionHeading>
        <div className="grid gap-stack md:grid-cols-3">
          {section.items.map((item) => (
            <article key={item.title} className="group grid content-start gap-3">
              <CardMedia aspect={section.aspect} media={item.media} />
              <h3 className="text-xl">{item.title}</h3>
              {item.body ? <p className="text-muted-foreground">{item.body}</p> : null}
              {item.href ? (
                <Link
                  href={item.href}
                  prefetch={false}
                  className="font-medium underline underline-offset-4"
                >
                  {section.readMoreLabel}
                  <span className="sr-only">: {item.title}</span>
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function TestimonialsSection({ section }: { section: SectionOf<"testimonials"> }) {
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <div className="grid gap-stack">
        {section.heading ? <SectionHeading>{section.heading}</SectionHeading> : null}
        <div className="grid gap-stack md:grid-cols-3">
          {section.items.map((item) => (
            <figure
              key={`${item.attribution}:${item.quote}`}
              className="grid gap-stack rounded-xl border bg-card p-6 text-card-foreground"
            >
              <blockquote className="text-lg">“{item.quote}”</blockquote>
              <figcaption className="text-sm text-muted-foreground">{item.attribution}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function FaqSection({ section }: { section: SectionOf<"faq"> }) {
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <div className="mx-auto grid max-w-3xl gap-stack">
        <SectionHeading>{section.heading}</SectionHeading>
        <div className="divide-y border-y">
          {section.items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="cursor-pointer font-medium marker:text-muted-foreground">
                {item.question}
              </summary>
              <p className="pt-3 leading-7 text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function NewsletterSection({ section }: { section: SectionOf<"newsletter"> }) {
  const emailId = `${section.id}-email`;
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <div className="mx-auto grid max-w-2xl gap-stack text-center">
        <SectionHeading>{section.heading}</SectionHeading>
        {section.body ? <p className="text-muted-foreground">{section.body}</p> : null}
        {section.action ? (
          <form
            action={section.action}
            method="post"
            className="flex flex-col gap-inline sm:flex-row"
          >
            <Label className="sr-only" htmlFor={emailId}>
              {section.emailLabel}
            </Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              required
              className="min-h-11 flex-1"
              placeholder={section.emailPlaceholder}
            />
            <Button type="submit" size="lg">
              {section.submitLabel}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">{section.unavailableNote}</p>
        )}
      </div>
    </SectionShell>
  );
}

export function TrustStripSection({ section }: { section: SectionOf<"trust-strip"> }) {
  return (
    <SectionShell id={section.id} tone={section.tone} className="py-stack">
      <ul
        className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-center text-sm font-medium"
        role="list"
      >
        {section.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </SectionShell>
  );
}
