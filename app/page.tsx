import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SectionRenderer } from "@/components/sections/registry";
import { Page } from "@/components/ui/page";
import { Sections } from "@/components/ui/sections";
import { getLocale } from "@/lib/params";
import { buildAlternates, buildOpenGraph } from "@/lib/seo";
import { shopConfig } from "@/shop.config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seo");
  const title = t("homeTitle");
  const description = t("homeDescription");

  return {
    title: `${title} | ${shopConfig.site.name}`,
    description,
    alternates: buildAlternates({ pathname: "/" }),
    openGraph: buildOpenGraph({
      title,
      description,
      url: "/",
      type: "website",
    }),
  };
}

export default async function HomePage() {
  const locale = await getLocale();

  return (
    <Page className="pt-0">
      <Sections>
        <SectionRenderer recipe={shopConfig.recipes.home} locale={locale} />
      </Sections>
    </Page>
  );
}
