import { describe, expect, it } from "vitest";

import { auditLicenseReport, licenseMap } from "../../../scripts/security/license-policy.mjs";

const policy = {
  schemaVersion: 1,
  approvedExpressions: ["MIT"],
  reviewedExceptions: [
    {
      license: "MPL-2.0",
      packagePattern: "^reviewed-package$",
      reason: "A deliberately narrow exception with a documented distribution rationale.",
    },
  ],
};

describe("production license policy", () => {
  it("normalizes approved and explicitly reviewed package versions", () => {
    const packages = auditLicenseReport(
      {
        MIT: [{ name: "safe-package", versions: ["1.0.0", "2.0.0"] }],
        "MPL-2.0": [{ name: "reviewed-package", versions: ["3.0.0"] }],
      },
      policy,
    );

    expect(packages).toEqual([
      {
        name: "reviewed-package",
        version: "3.0.0",
        license: "MPL-2.0",
        review: "reviewed-exception",
      },
      { name: "safe-package", version: "1.0.0", license: "MIT", review: "approved" },
      { name: "safe-package", version: "2.0.0", license: "MIT", review: "approved" },
    ]);
    expect(licenseMap(packages).get("reviewed-package@3.0.0")).toBe("MPL-2.0");
  });

  it("fails closed for a new license or a different package", () => {
    expect(() =>
      auditLicenseReport({ GPL: [{ name: "surprise", versions: ["1.0.0"] }] }, policy),
    ).toThrow("unreviewed license GPL for surprise");
    expect(() =>
      auditLicenseReport(
        { "MPL-2.0": [{ name: "lookalike-package", versions: ["1.0.0"] }] },
        policy,
      ),
    ).toThrow("unreviewed license MPL-2.0 for lookalike-package");
  });

  it("rejects incomplete reports and over-broad exception configuration", () => {
    expect(() => auditLicenseReport({ MIT: [{ name: "broken", versions: [] }] }, policy)).toThrow(
      "incomplete package entry",
    );
    expect(() =>
      auditLicenseReport(
        { MIT: [{ name: "safe", versions: ["1.0.0"] }] },
        {
          ...policy,
          reviewedExceptions: [
            {
              license: "GPL",
              packagePattern: ".*",
              reason: "This should be rejected because the match is intentionally too broad.",
            },
          ],
        },
      ),
    ).toThrow("invalid reviewed license exception");
  });
});
