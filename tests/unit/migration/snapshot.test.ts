import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  capturePublicSnapshot,
  classifyPath,
  detectAccessState,
  extractSameOriginLinks,
  isDisallowed,
  parseRobots,
  parseSitemapLocations,
} from "../../../migration/lib/snapshot.mjs";

describe("public snapshot", () => {
  it("parses bounded Shopify sitemap and robots inputs", () => {
    expect(
      parseSitemapLocations(
        "<urlset><url><loc>https://example.com/products/a&amp;b</loc></url></urlset>",
      ),
    ).toEqual(["https://example.com/products/a&b"]);
    const rules = parseRobots("User-agent: *\nDisallow: /admin\nDisallow: /private*");
    expect(isDisallowed("/admin/orders", rules)).toBe(true);
    expect(isDisallowed("/products/a", rules)).toBe(false);
  });

  it.each([
    ["/", "home"],
    ["/collections", "collection-index"],
    ["/products/tee", "product"],
    ["/collections/all", "collection"],
    ["/blogs/news", "blog"],
    ["/blogs/news/story", "article"],
    ["/pages/about", "page"],
    ["/landing/campaign", "landing"],
    ["/policies/privacy-policy", "policy"],
    ["/search", "search"],
    ["/cart", "cart"],
    ["/account/login", "account"],
    ["/checkout", "checkout"],
    ["/apps/example", "other"],
  ])("classifies %s as %s", (path, type) => expect(classifyPath(path)).toBe(type));

  it("captures metadata while keeping raw evidence outside trusted resume context", async () => {
    const runDirectory = await mkdtemp(join(tmpdir(), "public-snapshot-"));
    const responses = new Map([
      ["https://example.com/robots.txt", "User-agent: *\nDisallow: /admin"],
      [
        "https://example.com/sitemap.xml",
        "<urlset><url><loc>https://example.com/products/tee</loc></url></urlset>",
      ],
      [
        "https://example.com/",
        '<html><head><title>Home</title><meta name="description" content="Neutral store"><meta name="robots" content="index,follow"><link rel="canonical" href="https://example.com/"><link rel="alternate" hreflang="en-AU" href="https://example.com/"><script type="application/ld+json">{"@type":"WebSite"}</script></head><body><h1>Welcome</h1><a href="/pages/about?from=nav">About</a><a href="https://outside.example/collect">Outside</a></body></html>',
      ],
      [
        "https://example.com/products/tee",
        "<html><head><title>Tee</title></head><body><h1>Neutral tee</h1></body></html>",
      ],
      [
        "https://example.com/pages/about?from=nav",
        "<html><head><title>About</title></head><body><h1>About us</h1></body></html>",
      ],
    ]);
    const get = async (input: string) => {
      const body = responses.get(input);
      if (body === undefined) throw new Error("missing fixture");
      return {
        body,
        bytes: Buffer.byteLength(body),
        headers: {
          "content-type": input.endsWith(".xml")
            ? "application/xml"
            : input.endsWith(".txt")
              ? "text/plain"
              : "text/html",
        },
        status: 200,
        url: input,
      };
    };
    const snapshot = await capturePublicSnapshot({
      runDirectory,
      storeUrl: "https://example.com/",
      maxPages: 10,
      get,
    });
    expect(snapshot.summary).toMatchObject({ capturedCount: 3, successfulCount: 3 });
    expect(snapshot.snapshotId).toMatch(/^[a-f0-9]{64}$/);
    expect(snapshot.pages[1]).toMatchObject({ type: "page", title: "About" });
    expect(snapshot.pages[2]).toMatchObject({ type: "product", title: "Tee" });
    expect(snapshot.pages[0].links).toEqual(["https://example.com/pages/about?from=nav"]);
    expect(snapshot.pages[0]).toMatchObject({
      canonical: "https://example.com/",
      robots: "index,follow",
      hreflang: [{ language: "en-AU", href: "https://example.com/" }],
      structuredDataTypes: ["WebSite"],
    });
    const evidence = await readFile(join(runDirectory, snapshot.pages[2].evidencePath!), "utf8");
    expect(evidence).toContain("Neutral tee");
  });

  it("normalizes only bounded same-origin HTTPS navigation", () => {
    const links = Array.from({ length: 205 }, (_, index) => `<a href="/pages/${index}">P</a>`).join(
      "",
    );
    expect(
      extractSameOriginLinks(
        `<a href="mailto:test@example.com">Mail</a><a href="https://other.example/">Other</a>${links}`,
        "https://example.com/",
        "https://example.com",
      ),
    ).toHaveLength(200);
  });

  it("does not mistake a 200 Shopify password page for public evidence", () => {
    expect(
      detectAccessState(
        '<body class="template-password"><form action="/password"><input type="password"></form></body>',
      ),
    ).toBe("password-gated");
    expect(detectAccessState("<body><main>Public store</main></body>")).toBe("public");
  });
});
