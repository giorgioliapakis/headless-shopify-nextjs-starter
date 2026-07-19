import { describe, expect, it } from "vitest";

import { neutralStorefrontFixtureData } from "@/lib/shopify/fixtures/fetch";

describe("Shopify blog contract", () => {
  it("keeps blog/article identity, HTML and SEO source data intact", () => {
    const blog = neutralStorefrontFixtureData("getBlog", { handle: "journal" }) as {
      blog: { articles: { nodes: Array<Record<string, unknown>> }; handle: string };
    };
    const article = neutralStorefrontFixtureData("getArticle", {
      articleHandle: "neutral-article",
      blogHandle: "journal",
    }) as {
      blog: { articleByHandle: { contentHtml: string; handle: string; publishedAt: string } };
    };
    expect(blog.blog.handle).toBe("journal");
    expect(blog.blog.articles.nodes).toHaveLength(1);
    expect(article.blog.articleByHandle).toMatchObject({
      contentHtml: "<p>Neutral fixture article content.</p>",
      handle: "neutral-article",
      publishedAt: "2026-01-01T00:00:00Z",
    });
  });

  it("emits both blog and nested article sitemap paths", () => {
    const blogs = neutralStorefrontFixtureData("getBlogSitemap") as {
      blogs: { nodes: Array<{ handle: string }> };
    };
    const articles = neutralStorefrontFixtureData("getArticleSitemap") as {
      articles: { nodes: Array<{ blog: { handle: string }; handle: string }> };
    };
    expect(blogs.blogs.nodes[0]?.handle).toBe("journal");
    expect(articles.articles.nodes[0]).toMatchObject({
      blog: { handle: "journal" },
      handle: "neutral-article",
    });
  });
});
