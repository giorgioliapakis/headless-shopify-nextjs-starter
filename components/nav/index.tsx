import { UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/ui/container";
import { getMenuItems } from "@/lib/shopify/operations/menu";
import { shopConfig } from "@/shop.config";

import { CartIcon, CartIconFallback } from "./cart";
import { MobileMenu } from "./mobile-menu";
import { QuickLinks } from "./quick-links";
import { SearchModal } from "./search-modal";

export async function Nav({ locale: _locale }: { locale: string }) {
  const [t, items] = await Promise.all([
    getTranslations("nav"),
    getMenuItems({
      fallback: shopConfig.navigation.nav,
      handle: shopConfig.navigation.menuHandles.nav,
    }),
  ]);

  return (
    <nav
      className="sticky top-0 z-30 w-full bg-background pt-[env(safe-area-inset-top,0px)] transition-shadow duration-250"
      id="nav-outer"
    >
      <Container className="flex h-16 items-center gap-2.5 md:gap-5">
        <MobileMenu items={items} />
        <Link className="flex shrink-0 items-center" href="/" prefetch={false}>
          <span className="text-xl leading-4">{shopConfig.site.name}</span>
        </Link>
        <QuickLinks items={items} />
        <div className="ml-auto flex items-center gap-5">
          <SearchModal />
          {shopConfig.accounts.url && (
            <a href={shopConfig.accounts.url} className="transition-opacity hover:opacity-70">
              <UserRound className="size-5" aria-hidden="true" />
              <span className="sr-only">{t("account")}</span>
            </a>
          )}
          <Suspense fallback={<CartIconFallback label={t("cart")} />}>
            <CartIcon label={t("cart")} />
          </Suspense>
        </div>
      </Container>
    </nav>
  );
}
