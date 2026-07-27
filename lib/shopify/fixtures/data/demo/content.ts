/**
 * Demo storefront content: collections, editorial, CMS pages, policies and the
 * two navigation menus. All copy is invented and brand-neutral.
 */

import { demoImage } from "../../images";
import type {
  FixtureArticle,
  FixtureBlog,
  FixtureCollection,
  FixtureMenu,
  FixturePage,
  FixturePolicyKey,
  FixturePolicy,
} from "../../types";

export const DEMO_FIXTURE_DOMAIN = "demo-fixture.myshopify.com";

function collection(
  id: number,
  handle: string,
  title: string,
  description: string,
): FixtureCollection {
  return {
    description,
    handle,
    id: `gid://shopify/Collection/${id}`,
    image: demoImage(`collection/${handle}`, `${title} collection`, 1200, 600),
    seo: { description, title },
    title,
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

export const demoCollections: FixtureCollection[] = [
  collection(
    7001,
    "new-arrivals",
    "New Arrivals",
    "The most recent additions across every category, refreshed as the season turns.",
  ),
  collection(
    7002,
    "everyday-carry",
    "Everyday Carry",
    "Bags, wallets and small goods for the things you take with you every day.",
  ),
  collection(
    7003,
    "workspace",
    "Workspace",
    "Desk surfaces, lighting and stationery for a room you actually want to work in.",
  ),
  collection(
    7004,
    "apparel",
    "Apparel",
    "Layers cut for real wear, in a palette that keeps working after the first wash.",
  ),
  collection(
    7005,
    "outdoors",
    "Outdoors",
    "Gear for short trips: weather-ready, packable and repairable.",
  ),
];

export const demoBlogs: FixtureBlog[] = [
  {
    handle: "journal",
    id: "gid://shopify/Blog/7100",
    seo: {
      description: "Notes on materials, making and the demo storefront itself.",
      title: "Journal",
    },
    title: "Journal",
  },
];

function article(
  id: number,
  handle: string,
  title: string,
  excerpt: string,
  publishedAt: string,
  author: string,
  tags: string[],
): FixtureArticle {
  return {
    authorV2: { name: author },
    blog: { handle: "journal", title: "Journal" },
    contentHtml: `<p>${excerpt}</p><p>This article is sample content shipped with the demo fixture so every editorial surface renders. Replace it by connecting a Shopify store and publishing your own blog.</p><h2>Why it matters</h2><p>Storefront work is easier to judge against a catalogue that looks like a real one: multiple option axes, a few things out of stock, and copy long enough to wrap.</p>`,
    excerpt,
    handle,
    id: `gid://shopify/Article/${id}`,
    image: demoImage(`article/${handle}`, title, 1200, 630),
    publishedAt,
    seo: { description: excerpt, title },
    tags,
    title,
  };
}

export const demoArticles: FixtureArticle[] = [
  article(
    7201,
    "how-we-choose-materials",
    "How we choose materials",
    "A short account of why a heavier canvas often outlasts a technical weave, and when it does not.",
    "2025-11-18T09:00:00Z",
    "Rowan Ellis",
    ["materials", "making"],
  ),
  article(
    7202,
    "packing-for-two-nights",
    "Packing for two nights",
    "The shortest useful packing list we have found, built around a single duffel and one spare layer.",
    "2025-10-30T09:00:00Z",
    "Priya Nandi",
    ["travel", "guides"],
  ),
  article(
    7203,
    "a-desk-that-stays-clear",
    "A desk that stays clear",
    "Three small changes that keep a working surface usable without turning tidying into a hobby.",
    "2025-10-02T09:00:00Z",
    "Rowan Ellis",
    ["workspace", "guides"],
  ),
  article(
    7204,
    "caring-for-wool",
    "Caring for wool",
    "Wash less, air more, and know the one situation where a machine is genuinely the right answer.",
    "2025-09-12T09:00:00Z",
    "Marta Vidal",
    ["care", "apparel"],
  ),
  article(
    7205,
    "the-case-for-repair",
    "The case for repair",
    "Repairability is a design decision made long before anything breaks. Here is what we look for.",
    "2025-08-21T09:00:00Z",
    "Jonas Beck",
    ["repair", "making"],
  ),
  article(
    7206,
    "reading-a-product-page",
    "Reading a product page",
    "What the numbers on a spec list actually tell you, and which of them are mostly decoration.",
    "2025-07-29T09:00:00Z",
    "Priya Nandi",
    ["guides"],
  ),
];

function page(handle: string, title: string, summary: string, body: string): FixturePage {
  return {
    body,
    bodySummary: summary,
    handle,
    seo: { description: summary, title },
    title,
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

export const demoPages: FixturePage[] = [
  page(
    "about",
    "About this demo",
    "Everything on this storefront is synthetic sample data served without any Shopify credentials.",
    `<p>This storefront is running on the demo fixture. There is no Shopify store behind it: the catalogue, editorial, menus and cart are all generated locally so the project can be explored, reviewed and screenshotted without credentials.</p><h2>What is real</h2><p>The rendering, routing, caching, filtering and cart flows are the production code paths. Only the data source is swapped.</p><h2>Connecting a store</h2><p>Set <code>PUBLIC_STORE_DOMAIN</code> and <code>PUBLIC_STOREFRONT_API_TOKEN</code> to your own values and remove <code>SHOPIFY_STOREFRONT_FIXTURE</code>. The fixture refuses to run against a real merchant domain.</p>`,
  ),
  page(
    "contact",
    "Contact",
    "Where to reach a team that, in this demo, does not exist.",
    `<p>This is sample content. A real storefront would put support hours, a contact form and a response-time promise here.</p><h2>Support</h2><p>Replace this page with your own <em>Pages</em> entry in the Shopify admin — it is fetched by handle, so keeping the handle <code>contact</code> is enough.</p>`,
  ),
];

export const demoPolicies: Partial<Record<FixturePolicyKey, FixturePolicy>> = {
  contactInformation: {
    body: "Sample contact details for the demo storefront. No orders are processed here.",
    handle: "contact-information",
    title: "Contact information",
  },
  privacyPolicy: {
    body: "The demo storefront collects nothing. A live store would describe its data handling here.",
    handle: "privacy-policy",
    title: "Privacy policy",
  },
  refundPolicy: {
    body: "Sample refund terms. Returns are accepted within thirty days in this fictional store.",
    handle: "refund-policy",
    title: "Refund policy",
  },
  shippingPolicy: {
    body: "Sample shipping terms. Nothing ships, because nothing is real on this storefront.",
    handle: "shipping-policy",
    title: "Shipping policy",
  },
};

function menuItem(
  id: string,
  title: string,
  path: string,
  type: string,
  items: FixtureMenu["items"] = [],
): FixtureMenu["items"][number] {
  return {
    id: `gid://shopify/MenuItem/${id}`,
    items,
    resource: null,
    tags: [],
    title,
    type,
    url: `https://${DEMO_FIXTURE_DOMAIN}${path}`,
  };
}

export const demoMenus: Record<string, FixtureMenu> = {
  footer: {
    handle: "footer",
    id: "gid://shopify/Menu/7301",
    items: [
      menuItem("7310", "About this demo", "/pages/about", "PAGE"),
      menuItem("7311", "Contact", "/pages/contact", "PAGE"),
      menuItem("7312", "Journal", "/blogs/journal", "BLOG"),
      menuItem("7313", "Shipping policy", "/policies/shipping-policy", "SHOP_POLICY"),
      menuItem("7314", "Refund policy", "/policies/refund-policy", "SHOP_POLICY"),
    ],
    title: "Footer",
  },
  "main-menu": {
    handle: "main-menu",
    id: "gid://shopify/Menu/7300",
    items: [
      menuItem("7320", "Shop all", "/collections/all", "CATALOG", [
        menuItem("7321", "New arrivals", "/collections/new-arrivals", "COLLECTION"),
        menuItem("7322", "Everyday carry", "/collections/everyday-carry", "COLLECTION"),
        menuItem("7323", "Workspace", "/collections/workspace", "COLLECTION"),
        menuItem("7324", "Apparel", "/collections/apparel", "COLLECTION"),
        menuItem("7325", "Outdoors", "/collections/outdoors", "COLLECTION"),
      ]),
      menuItem("7330", "Workspace", "/collections/workspace", "COLLECTION", [
        menuItem("7331", "Desk", "/collections/workspace?filter.p.product_type=Desk", "HTTP"),
        menuItem(
          "7332",
          "Lighting",
          "/collections/workspace?filter.p.product_type=Lighting",
          "HTTP",
        ),
        menuItem(
          "7333",
          "Stationery",
          "/collections/workspace?filter.p.product_type=Stationery",
          "HTTP",
        ),
      ]),
      menuItem("7340", "Apparel", "/collections/apparel", "COLLECTION"),
      menuItem("7350", "Journal", "/blogs/journal", "BLOG"),
      menuItem("7360", "About", "/pages/about", "PAGE"),
    ],
    title: "Main menu",
  },
};
