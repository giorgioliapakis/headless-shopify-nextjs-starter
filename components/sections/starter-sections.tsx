import Image from "next/image";
import Link from "next/link";

import { ProductsGrid } from "@/components/product/products-grid";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { SectionDefinition } from "@/config/schema/sections";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SectionOf<T extends SectionDefinition["type"]> = Extract<SectionDefinition, { type: T }>;

function sectionTone(tone: SectionDefinition["tone"]): string {
  if (tone === "muted") return "bg-muted text-foreground";
  if (tone === "contrast") return "bg-foreground text-background";
  return "bg-background text-foreground";
}

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
    <Container id={id} className={cn("py-10 sm:py-14", sectionTone(tone), className)}>
      {children}
    </Container>
  );
}

export function AnnouncementSection({ section }: { section: SectionOf<"announcement"> }) {
  return (
    <section
      id={section.id}
      className={cn("px-5 py-2.5 text-center text-sm", sectionTone(section.tone))}
    >
      <p>
        {section.message}
        {section.link ? (
          <>
            {" "}
            <Link className="font-medium underline underline-offset-4" href={section.link.href}>
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
    <SectionShell id={section.id} tone={section.tone} className="py-16 sm:py-24">
      <div
        className={cn(
          "grid gap-6",
          section.variant === "centered"
            ? "mx-auto max-w-4xl justify-items-center text-center"
            : "max-w-5xl lg:grid-cols-[1fr_auto] lg:items-end",
        )}
      >
        <div className="grid gap-4">
          {section.eyebrow ? (
            <p className="text-sm font-medium uppercase tracking-widest opacity-70">
              {section.eyebrow}
            </p>
          ) : null}
          <h1 className="text-4xl font-medium leading-tight sm:text-6xl">{section.heading}</h1>
          {section.body ? <p className="max-w-2xl text-lg opacity-75">{section.body}</p> : null}
        </div>
        {section.primaryAction || section.secondaryAction ? (
          <div className="flex flex-wrap gap-3">
            {section.primaryAction ? (
              <Button render={<Link href={section.primaryAction.href} />} size="lg">
                {section.primaryAction.label}
              </Button>
            ) : null}
            {section.secondaryAction ? (
              <Button
                render={<Link href={section.secondaryAction.href} />}
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
        className={cn("grid max-w-3xl gap-4", section.align === "center" && "mx-auto text-center")}
      >
        {section.heading ? <h2 className="text-3xl sm:text-4xl">{section.heading}</h2> : null}
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
        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
          Add approved local media
        </div>
      )}
    </div>
  );
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <div className="grid items-center gap-8 lg:grid-cols-2">
        {section.mediaPosition === "start" ? media : null}
        <div className="grid gap-4">
          <h2 className="text-3xl sm:text-4xl">{section.heading}</h2>
          <p className="leading-7 opacity-80">{section.body}</p>
          {section.action ? (
            <Button render={<Link href={section.action.href} />} className="justify-self-start">
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
      <div className="grid gap-6 text-center">
        {section.heading ? <h2 className="text-2xl">{section.heading}</h2> : null}
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5" role="list">
          {section.logos.map((logo) => (
            <li key={logo} className="text-lg font-medium opacity-70">
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
      <div className="grid gap-6">
        <h2 className="text-3xl sm:text-4xl">{section.heading}</h2>
        <div
          className={cn(
            "grid gap-5 sm:grid-cols-2",
            section.columns === 3 && "lg:grid-cols-3",
            section.columns === 4 && "lg:grid-cols-4",
          )}
        >
          {section.collections.map((collection) => (
            <Link
              key={collection.title}
              href={collection.href ?? "/collections"}
              className="group grid min-h-56 content-end rounded-xl border bg-card p-6 text-card-foreground transition-transform hover:-translate-y-0.5"
            >
              <h3 className="text-2xl">{collection.title}</h3>
              {collection.body ? <p className="mt-2 opacity-70">{collection.body}</p> : null}
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
      <div className="grid gap-6">
        <h2 className="text-3xl sm:text-4xl">{section.heading}</h2>
        <div className="grid gap-5 md:grid-cols-3">
          {section.items.map((item) => (
            <article key={item.title} className="grid gap-3 rounded-xl border p-6">
              <h3 className="text-xl">{item.title}</h3>
              {item.body ? <p className="opacity-70">{item.body}</p> : null}
              {item.href ? (
                <Link href={item.href} className="mt-auto font-medium underline underline-offset-4">
                  Read more
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
      <div className="grid gap-6">
        {section.heading ? <h2 className="text-3xl sm:text-4xl">{section.heading}</h2> : null}
        <div className="grid gap-5 md:grid-cols-3">
          {section.items.map((item) => (
            <figure
              key={`${item.attribution}:${item.quote}`}
              className="grid gap-4 rounded-xl border p-6"
            >
              <blockquote className="text-lg">“{item.quote}”</blockquote>
              <figcaption className="text-sm opacity-70">{item.attribution}</figcaption>
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
      <div className="mx-auto grid max-w-3xl gap-6">
        <h2 className="text-3xl sm:text-4xl">{section.heading}</h2>
        <div className="divide-y border-y">
          {section.items.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="cursor-pointer font-medium marker:text-muted-foreground">
                {item.question}
              </summary>
              <p className="pt-3 leading-7 opacity-75">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

export function NewsletterSection({ section }: { section: SectionOf<"newsletter"> }) {
  return (
    <SectionShell id={section.id} tone={section.tone}>
      <div className="mx-auto grid max-w-2xl gap-5 text-center">
        <h2 className="text-3xl sm:text-4xl">{section.heading}</h2>
        {section.body ? <p className="opacity-75">{section.body}</p> : null}
        {section.action ? (
          <form action={section.action} method="post" className="flex flex-col gap-3 sm:flex-row">
            <label className="sr-only" htmlFor={`${section.id}-email`}>
              Email address
            </label>
            <input
              id={`${section.id}-email`}
              name="email"
              type="email"
              autoComplete="email"
              required
              className="min-h-11 flex-1 rounded-lg border bg-background px-4 text-foreground"
              placeholder="Email address"
            />
            <Button type="submit" size="lg">
              Subscribe
            </Button>
          </form>
        ) : (
          <p className="text-sm opacity-60">
            Connect an approved newsletter provider to enable signup.
          </p>
        )}
      </div>
    </SectionShell>
  );
}

export function TrustStripSection({ section }: { section: SectionOf<"trust-strip"> }) {
  return (
    <SectionShell id={section.id} tone={section.tone} className="py-6">
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
