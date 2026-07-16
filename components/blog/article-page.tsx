import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Page } from "@/components/ui/page";
import { Prose } from "@/components/ui/prose";
import { sanitizeShopifyHtml } from "@/lib/security/html";
import type { Article } from "@/lib/types";

export function ArticlePage({ article, locale }: { article: Article; locale: string }) {
  return (
    <Page>
      <Container className="max-w-3xl">
        <article>
          <header className="mb-8 grid gap-4">
            <Link
              href={`/blogs/${article.blog.handle}`}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {article.blog.title}
            </Link>
            <h1 className="text-4xl font-medium leading-tight sm:text-5xl">{article.title}</h1>
            <p className="text-sm text-muted-foreground">
              {article.author ? `${article.author} · ` : null}
              <time dateTime={article.publishedAt}>
                {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(
                  new Date(article.publishedAt),
                )}
              </time>
            </p>
          </header>
          {article.image ? (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-xl bg-muted">
              <Image
                src={article.image.url}
                alt={article.image.altText || article.title}
                fill
                priority
                className="object-cover"
                sizes="(min-width: 768px) 768px, 100vw"
              />
            </div>
          ) : null}
          <Prose>
            <div
              // oxlint-disable-next-line react/no-danger -- reconstructed through the local rich-text allowlist.
              dangerouslySetInnerHTML={{ __html: sanitizeShopifyHtml(article.contentHtml) }}
            />
          </Prose>
        </article>
      </Container>
    </Page>
  );
}
