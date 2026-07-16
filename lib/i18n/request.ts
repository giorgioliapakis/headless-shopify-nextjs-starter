import { getRequestConfig } from "next-intl/server";

import { defaultLocale, resolveLocale } from ".";
import type enMessages from "./messages/en.json";

const messageLoaders = {
  "en-US": () => import("./messages/en.json"),
  "en-AU": () => import("./messages/en.json"),
  "en-CA": () => import("./messages/en.json"),
  "en-GB": () => import("./messages/en.json"),
} as const;

export default getRequestConfig(async () => {
  const { getLocale } = await import("@/lib/params");
  const locale = resolveLocale(await getLocale());
  const messages = (await messageLoaders[locale]()).default as typeof enMessages;

  return { locale, messages };
});
