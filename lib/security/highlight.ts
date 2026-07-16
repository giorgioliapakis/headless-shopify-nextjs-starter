const HIGHLIGHT_TAG = /<\/?(?:b|strong|em)>/gi;

/** Allows only Shopify's emphasis tags and escapes all other predictive-search markup. */
export function sanitizeShopifyHighlightHtml(source: string): string {
  const tokens: string[] = [];
  const tokenized = source.replace(HIGHLIGHT_TAG, (tag) => {
    const index = tokens.push(tag.toLowerCase()) - 1;
    return `__HIGHLIGHT_${index}__`;
  });
  return tokenized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/__HIGHLIGHT_(\d+)__/g, (_match, index: string) => tokens[Number(index)] ?? "");
}
