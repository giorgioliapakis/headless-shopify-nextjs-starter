const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "div",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);
const VOID_TAGS = new Set(["br", "hr", "img"]);
const DANGEROUS_BLOCKS = [
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "form",
  "template",
];
const TAG_PATTERN = /<!--[^]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>/g;
const ATTRIBUTE_PATTERN = /([A-Za-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

/**
 * Reconstructs Shopify rich text from an allowlist. Source HTML is never trusted, even though Shopify
 * sanitizes its own editors, because migration and app content can enter through several producers.
 */
export function sanitizeShopifyHtml(source: string): string {
  let html = source;
  for (const tag of DANGEROUS_BLOCKS) {
    html = html.replace(new RegExp(`<\\s*${tag}\\b[^>]*>[^]*?<\\s*\\/${tag}\\s*>`, "gi"), "");
  }

  let output = "";
  let cursor = 0;
  for (const match of html.matchAll(TAG_PATTERN)) {
    const index = match.index ?? cursor;
    output += escapeText(html.slice(cursor, index));
    output += sanitizeTag(match[0]);
    cursor = index + match[0].length;
  }
  output += escapeText(html.slice(cursor));
  return output;
}

function sanitizeTag(rawTag: string): string {
  if (rawTag.startsWith("<!--") || rawTag.startsWith("<!")) return "";
  const name = rawTag.match(/^<\/?\s*([A-Za-z][\w-]*)/)?.[1]?.toLowerCase();
  if (!name || !ALLOWED_TAGS.has(name)) return "";
  const closing = /^<\//.test(rawTag);
  if (closing) return VOID_TAGS.has(name) ? "" : `</${name}>`;

  const attributes: string[] = [];
  for (const match of rawTag.matchAll(ATTRIBUTE_PATTERN)) {
    const attribute = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    const sanitized = sanitizeAttribute(name, attribute, value);
    if (sanitized) attributes.push(sanitized);
  }

  if (name === "a" && /\starget="_blank"/.test(` ${attributes.join(" ")}`)) {
    attributes.push('rel="noopener noreferrer"');
  }
  if (name === "img") attributes.push('loading="lazy"', 'decoding="async"');
  return `<${name}${attributes.length > 0 ? ` ${attributes.join(" ")}` : ""}>`;
}

function sanitizeAttribute(
  tag: string,
  attribute: string | undefined,
  value: string,
): string | null {
  if (!attribute) return null;
  if (tag === "a" && attribute === "href" && isSafeLink(value)) {
    return `href="${escapeAttribute(value)}"`;
  }
  if (tag === "a" && attribute === "title") return `title="${escapeAttribute(value)}"`;
  if (tag === "a" && attribute === "target" && value === "_blank") return 'target="_blank"';
  if (tag === "img" && attribute === "src" && isSafeImage(value)) {
    return `src="${escapeAttribute(value)}"`;
  }
  if (tag === "img" && attribute === "alt") return `alt="${escapeAttribute(value)}"`;
  if (
    tag === "img" &&
    (attribute === "width" || attribute === "height") &&
    /^\d{1,5}$/.test(value)
  ) {
    return `${attribute}="${value}"`;
  }
  if (
    (tag === "td" || tag === "th") &&
    (attribute === "colspan" || attribute === "rowspan") &&
    /^\d{1,2}$/.test(value)
  ) {
    return `${attribute}="${value}"`;
  }
  return null;
}

function isSafeLink(value: string): boolean {
  const normalized = value.trim();
  return (
    normalized.startsWith("/") ||
    normalized.startsWith("#") ||
    /^https:\/\//i.test(normalized) ||
    /^(?:mailto|tel):/i.test(normalized)
  );
}

function isSafeImage(value: string): boolean {
  const normalized = value.trim();
  return normalized.startsWith("/") || /^https:\/\/cdn\.shopify\.com\//i.test(normalized);
}

function escapeText(value: string): string {
  return value
    .replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
