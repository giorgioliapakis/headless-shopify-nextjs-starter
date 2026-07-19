import { describe, expect, it } from "vitest";

import { analyzeUpdate, parseNameStatus } from "../../../scripts/foundation/lib.mjs";

const config = {
  merchantOwned: ["config/presets/", "public/merchant/"],
  generatedMerchantOwned: ["components/merchant/"],
};

describe("foundation update planning", () => {
  it("permits disjoint foundation and downstream work", () => {
    const result = analyzeUpdate(
      config,
      parseNameStatus("M\tlib/shopify/storefront.ts\n"),
      parseNameStatus("M\tconfig/presets/merchant.ts\n"),
    );
    expect(result).toMatchObject({
      safeToMerge: true,
      conflicts: [],
      protectedFoundationChanges: [],
    });
  });

  it("fails closed on shared paths or foundation writes to merchant ownership", () => {
    const result = analyzeUpdate(
      config,
      parseNameStatus("M\tcomponents/product/card.tsx\nA\tpublic/merchant/logo.svg\n"),
      parseNameStatus("M\tcomponents/product/card.tsx\n"),
    );
    expect(result.safeToMerge).toBe(false);
    expect(result.conflicts).toEqual(["components/product/card.tsx"]);
    expect(result.protectedFoundationChanges).toEqual(["public/merchant/logo.svg"]);
  });

  it("tracks both sides of renames", () => {
    expect(parseNameStatus("R100\told.ts\tnew.ts\n")).toEqual([
      { status: "R100", paths: ["old.ts", "new.ts"] },
    ]);
  });
});
