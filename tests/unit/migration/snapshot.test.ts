import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  capturePublicSnapshot,
  classifyPath,
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
    ["/products/tee", "product"],
    ["/collections/all", "collection"],
    ["/blogs/news", "blog"],
    ["/blogs/news/story", "article"],
    ["/pages/about", "page"],
    ["/policies/privacy-policy", "policy"],
    ["/search", "search"],
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
        '<html><head><title>Home</title><meta name="description" content="Neutral store"></head><body><h1>Welcome</h1></body></html>',
      ],
      [
        "https://example.com/products/tee",
        "<html><head><title>Tee</title></head><body><h1>Neutral tee</h1></body></html>",
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
    expect(snapshot.summary).toMatchObject({ capturedCount: 2, successfulCount: 2 });
    expect(snapshot.pages[1]).toMatchObject({ type: "product", title: "Tee" });
    const evidence = await readFile(join(runDirectory, snapshot.pages[1].evidencePath!), "utf8");
    expect(evidence).toContain("Neutral tee");
  });
});
