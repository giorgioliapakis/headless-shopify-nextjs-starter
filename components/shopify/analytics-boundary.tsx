import { ShopifyAnalyticsTracker } from "@/components/shopify/analytics-tracker";
import { getShopAnalytics } from "@/lib/analytics/server";

export async function ShopifyAnalyticsBoundary({ locale }: { locale: string }) {
  const shop = await getShopAnalytics(locale);
  return <ShopifyAnalyticsTracker shop={shop} />;
}
