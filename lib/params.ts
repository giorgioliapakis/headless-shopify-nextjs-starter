import {
  defaultLocale,
  localeSwitchingEnabled,
  resolveLocale,
  storefrontLocaleCookie,
  type Locale,
} from "./i18n";

export async function getLocale(): Promise<Locale> {
  if (!localeSwitchingEnabled) return defaultLocale;
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(storefrontLocaleCookie)?.value);
}
