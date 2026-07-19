import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BlogPage } from "@/components/blog/blog-page";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocale } from "@/lib/params";
import { buildAlternates, buildOpenGraph } from "@/lib/seo";
import { getBlog, getBlogs } from "@/lib/shopify/operations/blogs";
import type { SearchParamsPromise } from "@/lib/types";

const PLACEHOLDER_HANDLE = "__placeholder__";

export async function generateStaticParams() {
  try {
    const blogs = await getBlogs();
    return blogs.length > 0
      ? blogs.map(({ handle }) => ({ handle }))
      : [{ handle: PLACEHOLDER_HANDLE }];
  } catch {
    return [{ handle: PLACEHOLDER_HANDLE }];
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/blogs/[handle]">): Promise<Metadata> {
  const [{ handle }, locale] = await Promise.all([params, getLocale()]);
  if (handle === PLACEHOLDER_HANDLE) return {};
  const blog = await getBlog({ handle, locale });
  if (!blog) notFound();
  const pathname = `/blogs/${blog.handle}`;
  return {
    alternates: buildAlternates({ pathname }),
    description: blog.seo.description,
    openGraph: buildOpenGraph({
      description: blog.seo.description,
      title: blog.seo.title,
      type: "website",
      url: pathname,
    }),
    title: blog.seo.title,
  };
}

export default function ShopifyBlog(
  props: PageProps<"/blogs/[handle]"> & {
    searchParams: SearchParamsPromise;
  },
) {
  return (
    <Suspense fallback={<BlogPageSkeleton />}>
      <BlogContent {...props} />
    </Suspense>
  );
}

async function BlogContent({
  params,
  searchParams,
}: PageProps<"/blogs/[handle]"> & { searchParams: SearchParamsPromise }) {
  const [{ handle }, rawSearchParams, locale] = await Promise.all([
    params,
    searchParams,
    getLocale(),
  ]);
  if (handle === PLACEHOLDER_HANDLE) notFound();
  const rawAfter = Array.isArray(rawSearchParams.after)
    ? rawSearchParams.after[0]
    : rawSearchParams.after;
  const after = rawAfter && rawAfter.length <= 512 ? rawAfter : undefined;
  const blog = await getBlog({ after, handle, locale });
  if (!blog) notFound();
  return <BlogPage blog={blog} locale={locale} />;
}

function BlogPageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-12">
        <div className="grid max-w-3xl gap-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-6 w-full" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="aspect-[4/3] w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
