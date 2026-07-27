import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { MarketSelector } from "@/components/commerce/market-selector";
import { Container } from "@/components/ui/container";
import { Sections } from "@/components/ui/sections";
import { storefrontMarkets } from "@/lib/commerce/market";
import { getMenuItems } from "@/lib/shopify/operations/menu";
import { getShopPolicies } from "@/lib/shopify/operations/policies";
import type { MenuItem } from "@/lib/shopify/types/menu";
import { shopConfig } from "@/shop.config";

import { SocialLinks } from "./social-links";

export async function Footer({ locale }: { locale: string }) {
  const { socialLinks } = shopConfig.site;
  const [policies, t, items] = await Promise.all([
    getShopPolicies({ locale }).catch(() => []),
    getTranslations("footer"),
    getMenuItems({
      fallback: shopConfig.navigation.footer,
      handle: shopConfig.navigation.menuHandles.footer,
    }),
  ]);

  return (
    <footer>
      <Container className="pt-20 pb-10">
        <Sections className="gap-10">
          {items.length > 0 && <FooterMenu items={items} />}
          <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start">
              <p className="text-sm leading-5 text-muted-foreground">
                {t("copyright", { name: shopConfig.site.name })}
              </p>
              {policies.map((policy) => (
                <Link
                  key={policy.handle}
                  href={`/policies/${policy.handle}`}
                  className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {policy.title}
                </Link>
              ))}
            </div>
            {socialLinks.length > 0 && <SocialLinks links={socialLinks} />}
          </div>
          {storefrontMarkets.length > 1 && (
            <Suspense fallback={null}>
              <MarketSelector currentLocale={locale} markets={storefrontMarkets} />
            </Suspense>
          )}
        </Sections>
      </Container>
    </footer>
  );
}

function MenuLink({
  url,
  children,
  className,
}: React.PropsWithChildren<{ className?: string; url: string }>) {
  return url.startsWith("http") ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={url} className={className}>
      {children}
    </Link>
  );
}

function FooterMenu({ items }: { items: MenuItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:grid-cols-5">
      {items.slice(0, 5).map((column) => (
        <div key={column.id} className="space-y-3">
          {column.url ? (
            <MenuLink
              url={column.url}
              className="block text-sm font-semibold transition-opacity hover:opacity-70"
            >
              {column.title}
            </MenuLink>
          ) : (
            <h3 className="text-sm font-semibold">{column.title}</h3>
          )}
          {column.items.length > 0 && (
            <ul className="space-y-2">
              {column.items.map((leaf) => (
                <li key={leaf.id}>
                  <MenuLink
                    url={leaf.url}
                    className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {leaf.title}
                  </MenuLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
