import { gql } from "@shopify/hydrogen";

export const MONEY_FRAGMENT = gql(`
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`);

export const IMAGE_FRAGMENT = gql(`
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`);

export const PRODUCT_VARIANT_FRAGMENT = gql(
  `
  fragment ProductVariantFields on ProductVariant {
    id
    title
    availableForSale
    price {
      ...MoneyFields
    }
    compareAtPrice {
      ...MoneyFields
    }
    selectedOptions {
      name
      value
    }
    image {
      ...ImageFields
    }
  }
`,
  [IMAGE_FRAGMENT, MONEY_FRAGMENT],
);

export const BUNDLE_COMPONENT_VARIANT_FRAGMENT = gql(`
  fragment BundleComponentVariantFields on ProductVariant {
    id
    title
    image {
      url
      altText
      width
      height
    }
    product {
      id
      title
      handle
      featuredImage {
        url
        altText
        width
        height
      }
    }
  }
`);

export const BUNDLE_RELATIONSHIPS_FRAGMENT = gql(
  `
  fragment BundleRelationshipFields on ProductVariant {
    requiresComponents
    groupedBy(first: 10) {
      nodes {
        ...BundleComponentVariantFields
      }
    }
    # 30 is Shopify's per-bundle component maximum, so this can never truncate
    components(first: 30) {
      nodes {
        quantity
        productVariant {
          ...BundleComponentVariantFields
        }
      }
    }
  }
`,
  [BUNDLE_COMPONENT_VARIANT_FRAGMENT],
);

export const PURCHASABLE_PRODUCT_VARIANT_FRAGMENT = gql(
  `
  fragment PurchasableProductVariantFields on ProductVariant {
    ...BundleRelationshipFields
    ...ProductVariantFields
  }
`,
  [BUNDLE_RELATIONSHIPS_FRAGMENT, PRODUCT_VARIANT_FRAGMENT],
);

export const TAXONOMY_CATEGORY_FRAGMENT = gql(`
  fragment TaxonomyCategoryFields on TaxonomyCategory {
    id
    name
    ancestors {
      id
      name
    }
  }
`);

export const COLLECTION_FIELDS_FRAGMENT = gql(
  `
  fragment CollectionFields on Collection {
    handle
    title
    description
    image {
      ...ImageFields
    }
    updatedAt
    seo {
      title
      description
    }
  }
`,
  [IMAGE_FRAGMENT],
);

export const PRODUCT_FRAGMENT = gql(
  `
  fragment ProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    vendor
    tags
    updatedAt
    availableForSale
    featuredImage {
      ...ImageFields
    }
    media(first: 10) {
      edges {
        node {
          mediaContentType
          ... on MediaImage {
            image {
              ...ImageFields
            }
          }
          ... on Video {
            previewImage {
              ...ImageFields
            }
            sources {
              url
              mimeType
              width
              height
            }
          }
        }
      }
    }
    priceRange {
      minVariantPrice {
        ...MoneyFields
      }
      maxVariantPrice {
        ...MoneyFields
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyFields
      }
      maxVariantPrice {
        ...MoneyFields
      }
    }
    encodedVariantExistence
    encodedVariantAvailability
    variantsCount {
      count
    }
    selectedOrFirstAvailableVariant {
      ...ProductVariantFields
    }
    options {
      id
      name
      optionValues {
        id
        name
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
        firstSelectableVariant {
          image {
            ...ImageFields
          }
        }
      }
    }
    seo {
      title
      description
    }
    category {
      ...TaxonomyCategoryFields
    }
    collections(first: 10) {
      edges {
        node {
          handle
        }
      }
    }
  }
`,
  [PRODUCT_VARIANT_FRAGMENT, TAXONOMY_CATEGORY_FRAGMENT],
);

export const PRODUCT_WITH_VARIANTS_FRAGMENT = gql(
  `
  fragment ProductWithVariantsFields on Product {
    ...ProductFields
    variants(first: 250) {
      edges {
        node {
          ...ProductVariantFields
        }
      }
    }
  }
`,
  [PRODUCT_FRAGMENT],
);

export const PRODUCT_CARD_FRAGMENT = gql(
  `
  fragment ProductCardFields on Product {
    id
    title
    handle
    vendor
    availableForSale
    featuredImage {
      ...ImageFields
    }
    priceRange {
      minVariantPrice {
        ...MoneyFields
      }
      maxVariantPrice {
        ...MoneyFields
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyFields
      }
    }
    selectedOrFirstAvailableVariant {
      id
      availableForSale
      image {
        url
      }
      selectedOptions {
        name
        value
      }
    }
  }
`,
  [IMAGE_FRAGMENT, MONEY_FRAGMENT],
);
