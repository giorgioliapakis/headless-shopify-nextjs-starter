import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ArticlePage } from "@/components/blog/article-page";
import { ArticleSchema } from "@/components/blog/article-schema";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocale } from "@/lib/params";
import { buildAlternates, buildOpenGraph } from "@/lib/seo";
import { getArticle, getBlog, getBlogs } from "@/lib/shopify/operations/blogs";

const PLACEHOLDER_HANDLE = "__placeholder__";

export async function generateStaticParams() {
  try {
    const blogs = await getBlogs();
    const results = await Promise.all(
      blogs.map(async (blog) => {
        const detail = await getBlog({ handle: blog.handle });
        return (
          detail?.articles.map((article) => ({
            article: article.handle,
            handle: blog.handle,
          })) ?? []
        );
      }),
    );
    const params = results.flat();
    return params.length > 0
      ? params
      : [{ article: PLACEHOLDER_HANDLE, handle: PLACEHOLDER_HANDLE }];
  } catch {
    return [{ article: PLACEHOLDER_HANDLE, handle: PLACEHOLDER_HANDLE }];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/blogs/[handle]/[article]">): Promise<Metadata> {
  const [{ article, handle }, locale] = await Promise.all([params, getLocale()]);
  if (handle === PLACEHOLDER_HANDLE || article === PLACEHOLDER_HANDLE) return {};
  const entry = await getArticle({ articleHandle: article, blogHandle: handle, locale });
  if (!entry) notFound();
  const pathname = `/blogs/${entry.blog.handle}/${entry.handle}`;
  return {
    alternates: buildAlternates({ pathname }),
    description: entry.seo.description,
    openGraph: buildOpenGraph({
      description: entry.seo.description,
      images: entry.image ? [{ url: entry.image.url }] : undefined,
      title: entry.seo.title,
      type: "article",
      url: pathname,
    }),
    title: entry.seo.title,
  };
}

export default function ShopifyArticle(props: PageProps<"/blogs/[handle]/[article]">) {
  return (
    <Suspense fallback={<ArticlePageSkeleton />}>
      <ArticleContent {...props} />
    </Suspense>
  );
}

async function ArticleContent({ params }: PageProps<"/blogs/[handle]/[article]">) {
  const [{ article, handle }, locale] = await Promise.all([params, getLocale()]);
  if (handle === PLACEHOLDER_HANDLE || article === PLACEHOLDER_HANDLE) notFound();
  const entry = await getArticle({ articleHandle: article, blogHandle: handle, locale });
  if (!entry) notFound();
  return (
    <>
      <ArticleSchema article={entry} />
      <ArticlePage article={entry} locale={locale} />
    </>
  );
}

function ArticlePageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="aspect-[16/9] w-full" />
        <div className="grid gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    </main>
  );
}
