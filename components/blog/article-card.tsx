import Image from "next/image";
import Link from "next/link";

import type { ArticleSummary } from "@/lib/types";

export function ArticleCard({ article, locale }: { article: ArticleSummary; locale: string }) {
  const href = `/blogs/${article.blog.handle}/${article.handle}`;
  return (
    <article className="grid content-start gap-3">
      <Link href={href} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {article.image ? (
          <Image
            src={article.image.url}
            alt={article.image.altText || article.title}
            fill
            className="object-cover transition-transform duration-300 hover:scale-[1.02]"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          />
        ) : null}
      </Link>
      <div className="grid gap-1.5">
        <p className="text-xs text-muted-foreground">
          {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
            new Date(article.publishedAt),
          )}
        </p>
        <h2 className="text-xl font-medium leading-tight">
          <Link href={href} className="hover:opacity-70">
            {article.title}
          </Link>
        </h2>
        {article.excerpt ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{article.excerpt}</p>
        ) : null}
      </div>
    </article>
  );
}
