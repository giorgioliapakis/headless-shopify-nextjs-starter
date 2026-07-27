import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";

import { Container } from "@/components/ui/container";
import { Page } from "@/components/ui/page";
import { Sections } from "@/components/ui/sections";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocale } from "@/lib/params";
import { buildAlternates, buildOpenGraph } from "@/lib/seo";
import { getBlogs } from "@/lib/shopify/operations/blogs";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blogs");
  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    alternates: buildAlternates({ pathname: "/blogs" }),
    openGraph: buildOpenGraph({ title, description, url: "/blogs", type: "website" }),
  };
}

export default async function BlogsPage() {
  const t = await getTranslations("blogs");

  return (
    <Page className="pt-2.5 md:pt-10">
      <Container>
        <Sections className="gap-5">
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl">{t("title")}</h1>
            <p className="mt-1 leading-6 text-muted-foreground">{t("description")}</p>
          </div>
          <Suspense fallback={<BlogListSkeleton />}>
            <BlogList />
          </Suspense>
        </Sections>
      </Container>
    </Page>
  );
}

async function BlogList() {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("blogs")]);
  const blogs = await getBlogs(locale);

  if (blogs.length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {blogs.map((blog) => (
        <li key={blog.handle}>
          <Link
            href={`/blogs/${blog.handle}`}
            className="block rounded-lg border p-5 transition-colors hover:bg-muted/50"
          >
            <h2 className="text-lg font-medium">{blog.title}</h2>
            {blog.seo.description ? (
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                {blog.seo.description}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BlogListSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-28 w-full" />
      ))}
    </div>
  );
}
