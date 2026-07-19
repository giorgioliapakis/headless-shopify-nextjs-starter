import { gql } from "@shopify/hydrogen";
import { cacheLife, cacheTag } from "next/cache";

import { defaultLocale, getCountryCode, getLanguageCode } from "@/lib/i18n";
import type { Article, ArticleSummary, Blog, BlogSummary, Image, PageInfo } from "@/lib/types";

import { assertStorefrontOk } from "../errors";
import { storefront } from "../storefront";

interface ShopifyImage {
  altText: string | null;
  height: number;
  url: string;
  width: number;
}

interface ShopifyArticle {
  authorV2: { name: string } | null;
  blog: { handle: string; title: string };
  contentHtml?: string;
  excerpt: string | null;
  handle: string;
  id: string;
  image: ShopifyImage | null;
  publishedAt: string;
  seo: { description: string | null; title: string | null } | null;
  tags: string[];
  title: string;
}

interface ShopifyBlog {
  handle: string;
  id: string;
  seo: { description: string | null; title: string | null } | null;
  title: string;
}

const ARTICLE_SUMMARY_FRAGMENT = gql(`
  fragment ArticleSummaryFields on Article {
    id
    handle
    title
    excerpt
    publishedAt
    tags
    authorV2 { name }
    blog { handle title }
    image { url altText width height }
    seo { title description }
  }
`);

const GET_BLOGS_QUERY = gql(`
  query getBlogs($first: Int!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    blogs(first: $first, sortKey: TITLE) {
      nodes { id handle title seo { title description } }
    }
  }
`);

const GET_BLOG_QUERY = gql(
  `
  query getBlog(
    $handle: String!
    $first: Int!
    $after: String
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    blog(handle: $handle) {
      id
      handle
      title
      seo { title description }
      articles(first: $first, after: $after, sortKey: PUBLISHED_AT, reverse: true) {
        nodes { ...ArticleSummaryFields }
        pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      }
    }
  }
`,
  [ARTICLE_SUMMARY_FRAGMENT],
);

const GET_ARTICLE_QUERY = gql(
  `
  query getArticle(
    $blogHandle: String!
    $articleHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    blog(handle: $blogHandle) {
      articleByHandle(handle: $articleHandle) {
        ...ArticleSummaryFields
        contentHtml
      }
    }
  }
`,
  [ARTICLE_SUMMARY_FRAGMENT],
);

const GET_BLOG_SITEMAP_QUERY = gql(`
  query getBlogSitemap($first: Int!, $after: String) {
    blogs(first: $first, after: $after, sortKey: TITLE) {
      nodes { handle }
      pageInfo { hasNextPage endCursor }
    }
  }
`);

const GET_ARTICLE_SITEMAP_QUERY = gql(`
  query getArticleSitemap($first: Int!, $after: String) {
    articles(first: $first, after: $after, sortKey: PUBLISHED_AT) {
      nodes { handle publishedAt blog { handle } }
      pageInfo { hasNextPage endCursor }
    }
  }
`);

function image(value: ShopifyImage | null): Image | null {
  return value
    ? {
        altText: value.altText ?? "",
        height: value.height,
        url: value.url,
        width: value.width,
      }
    : null;
}

function blogSummary(value: ShopifyBlog): BlogSummary {
  return {
    handle: value.handle,
    id: value.id,
    seo: {
      description: value.seo?.description ?? "",
      title: value.seo?.title ?? value.title,
    },
    title: value.title,
  };
}

function articleSummary(value: ShopifyArticle): ArticleSummary {
  return {
    author: value.authorV2?.name ?? null,
    blog: value.blog,
    excerpt: value.excerpt ?? "",
    handle: value.handle,
    id: value.id,
    image: image(value.image),
    publishedAt: value.publishedAt,
    seo: {
      description: value.seo?.description ?? value.excerpt ?? "",
      title: value.seo?.title ?? value.title,
    },
    tags: value.tags,
    title: value.title,
  };
}

export async function getBlogs(locale: string = defaultLocale): Promise<BlogSummary[]> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("blogs");
  const response = await storefront.request<{ blogs: { nodes: ShopifyBlog[] } }>(GET_BLOGS_QUERY, {
    variables: {
      country: getCountryCode(locale),
      first: 50,
      language: getLanguageCode(locale),
    },
  });
  assertStorefrontOk(response, "getBlogs");
  return response.data.blogs.nodes.map(blogSummary);
}

export async function getBlog({
  after,
  handle,
  locale = defaultLocale,
}: {
  after?: string;
  handle: string;
  locale?: string;
}): Promise<Blog | undefined> {
  "use cache";
  cacheLife("hours");
  cacheTag("blogs", `blog-${handle}`);
  const response = await storefront.request<{
    blog: (ShopifyBlog & { articles: { nodes: ShopifyArticle[]; pageInfo: PageInfo } }) | null;
  }>(GET_BLOG_QUERY, {
    variables: {
      after,
      country: getCountryCode(locale),
      first: 24,
      handle,
      language: getLanguageCode(locale),
    },
  });
  assertStorefrontOk(response, "getBlog");
  if (!response.data.blog) return undefined;
  return {
    ...blogSummary(response.data.blog),
    articles: response.data.blog.articles.nodes.map(articleSummary),
    pageInfo: response.data.blog.articles.pageInfo,
  };
}

export async function getArticle({
  articleHandle,
  blogHandle,
  locale = defaultLocale,
}: {
  articleHandle: string;
  blogHandle: string;
  locale?: string;
}): Promise<Article | undefined> {
  "use cache";
  cacheLife("hours");
  cacheTag("blogs", `blog-${blogHandle}`, `article-${blogHandle}-${articleHandle}`);
  const response = await storefront.request<{
    blog: { articleByHandle: ShopifyArticle | null } | null;
  }>(GET_ARTICLE_QUERY, {
    variables: {
      articleHandle,
      blogHandle,
      country: getCountryCode(locale),
      language: getLanguageCode(locale),
    },
  });
  assertStorefrontOk(response, "getArticle");
  const value = response.data.blog?.articleByHandle;
  return value ? { ...articleSummary(value), contentHtml: value.contentHtml ?? "" } : undefined;
}

export async function getBlogSitemapResources(): Promise<
  Array<{ pathname: string; updatedAt?: string }>
> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("blogs");

  const resources: Array<{ pathname: string; updatedAt?: string }> = [];
  let blogCursor: string | undefined;
  let articleCursor: string | undefined;
  for (let page = 0; page < 200; page++) {
    const response = await storefront.request<{
      blogs: {
        nodes: Array<{ handle: string }>;
        pageInfo: { endCursor: string | null; hasNextPage: boolean };
      };
    }>(GET_BLOG_SITEMAP_QUERY, { variables: { after: blogCursor, first: 250 } });
    assertStorefrontOk(response, "getBlogSitemap");
    resources.push(
      ...response.data.blogs.nodes.map(({ handle }) => ({ pathname: `/blogs/${handle}` })),
    );
    if (!response.data.blogs.pageInfo.hasNextPage || !response.data.blogs.pageInfo.endCursor) break;
    blogCursor = response.data.blogs.pageInfo.endCursor;
    if (page === 199) throw new Error("Blog sitemap exceeds the supported 50,000-resource bound");
  }
  for (let page = 0; page < 200; page++) {
    const response = await storefront.request<{
      articles: {
        nodes: Array<{
          blog: { handle: string };
          handle: string;
          publishedAt: string;
        }>;
        pageInfo: { endCursor: string | null; hasNextPage: boolean };
      };
    }>(GET_ARTICLE_SITEMAP_QUERY, {
      variables: { after: articleCursor, first: 250 },
    });
    assertStorefrontOk(response, "getArticleSitemap");
    resources.push(
      ...response.data.articles.nodes.map((article) => ({
        pathname: `/blogs/${article.blog.handle}/${article.handle}`,
        updatedAt: article.publishedAt,
      })),
    );
    if (
      !response.data.articles.pageInfo.hasNextPage ||
      !response.data.articles.pageInfo.endCursor
    ) {
      break;
    }
    articleCursor = response.data.articles.pageInfo.endCursor;
    if (page === 199)
      throw new Error("Article sitemap exceeds the supported 50,000-resource bound");
  }
  return resources;
}
