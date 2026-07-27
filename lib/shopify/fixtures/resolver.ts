/**
 * The single fixture resolver. Every mode shares these query semantics —
 * handle/id lookup, relay pagination, sort keys, `ProductFilter` narrowing,
 * search matching, facets and cart state — and differs only in its dataset.
 *
 * A dataset may pin individual operations through `overrides`. That escape hatch
 * exists so the frozen `neutral` determinism contract keeps its exact legacy
 * payloads while richer datasets get the real semantics.
 */

import {
  addCartLines,
  createCart,
  type FixtureCartLineInput,
  queryCart,
  removeCartLines,
  updateCartDiscountCodes,
  updateCartLines,
  updateCartNote,
} from "./cart";
import { buildFacets } from "./facets";
import {
  matchesProductFilters,
  matchesProductQuery,
  paginate,
  parseProductQuery,
  readProductFilters,
  sortProducts,
} from "./query";
import type { FixtureArticle, FixtureDataset, FixtureProduct, FixtureProductCard } from "./types";

function productCard(product: FixtureProduct): FixtureProductCard {
  return {
    availableForSale: product.availableForSale,
    compareAtPriceRange: product.compareAtPriceRange,
    featuredImage: product.featuredImage,
    handle: product.handle,
    id: product.id,
    priceRange: product.priceRange,
    selectedOrFirstAvailableVariant: product.selectedOrFirstAvailableVariant,
    title: product.title,
    vendor: product.vendor,
  };
}

function selectProducts(
  dataset: FixtureDataset,
  variables: Record<string, unknown>,
  options: { collection?: string; query?: string } = {},
): FixtureProduct[] {
  const query = options.query ?? (typeof variables.query === "string" ? variables.query : "");
  const parsed = parseProductQuery(query);
  const filters = readProductFilters(variables.productFilters ?? variables.filters);
  let products = dataset.products.filter(
    (product) =>
      matchesProductQuery(dataset, product, parsed) && matchesProductFilters(product, filters),
  );

  if (options.collection) {
    const members = dataset.collectionProducts[options.collection];
    if (!members) return [];
    products = members
      .map((handle) => products.find((product) => product.handle === handle))
      .filter((product): product is FixtureProduct => product !== undefined);
  }

  return sortProducts(products, variables.sortKey, variables.reverse);
}

function collectionMembers(dataset: FixtureDataset, handle: string): FixtureProduct[] {
  const members = dataset.collectionProducts[handle] ?? [];
  return members
    .map((productHandle) => dataset.products.find((product) => product.handle === productHandle))
    .filter((product): product is FixtureProduct => product !== undefined);
}

function findProduct(dataset: FixtureDataset, handle: unknown): FixtureProduct | null {
  return dataset.products.find((product) => product.handle === handle) ?? null;
}

function findProductById(dataset: FixtureDataset, id: unknown): FixtureProduct | null {
  return dataset.products.find((product) => product.id === id) ?? null;
}

function selectVariant(product: FixtureProduct, selectedOptions: unknown) {
  const wanted = Array.isArray(selectedOptions)
    ? (selectedOptions as Array<{ name?: string; value?: string }>)
    : [];
  if (wanted.length === 0) return product.selectedOrFirstAvailableVariant;
  const variants = product.variants.edges.map((edge) => edge.node);
  const matched = variants.find((variant) =>
    wanted.every((option) =>
      variant.selectedOptions.some(
        (selected) =>
          selected.name.toLowerCase() === String(option.name).toLowerCase() &&
          selected.value.toLowerCase() === String(option.value).toLowerCase(),
      ),
    ),
  );
  return matched ?? product.selectedOrFirstAvailableVariant;
}

function recommendations(dataset: FixtureDataset, handle: unknown): FixtureProductCard[] {
  const product = findProduct(dataset, handle);
  if (!product) return [];
  const handles = new Set(product.collections.edges.map((edge) => edge.node.handle));
  const related = dataset.products.filter(
    (candidate) =>
      candidate.handle !== product.handle &&
      candidate.collections.edges.some((edge) => handles.has(edge.node.handle)),
  );
  const pool =
    related.length > 0 ? related : dataset.products.filter((c) => c.handle !== product.handle);
  return pool.slice(0, 8).map(productCard);
}

function blogArticles(dataset: FixtureDataset, handle: string): FixtureArticle[] {
  return dataset.articles
    .filter((article) => article.blog.handle === handle)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function paginateNodes<T>(
  nodes: T[],
  variables: Record<string, unknown>,
  cursor: (node: T) => string,
) {
  const after = typeof variables.after === "string" ? variables.after : undefined;
  const start = after ? nodes.findIndex((node) => cursor(node) === after) + 1 : 0;
  const requested = Number(variables.first);
  const first = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 50;
  const window = nodes.slice(start, start + first);
  return {
    nodes: window,
    pageInfo: {
      endCursor: window.length > 0 ? cursor(window[window.length - 1] as T) : null,
      hasNextPage: start + first < nodes.length,
      hasPreviousPage: start > 0,
      startCursor: window.length > 0 ? cursor(window[0] as T) : null,
    },
  };
}

function sitemapResources(dataset: FixtureDataset, type: unknown) {
  if (type === "COLLECTION") {
    return dataset.collections.map((collection) => ({
      handle: collection.handle,
      updatedAt: collection.updatedAt,
    }));
  }
  if (type === "PAGE") {
    return dataset.pages.map((page) => ({ handle: page.handle, updatedAt: page.updatedAt }));
  }
  return dataset.products.map((product) => ({
    handle: product.handle,
    updatedAt: product.updatedAt,
  }));
}

function cartMutationPayload(cart: unknown) {
  return { cart, userErrors: [], warnings: [] };
}

function readLines(value: unknown): FixtureCartLineInput[] {
  return Array.isArray(value) ? (value as FixtureCartLineInput[]) : [];
}

// One switch mirrors the Storefront operation surface on purpose: it is the
// single place to see everything the fixtures answer.
export function resolveFixtureOperation(
  dataset: FixtureDataset,
  operation: string,
  variables: Record<string, unknown> = {},
): Record<string, unknown> | null {
  const override = dataset.overrides[operation];
  if (override) return override(variables);

  switch (operation) {
    case "searchProducts": {
      const products = selectProducts(dataset, variables);
      const page = paginate(dataset, products, variables);
      return {
        search: {
          edges: page.edges.map((edge) => ({
            cursor: edge.cursor,
            node: productCard(edge.product),
          })),
          pageInfo: page.pageInfo,
          totalCount: products.length,
        },
      };
    }
    case "catalogProducts": {
      const products = selectProducts(dataset, variables);
      const page = paginate(dataset, products, variables);
      return {
        products: {
          edges: page.edges.map((edge) => ({
            cursor: edge.cursor,
            node: productCard(edge.product),
          })),
          pageInfo: page.pageInfo,
        },
      };
    }
    case "searchFacets": {
      const products = selectProducts(dataset, variables);
      const unfiltered = selectProducts(
        dataset,
        { query: variables.query },
        { query: typeof variables.query === "string" ? variables.query : undefined },
      );
      return {
        search: {
          nodes: products.slice(0, 1).map(productCard),
          productFilters: buildFacets(unfiltered),
          totalCount: products.length,
        },
      };
    }
    case "collectionProducts": {
      const handle = String(variables.handle ?? variables.collection ?? "");
      const known = handle in dataset.collectionProducts;
      if (!known) return { collection: null };
      const members = collectionMembers(dataset, handle);
      const filters = readProductFilters(variables.filters);
      const filtered = sortProducts(
        members.filter((product) => matchesProductFilters(product, filters)),
        variables.sortKey,
        variables.reverse,
      );
      const page = paginate(dataset, filtered, variables);
      return {
        collection: {
          products: {
            edges: page.edges.map((edge) => ({
              cursor: edge.cursor,
              node: productCard(edge.product),
            })),
            filters: buildFacets(members),
            pageInfo: page.pageInfo,
          },
        },
      };
    }
    case "getCollections":
      return { collections: { edges: dataset.collections.map((node) => ({ node })) } };
    case "getCollectionsWithFeaturedImage":
      return {
        collections: {
          edges: dataset.collections.map((collection) => {
            const first = collectionMembers(dataset, collection.handle)[0];
            return {
              node: {
                ...collection,
                products: {
                  edges: first
                    ? [{ node: { featuredImage: first.featuredImage, id: first.id } }]
                    : [],
                },
              },
            };
          }),
        },
      };
    case "getProductsByHandles": {
      const products = selectProducts(dataset, variables);
      return { products: { edges: products.map((product) => ({ node: productCard(product) })) } };
    }
    case "getCollection":
      return {
        collection:
          dataset.collections.find((collection) => collection.handle === variables.handle) ?? null,
      };
    case "getProductByHandle":
    case "getProductByHandleWithBundles":
    case "getProductWithVariants":
      return { productByHandle: findProduct(dataset, variables.handle) };
    case "getProductVariant":
    case "getProductVariantWithBundles": {
      const product = findProduct(dataset, variables.handle);
      return {
        productByHandle: product
          ? { selectedOrFirstAvailableVariant: selectVariant(product, variables.selectedOptions) }
          : null,
      };
    }
    case "getProductById":
      return { node: findProductById(dataset, variables.id) };
    case "getProductsByIds": {
      const ids = Array.isArray(variables.ids) ? variables.ids : [];
      return {
        nodes: ids.map((id) => {
          const product = findProductById(dataset, id);
          return product ? productCard(product) : null;
        }),
      };
    }
    case "nodeHandles": {
      const ids = Array.isArray(variables.ids) ? variables.ids : [];
      return {
        nodes: ids.map((id) => {
          const product = findProductById(dataset, id);
          return product ? { handle: product.handle, id: product.id } : null;
        }),
      };
    }
    case "complementaryProducts":
      return { productRecommendations: recommendations(dataset, variables.handle).slice(0, 4) };
    case "relatedProducts":
      return { productRecommendations: recommendations(dataset, variables.handle) };
    case "getMenu":
      return { menu: dataset.menus[String(variables.handle ?? "")] ?? null };
    case "getPage":
      return { page: dataset.pages.find((page) => page.handle === variables.handle) ?? null };
    case "getBlogs":
      return { blogs: { nodes: dataset.blogs } };
    case "getBlog": {
      const blog = dataset.blogs.find((entry) => entry.handle === variables.handle);
      if (!blog) return { blog: null };
      const page = paginateNodes(
        blogArticles(dataset, blog.handle),
        variables,
        (article) => article.handle,
      );
      return { blog: { ...blog, articles: { nodes: page.nodes, pageInfo: page.pageInfo } } };
    }
    case "getArticle": {
      const blog = dataset.blogs.find((entry) => entry.handle === variables.blogHandle);
      if (!blog) return { blog: null };
      return {
        blog: {
          articleByHandle:
            dataset.articles.find(
              (article) =>
                article.blog.handle === blog.handle && article.handle === variables.articleHandle,
            ) ?? null,
        },
      };
    }
    case "getBlogSitemap": {
      const page = paginateNodes(dataset.blogs, variables, (blog) => blog.handle);
      return {
        blogs: {
          nodes: page.nodes.map((blog) => ({ handle: blog.handle })),
          pageInfo: page.pageInfo,
        },
      };
    }
    case "getArticleSitemap": {
      const page = paginateNodes(dataset.articles, variables, (article) => article.handle);
      return {
        articles: {
          nodes: page.nodes.map((article) => ({
            blog: { handle: article.blog.handle },
            handle: article.handle,
            publishedAt: article.publishedAt,
          })),
          pageInfo: page.pageInfo,
        },
      };
    }
    case "getShopPolicies":
      return {
        shop: {
          contactInformation: dataset.policies.contactInformation ?? null,
          legalNotice: dataset.policies.legalNotice ?? null,
          privacyPolicy: dataset.policies.privacyPolicy ?? null,
          refundPolicy: dataset.policies.refundPolicy ?? null,
          shippingPolicy: dataset.policies.shippingPolicy ?? null,
          termsOfSale: dataset.policies.termsOfSale ?? null,
          termsOfService: dataset.policies.termsOfService ?? null,
        },
      };
    case "shopAnalytics":
      return {
        localization: { country: { currency: { isoCode: dataset.currencyCode } } },
        shop: { id: dataset.shopId },
      };
    case "predictiveSearch": {
      const raw = typeof variables.query === "string" ? variables.query.trim() : "";
      const requested = Number(variables.limit);
      const limit = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 4;
      const parsed = parseProductQuery(raw);
      const products = dataset.products.filter((product) =>
        matchesProductQuery(dataset, product, parsed),
      );
      const term = raw.toLowerCase();
      const collections = dataset.collections.filter(
        (collection) => !term || collection.title.toLowerCase().includes(term),
      );
      return {
        predictiveSearch: {
          articles: [],
          collections: collections
            .slice(0, limit)
            .map((collection) => ({ handle: collection.handle, title: collection.title })),
          pages: [],
          products: products.slice(0, limit).map(productCard),
          queries: products.slice(0, limit).map((product) => ({
            styledText: product.title,
            text: product.title,
          })),
        },
      };
    }
    case "getSitemapPagesCount": {
      const resources = sitemapResources(dataset, variables.type);
      return { sitemap: { pagesCount: { count: resources.length > 0 ? 1 : 0 } } };
    }
    case "getSitemapPage": {
      const resources = sitemapResources(dataset, variables.type);
      const page = Number(variables.page) || 1;
      return {
        sitemap: {
          resources: { hasNextPage: false, items: page === 1 ? resources : [] },
        },
      };
    }
    case "getCart":
    case "getCartDeliveryOptions":
    case "getCartSelectableAddresses":
      return { cart: null };
    case "Cart":
      return { cart: queryCart(dataset, variables.id) };
    case "CartCreate":
      return {
        cartCreate: cartMutationPayload(
          createCart(dataset, (variables.input ?? {}) as Record<string, unknown>),
        ),
      };
    case "CartLinesAdd":
      return {
        cartLinesAdd: cartMutationPayload(
          addCartLines(dataset, variables.cartId, readLines(variables.lines)),
        ),
      };
    case "CartLinesUpdate":
      return {
        cartLinesUpdate: cartMutationPayload(
          updateCartLines(dataset, variables.cartId, readLines(variables.lines)),
        ),
      };
    case "CartLinesRemove":
      return {
        cartLinesRemove: cartMutationPayload(
          removeCartLines(dataset, variables.cartId, variables.lineIds),
        ),
      };
    case "CartDiscountCodesUpdate":
      return {
        cartDiscountCodesUpdate: cartMutationPayload(
          updateCartDiscountCodes(dataset, variables.cartId, variables.discountCodes),
        ),
      };
    case "CartNoteUpdate":
      return {
        cartNoteUpdate: cartMutationPayload(
          updateCartNote(dataset, variables.cartId, variables.note),
        ),
      };
    case "CartBuyerIdentityUpdate":
      return {
        cartBuyerIdentityUpdate: {
          cart: { id: String(variables.cartId ?? dataset.cart.idFor(0)) },
          userErrors: [],
        },
      };
    default:
      return null;
  }
}
