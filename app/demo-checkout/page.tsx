import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  description: "The demo storefront has no payment provider. Connect a Shopify store to check out.",
  robots: { follow: false, index: false },
  title: "Demo checkout",
};

export default function DemoCheckoutPage() {
  return (
    <main className="mx-auto grid max-w-2xl gap-6 px-5 py-24">
      <h1 className="text-3xl">This is demo data</h1>
      <p className="text-base opacity-70">
        You reached the checkout of a storefront that is running on generated sample data. There is
        no Shopify store behind it, no payment provider, and nothing to charge.
      </p>
      <div className="grid gap-3 rounded-xl border p-6">
        <h2 className="text-xl">Connect a real store</h2>
        <p className="opacity-70">
          Set <code>PUBLIC_STORE_DOMAIN</code> and <code>PUBLIC_STOREFRONT_API_TOKEN</code> to your
          own Shopify Storefront API credentials and remove <code>SHOPIFY_STOREFRONT_FIXTURE</code>.
          Checkout then resolves to your store&rsquo;s own hosted checkout. The fixture refuses to
          run against a real merchant domain, so the two can never be confused.
        </p>
      </div>
      <div className="flex gap-4">
        <Link className="underline underline-offset-4" href="/cart">
          Back to cart
        </Link>
        <Link className="underline underline-offset-4" href="/">
          Continue browsing
        </Link>
      </div>
    </main>
  );
}
