import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SectionRenderer } from "@/components/sections/registry";
import { Page } from "@/components/ui/page";
import { Sections } from "@/components/ui/sections";
import { getLocale } from "@/lib/params";
import { buildAlternates, buildOpenGraph } from "@/lib/seo";
import { shopConfig } from "@/shop.config";

const PLACEHOLDER_HANDLE = "__placeholder__";

export function generateStaticParams() {
  const handles = Object.keys(shopConfig.recipes.landing);
  return handles.length ? handles.map((handle) => ({ handle })) : [{ handle: PLACEHOLDER_HANDLE }];
}

export async function generateMetadata({
  params,
}: PageProps<"/landing/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const landing = shopConfig.recipes.landing[handle];
  if (!landing) notFound();
  const pathname = `/landing/${handle}`;
  return {
    title: landing.title,
    description: landing.description,
    alternates: buildAlternates({ pathname }),
    openGraph: buildOpenGraph({
      title: landing.title,
      description: landing.description,
      url: pathname,
      type: "website",
    }),
    robots: { index: landing.index, follow: landing.index },
  };
}

export default async function LandingPage({ params }: PageProps<"/landing/[handle]">) {
  const [{ handle }, locale] = await Promise.all([params, getLocale()]);
  const landing = shopConfig.recipes.landing[handle];
  if (!landing) notFound();
  return (
    <Page className="pt-0">
      <Sections>
        <SectionRenderer recipe={landing.recipe} locale={locale} />
      </Sections>
    </Page>
  );
}
