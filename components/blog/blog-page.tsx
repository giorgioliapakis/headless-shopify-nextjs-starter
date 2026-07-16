import Link from "next/link";

import { ArticleCard } from "@/components/blog/article-card";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Page } from "@/components/ui/page";
import { Sections } from "@/components/ui/sections";
import type { Blog } from "@/lib/types";

export function BlogPage({ blog, locale }: { blog: Blog; locale: string }) {
  return (
    <Page>
      <Container>
        <Sections>
          <header className="max-w-3xl">
            <h1 className="text-4xl font-medium sm:text-5xl">{blog.title}</h1>
            {blog.seo.description ? (
              <p className="mt-4 text-lg text-muted-foreground">{blog.seo.description}</p>
            ) : null}
          </header>
          {blog.articles.length > 0 ? (
            <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {blog.articles.map((article) => (
                <ArticleCard key={article.id} article={article} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No articles have been published yet.</p>
          )}
          {blog.pageInfo.hasNextPage && blog.pageInfo.endCursor ? (
            <div className="flex justify-center">
              <Button
                render={
                  <Link
                    href={`/blogs/${blog.handle}?after=${encodeURIComponent(blog.pageInfo.endCursor)}`}
                  />
                }
              >
                Older articles
              </Button>
            </div>
          ) : null}
        </Sections>
      </Container>
    </Page>
  );
}
