import type { SectionDefinition, SectionRecipe, SectionType } from "@/config/schema/sections";
import type { Locale } from "@/lib/i18n";

import { BannerSection } from "./banner-section";
import {
  AnnouncementSection,
  CollectionGridSection,
  EditorialGridSection,
  FaqSection,
  HeroRecipeSection,
  LogoListSection,
  MediaTextSection,
  NewsletterSection,
  ProductCarouselSection,
  RichTextSection,
  TestimonialsSection,
  TrustStripSection,
} from "./starter-sections";

export const SECTION_REGISTRY_VERSION = 1;

export type RegisteredSectionId = SectionType | "header" | "footer";

export interface SectionRegistration {
  accessibility: readonly string[];
  allowedSlots: readonly ("layout" | "main")[];
  anatomy: readonly string[];
  clientJavaScript: boolean;
  dataNeeds: readonly string[];
  performanceCost: "low" | "moderate";
  source: string;
  variants: readonly string[];
}

export const sectionRegistry = {
  announcement: registration("components/sections/starter-sections.tsx", ["message", "link"]),
  header: registration("components/nav/index.tsx", ["logo", "navigation", "search", "cart"], {
    allowedSlots: ["layout"],
    dataNeeds: ["Shopify menu"],
  }),
  banner: registration(
    "components/sections/banner-section.tsx",
    ["background media", "scrim", "eyebrow", "headline", "subheadline", "action"],
    {
      accessibility: [
        "semantic structure",
        "visible focus",
        "reduced-motion safe",
        "scrim keeps copy at 4.5:1 through the overlay token pair",
        "decorative background media is aria-hidden",
      ],
      // Only when a video is configured: AutoPlayVideo pauses off-screen and honours
      // prefers-reduced-motion. An image or empty banner renders as a server component.
      clientJavaScript: true,
      dataNeeds: ["local image or video in /public"],
      performanceCost: "moderate",
      variants: ["compact", "standard", "tall", "align-start", "align-center"],
    },
  ),
  hero: registration(
    "components/sections/starter-sections.tsx",
    ["eyebrow", "heading", "body", "actions"],
    {
      variants: ["centered", "split"],
    },
  ),
  "rich-text": registration("components/sections/starter-sections.tsx", ["heading", "body"], {
    variants: ["left", "center"],
  }),
  "media-text": registration(
    "components/sections/starter-sections.tsx",
    ["media", "heading", "body", "action"],
    {
      performanceCost: "moderate",
      variants: ["media-start", "media-end"],
    },
  ),
  "logo-list": registration("components/sections/starter-sections.tsx", ["heading", "logos"]),
  "collection-grid": registration(
    "components/sections/starter-sections.tsx",
    ["heading", "collection cards", "card media"],
    {
      dataNeeds: ["optional local card imagery"],
      performanceCost: "moderate",
      variants: ["2 columns", "3 columns", "4 columns", "square", "portrait", "landscape", "none"],
    },
  ),
  "product-carousel": registration(
    "components/sections/starter-sections.tsx",
    ["heading", "product grid"],
    {
      dataNeeds: ["Shopify products or collection"],
      performanceCost: "moderate",
    },
  ),
  "editorial-grid": registration(
    "components/sections/starter-sections.tsx",
    ["heading", "article cards", "card media", "read-more link"],
    {
      dataNeeds: ["optional local card imagery"],
      performanceCost: "moderate",
      variants: ["square", "portrait", "landscape", "none"],
    },
  ),
  testimonials: registration("components/sections/starter-sections.tsx", [
    "heading",
    "quotes",
    "attributions",
  ]),
  faq: registration(
    "components/sections/starter-sections.tsx",
    ["heading", "native disclosure items"],
    {
      accessibility: ["native details/summary keyboard behavior", "visible focus"],
    },
  ),
  newsletter: registration(
    "components/sections/starter-sections.tsx",
    ["heading", "body", "email form"],
    {
      accessibility: [
        "semantic structure",
        "visible focus",
        "reduced-motion safe",
        "labelled email field",
      ],
      dataNeeds: ["newsletter provider endpoint when enabled"],
    },
  ),
  "trust-strip": registration("components/sections/starter-sections.tsx", ["trust statements"]),
  footer: registration("components/footer/index.tsx", ["navigation", "social links", "legal"], {
    allowedSlots: ["layout"],
    dataNeeds: ["Shopify footer menu"],
  }),
} as const satisfies Record<RegisteredSectionId, SectionRegistration>;

export function SectionRenderer({ recipe, locale }: { locale: Locale; recipe: SectionRecipe }) {
  return recipe.sections.map((section) =>
    section.enabled ? (
      <RegisteredSection key={section.id} section={section} locale={locale} />
    ) : null,
  );
}

export function RegisteredSection({
  section,
  locale,
}: {
  locale: Locale;
  section: SectionDefinition;
}) {
  switch (section.type) {
    case "announcement":
      return <AnnouncementSection section={section} />;
    case "banner":
      return <BannerSection section={section} />;
    case "hero":
      return <HeroRecipeSection section={section} />;
    case "rich-text":
      return <RichTextSection section={section} />;
    case "media-text":
      return <MediaTextSection section={section} />;
    case "logo-list":
      return <LogoListSection section={section} />;
    case "collection-grid":
      return <CollectionGridSection section={section} />;
    case "product-carousel":
      return <ProductCarouselSection section={section} locale={locale} />;
    case "editorial-grid":
      return <EditorialGridSection section={section} />;
    case "testimonials":
      return <TestimonialsSection section={section} />;
    case "faq":
      return <FaqSection section={section} />;
    case "newsletter":
      return <NewsletterSection section={section} />;
    case "trust-strip":
      return <TrustStripSection section={section} />;
  }
}

function registration(
  source: string,
  anatomy: readonly string[],
  overrides: Partial<SectionRegistration> = {},
): SectionRegistration {
  return {
    accessibility: ["semantic structure", "visible focus", "reduced-motion safe"],
    allowedSlots: ["main"],
    anatomy,
    clientJavaScript: false,
    dataNeeds: [],
    performanceCost: "low",
    source,
    variants: ["default", "muted", "contrast"],
    ...overrides,
  };
}
