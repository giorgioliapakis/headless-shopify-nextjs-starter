import { describe, expect, it } from "vitest";

import {
  attachSnapshotIdentity,
  buildSourceDrift,
  snapshotIdentity,
} from "../../../migration/lib/drift.mjs";

const baseline = {
  schemaVersion: 1,
  capturedAt: "2026-01-01T00:00:00.000Z",
  source: {
    origin: "https://example.com",
    mode: "credential-free-public",
    evidenceTrust: "untrusted",
  },
  robots: { sha256: "a", disallow: [] },
  sitemap: { fetchedCount: 1, discoveredCount: 2, errors: [] },
  pages: [
    { url: "https://example.com/", path: "/", type: "home", status: 200, bodySha256: "home" },
    {
      url: "https://example.com/products/one",
      path: "/products/one",
      type: "product",
      status: 200,
      bodySha256: "one",
    },
  ],
};

describe("public snapshot drift", () => {
  it("creates a timestamp-independent content identity", () => {
    const later = { ...baseline, capturedAt: "2026-02-01T00:00:00.000Z" };
    expect(snapshotIdentity(later)).toBe(snapshotIdentity(baseline));
    expect(attachSnapshotIdentity(baseline).snapshotId).toMatch(/^[a-f0-9]{64}$/);
  });

  it("classifies route changes and their invalidation scope", () => {
    const previous = attachSnapshotIdentity(baseline);
    const current = attachSnapshotIdentity({
      ...baseline,
      pages: [
        { ...baseline.pages[0], bodySha256: "changed-home" },
        {
          url: "https://example.com/collections/new",
          path: "/collections/new",
          type: "collection",
          status: 200,
          bodySha256: "new",
        },
      ],
    });
    const drift = buildSourceDrift(previous, current);

    expect(drift).toMatchObject({
      status: "changed",
      unchangedCount: 0,
      invalidates: ["reconstruction", "verification", "review-decisions"],
    });
    expect(drift.added.map((page) => page.path)).toEqual(["/collections/new"]);
    expect(drift.removed.map((page) => page.path)).toEqual(["/products/one"]);
    expect(drift.changed).toEqual([expect.objectContaining({ path: "/", fields: ["bodySha256"] })]);
  });

  it("distinguishes the first baseline from an unchanged recapture", () => {
    const current = attachSnapshotIdentity(baseline);
    expect(buildSourceDrift(null, current).status).toBe("baseline");
    expect(buildSourceDrift(current, { ...current, capturedAt: "later" }).status).toBe("unchanged");
  });
});
