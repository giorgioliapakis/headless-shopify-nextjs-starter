import type { ProductOption } from "@/lib/types";

// Shopify trie controls: `:` descends, `,` pops, space separates, and `-` spans a range.
export function decodeEncodedVariant(encoded: string): number[][] {
  if (!encoded) return [];
  if (!encoded.startsWith("v1_")) throw new Error("Unsupported option value encoding");
  return v1Decoder(encoded.replace(/^v1_/, ""));
}

function v1Decoder(encoded: string): number[][] {
  const result: number[][] = [];
  const combination: number[] = [];
  let depth = 0;
  let rangeStart: number | null = null;
  let prevControl = "";
  let lastIndex = 0;

  const pushRange = (end: number) => {
    for (let v = rangeStart as number; v <= end; v++) {
      combination[depth] = v;
      result.push(combination.slice(0, depth + 1));
    }
    rangeStart = null;
  };

  const tokenizer = /[ :,-]/g;
  let match = tokenizer.exec(encoded);
  while (match !== null) {
    const control = match[0];
    const value =
      match.index > lastIndex
        ? Number.parseInt(encoded.slice(lastIndex, match.index), 10) || 0
        : null;

    if (control === "-") {
      rangeStart = value ?? 0;
    } else if (control === ":") {
      if (value !== null) combination[depth] = value;
      depth++;
    } else if (control === " ") {
      if (rangeStart !== null) {
        pushRange(value ?? rangeStart);
      } else if (value !== null) {
        combination[depth] = value;
        result.push(combination.slice(0, depth + 1));
      }
    } else {
      if (rangeStart !== null) {
        pushRange(value ?? rangeStart);
      } else if (prevControl !== ",") {
        if (value !== null) combination[depth] = value;
        result.push(combination.slice(0, depth + 1));
      }
      depth = Math.max(0, depth - 1);
      combination.length = depth;
    }

    prevControl = control;
    lastIndex = tokenizer.lastIndex;
    match = tokenizer.exec(encoded);
  }

  const trailing = encoded.slice(lastIndex);
  if (/\d/.test(trailing)) {
    const value = Number.parseInt(trailing, 10) || 0;
    if (rangeStart !== null) {
      pushRange(value);
    } else {
      combination[depth] = value;
      result.push(combination.slice(0, depth + 1));
    }
  }

  return result;
}

export interface OptionValueState {
  /** The combination exists in the product's variant matrix. */
  exists: boolean;
  /** The combination exists and has stock. Always `false` when `exists` is `false`. */
  available: boolean;
}

/** Per option name: value name → three-state gating info. */
export type OptionValueStates = Map<string, Map<string, OptionValueState>>;

const PREFIX_SEPARATOR = ",";

// Decodes an encoded trie into the set of every combination prefix it contains, so a
// partial selection (top-down through the option axes) can be checked for membership.
// Returns null when the field is absent or undecodable — callers must fail open.
function decodePrefixSet(encoded: string | undefined): Set<string> | null {
  if (!encoded) return null;
  let combinations: number[][];
  try {
    combinations = decodeEncodedVariant(encoded);
  } catch {
    return null;
  }
  if (combinations.length === 0) return null;
  const prefixes = new Set<string>();
  for (const combination of combinations) {
    for (let i = 0; i < combination.length; i++) {
      prefixes.add(combination.slice(0, i + 1).join(PREFIX_SEPARATOR));
    }
  }
  return prefixes;
}

// Mirrors Hydrogen's buildProductOptions gating: an option value's state is conditioned
// on the currently selected values of the options that precede it in the trie. Shopify
// may return an empty trie for synthetic options; variant lookup still gates purchase,
// so unknown states fail open (exists + available).
export function getOptionValueStates(
  options: ProductOption[],
  selectedOptions: Record<string, string>,
  encodedExistence: string | undefined,
  encodedAvailability: string | undefined,
): OptionValueStates {
  const existence = decodePrefixSet(encodedExistence);
  const availability = decodePrefixSet(encodedAvailability);
  const states: OptionValueStates = new Map();

  // Index of the selected value per option axis; null when unselected or unknown.
  const selectedIndices = options.map((option) => {
    const selected = selectedOptions[option.name];
    if (selected === undefined) return null;
    const index = option.values.findIndex((value) => value.name === selected);
    return index === -1 ? null : index;
  });

  options.forEach((option, optionIndex) => {
    const valueStates = new Map<string, OptionValueState>();
    states.set(option.name, valueStates);

    const prefix = selectedIndices.slice(0, optionIndex);
    const resolvable = prefix.every((index) => index !== null);

    option.values.forEach((value, valueIndex) => {
      if (!resolvable) {
        // Preceding axes are unselected (e.g. streaming fallback); cannot gate yet.
        valueStates.set(value.name, { exists: true, available: true });
        return;
      }
      const key = [...prefix, valueIndex].join(PREFIX_SEPARATOR);
      const exists = existence ? existence.has(key) : true;
      const available = exists && (availability ? availability.has(key) : true);
      valueStates.set(value.name, { exists, available });
    });
  });

  return states;
}
