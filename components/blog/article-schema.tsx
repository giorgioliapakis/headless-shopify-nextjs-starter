import type { Article } from "@/lib/types";
import { shopConfig } from "@/shop.config";

export function ArticleSchema({ article }: { article: Article }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    author: article.author ? { "@type": "Person", name: article.author } : undefined,
    datePublished: article.publishedAt,
    description: article.seo.description || article.excerpt || undefined,
    headline: article.title,
    image: article.image?.url,
    mainEntityOfPage: `${shopConfig.site.url}/blogs/${article.blog.handle}/${article.handle}`,
    publisher: { "@type": "Organization", name: shopConfig.site.name },
  };
  return <script type="application/ld+json">{JSON.stringify(schema)}</script>;
}
