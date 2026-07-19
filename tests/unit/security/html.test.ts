import { describe, expect, it } from "vitest";

import { sanitizeShopifyHighlightHtml } from "@/lib/security/highlight";
import { sanitizeShopifyHtml } from "@/lib/security/html";

describe("Shopify rich-content boundary", () => {
  it("keeps useful editorial HTML and removes executable or styling surfaces", () => {
    const result = sanitizeShopifyHtml(`
      <h2 class="source-theme" onclick="alert(1)">Sizing</h2>
      <p style="position:fixed">Use <strong>your usual size</strong>.</p>
      <script>alert(document.cookie)</script>
      <a href="javascript:alert(1)" target="_blank">bad</a>
      <a href="https://example.com/help" target="_blank">help</a>
      <img src="https://cdn.shopify.com/s/files/fixture.jpg" onerror="alert(1)" alt="Guide" width="800">
    `);

    expect(result).toContain("<h2>Sizing</h2>");
    expect(result).toContain("<strong>your usual size</strong>");
    expect(result).toContain(
      'href="https://example.com/help" target="_blank" rel="noopener noreferrer"',
    );
    expect(result).toContain('src="https://cdn.shopify.com/s/files/fixture.jpg"');
    expect(result).not.toMatch(/script|onclick|onerror|style=|javascript:/i);
  });

  it("escapes malformed and unknown markup rather than passing it through", () => {
    expect(
      sanitizeShopifyHtml('<custom data-x="1"><img src="data:text/html,bad">ok</custom>'),
    ).toBe('<img loading="lazy" decoding="async">ok');
    expect(sanitizeShopifyHtml("2 < 3 &amp; 4 > 1")).toBe("2 &lt; 3 &amp; 4 &gt; 1");
  });

  it("allows only emphasis in predictive-search highlights", () => {
    expect(sanitizeShopifyHighlightHtml("<b>shoe</b><img src=x onerror=alert(1)>")).toBe(
      "<b>shoe</b>&lt;img src=x onerror=alert(1)&gt;",
    );
  });
});
