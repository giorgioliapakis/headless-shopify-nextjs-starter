import { describe, expect, it } from "vitest";

import { decodeEncodedVariant, getOptionValueStates } from "@/lib/shopify/encoded-variants";
import { encodeVariantTrie } from "@/lib/shopify/fixtures/data/demo/build";
import type { ProductOption } from "@/lib/types";

function option(name: string, values: string[]): ProductOption {
  return {
    id: `gid://shopify/ProductOption/${name}`,
    name,
    values: values.map((value) => ({ id: `${name}-${value}`, name: value })),
  };
}

const options: ProductOption[] = [
  option("Color", ["Red", "Blue", "Green"]),
  option("Size", ["S", "M"]),
];

// Variant matrix: Green has no variants at all; Red/M and Blue/S exist but are sold out.
const existence = encodeVariantTrie([
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
]);
const availability = encodeVariantTrie([
  [0, 0],
  [1, 1],
]);

describe("decodeEncodedVariant", () => {
  it("round-trips the fixture trie encoder", () => {
    expect(decodeEncodedVariant(existence)).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ]);
    expect(decodeEncodedVariant(availability)).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });
});

describe("getOptionValueStates", () => {
  it("derives the three states conditioned on the selected preceding options", () => {
    const states = getOptionValueStates(
      options,
      { Color: "Red", Size: "S" },
      existence,
      availability,
    );

    // First axis is unconditioned: Green does not exist, Red and Blue do.
    expect(states.get("Color")?.get("Red")).toEqual({ exists: true, available: true });
    expect(states.get("Color")?.get("Blue")).toEqual({ exists: true, available: true });
    expect(states.get("Color")?.get("Green")).toEqual({ exists: false, available: false });

    // Second axis is conditioned on Color=Red: M exists but is sold out.
    expect(states.get("Size")?.get("S")).toEqual({ exists: true, available: true });
    expect(states.get("Size")?.get("M")).toEqual({ exists: true, available: false });
  });

  it("re-evaluates the dependent axis when the preceding selection changes", () => {
    const states = getOptionValueStates(
      options,
      { Color: "Blue", Size: "M" },
      existence,
      availability,
    );

    expect(states.get("Size")?.get("S")).toEqual({ exists: true, available: false });
    expect(states.get("Size")?.get("M")).toEqual({ exists: true, available: true });
  });

  it("marks sold-out values on the first axis when no size of that color has stock", () => {
    const onlyRedInStock = encodeVariantTrie([
      [0, 0],
      [0, 1],
    ]);
    const states = getOptionValueStates(
      options,
      { Color: "Red", Size: "S" },
      existence,
      onlyRedInStock,
    );

    expect(states.get("Color")?.get("Red")).toEqual({ exists: true, available: true });
    expect(states.get("Color")?.get("Blue")).toEqual({ exists: true, available: false });
  });

  it("fails open when encoded fields are absent", () => {
    const states = getOptionValueStates(options, { Color: "Red", Size: "S" }, undefined, undefined);
    for (const opt of options) {
      for (const value of opt.values) {
        expect(states.get(opt.name)?.get(value.name)).toEqual({ exists: true, available: true });
      }
    }
  });

  it("fails open when the encoding is unsupported or empty", () => {
    const states = getOptionValueStates(options, { Color: "Red", Size: "S" }, "v2_???", "v1_");
    expect(states.get("Color")?.get("Green")).toEqual({ exists: true, available: true });
    expect(states.get("Size")?.get("M")).toEqual({ exists: true, available: true });
  });

  it("fails open on axes whose preceding options are not selected yet", () => {
    const states = getOptionValueStates(options, {}, existence, availability);

    // First axis needs no preceding selection, so it still gates.
    expect(states.get("Color")?.get("Green")).toEqual({ exists: false, available: false });
    // Second axis cannot be conditioned without a selected color.
    expect(states.get("Size")?.get("M")).toEqual({ exists: true, available: true });
  });

  it("treats availability as false when the combination does not exist", () => {
    // Availability trie mentioning a combination the existence trie lacks.
    const bogusAvailability = encodeVariantTrie([
      [2, 0],
      [0, 0],
    ]);
    const states = getOptionValueStates(
      options,
      { Color: "Red", Size: "S" },
      existence,
      bogusAvailability,
    );
    expect(states.get("Color")?.get("Green")).toEqual({ exists: false, available: false });
  });
});
