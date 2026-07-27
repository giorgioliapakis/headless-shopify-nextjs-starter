import Image from "next/image";
import Link from "next/link";

import { AutoPlayVideo } from "@/components/ui/auto-play-video";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { SectionDefinition } from "@/config/schema/sections";
import { cn } from "@/lib/utils";

type BannerSectionDefinition = Extract<SectionDefinition, { type: "banner" }>;

const HEIGHTS = {
  compact: "md:aspect-[4/1]",
  standard: "md:aspect-[3/1]",
  tall: "md:aspect-[2/1]",
} as const;

/**
 * Full-bleed media banner: the one section that paints edge to edge and puts copy over video or a
 * still.
 *
 * Copy on media never follows the page background — it sits on a scrim that is dark in both colour
 * schemes — so it uses the dedicated `overlay` / `overlay-foreground` pair from the theme contract
 * instead of a literal white.
 */
export function BannerSection({ section }: { section: BannerSectionDefinition }) {
  const Heading = section.headingLevel;
  const media = section.video ?? section.image;

  return (
    <section id={section.id} className="relative w-full overflow-hidden">
      <div
        className={cn(
          "relative grid",
          media ? "bg-overlay text-overlay-foreground" : "bg-muted text-foreground",
        )}
      >
        <div className={cn("col-start-1 row-start-1 hidden md:block", HEIGHTS[section.height])} />

        {section.video ? (
          <AutoPlayVideo
            src={section.video.src}
            previewImage={
              section.video.poster
                ? { src: section.video.poster.src, alt: section.video.poster.alt }
                : null
            }
            className="absolute inset-0 size-full object-cover"
            priorityImage
            sizes="100vw"
          />
        ) : section.image ? (
          <Image
            src={section.image.src}
            alt={section.image.alt}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : null}

        {media ? (
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-overlay/75 via-overlay/30 to-overlay/10"
          />
        ) : null}

        <Container
          className={cn(
            "relative col-start-1 row-start-1 flex items-center py-section",
            section.align === "center" ? "justify-center" : "justify-start",
          )}
        >
          <div
            className={cn(
              "flex flex-col gap-stack",
              section.align === "center" ? "items-center text-center" : "items-start text-left",
            )}
          >
            {section.eyebrow ? (
              <p className="text-sm font-medium uppercase tracking-widest opacity-80">
                {section.eyebrow}
              </p>
            ) : null}
            <Heading className="max-w-3xl text-3xl font-medium leading-tight md:text-5xl">
              {section.headline}
            </Heading>
            {section.subheadline ? (
              <p className="max-w-xl text-sm opacity-90 md:text-base">{section.subheadline}</p>
            ) : null}
            {section.action ? (
              <Button
                className={cn(
                  "h-11 px-5",
                  media && "bg-overlay-foreground text-overlay hover:bg-overlay-foreground/90",
                )}
                render={<Link href={section.action.href} prefetch={false} />}
              >
                {section.action.label}
              </Button>
            ) : null}
          </div>
        </Container>
      </div>
    </section>
  );
}
