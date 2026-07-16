"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isEnabledLocale, localeSwitchingEnabled, storefrontLocaleCookie } from "@/lib/i18n";
import { syncHydrogenCartMarket } from "@/lib/shopify/hydrogen/cart-market";

import { buildMarketReturnTo } from "./market";

export async function switchMarketAction(formData: FormData): Promise<void> {
  if (!localeSwitchingEnabled) throw new Error("Market switching is not enabled");
  const locale = formData.get("locale");
  if (typeof locale !== "string" || !isEnabledLocale(locale)) {
    throw new Error("Unsupported storefront market");
  }

  const returnTo = formData.get("returnTo");
  const safeReturnTo = buildMarketReturnTo(typeof returnTo === "string" ? returnTo : "/");
  const cookieStore = await cookies();
  const cartToken = cookieStore.get("cart")?.value;
  if (cartToken) await syncHydrogenCartMarket(cartToken, locale);

  cookieStore.set(storefrontLocaleCookie, locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  redirect(safeReturnTo);
}
