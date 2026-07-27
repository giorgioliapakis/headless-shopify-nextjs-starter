import { clampDimension, renderDemoArtwork } from "@/lib/shopify/fixtures/artwork";

/**
 * Serves the demo fixture's generated artwork.
 *
 * The final path segment carries the size (`.../<seed>/800x1000.png`) and every
 * preceding segment seeds the palette. Only reachable while the credential-free
 * demo dataset is active, so a real storefront build never exposes placeholders.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/demo-image/[...slug]">,
): Promise<Response> {
  if (process.env.SHOPIFY_STOREFRONT_FIXTURE !== "demo") {
    return new Response("Not found", { status: 404 });
  }

  const { slug } = await context.params;
  const size = slug
    .at(-1)
    ?.replace(/\.png$/, "")
    .match(/^(\d+)x(\d+)$/);
  const seed = (size ? slug.slice(0, -1) : slug).join("/");
  const png = renderDemoArtwork(
    seed,
    clampDimension(size?.[1], 800),
    clampDimension(size?.[2], 1000),
  );

  return new Response(png as BodyInit, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(png.byteLength),
      "content-type": "image/png",
    },
  });
}
