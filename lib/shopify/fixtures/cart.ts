/**
 * In-memory cart state for the credential-free fixtures.
 *
 * The previous implementation derived cart lines from the current mutation's
 * variables alone, so `cartLinesAdd` dropped prior lines, `cartLinesRemove`
 * always emptied the cart and a follow-up `Cart` query never reflected either.
 * State is now keyed by cart id so the whole Hydrogen cart contract round-trips.
 */

import type { FixtureDataset, FixtureMoney, FixtureProduct, FixtureVariant } from "./types";

export interface FixtureCartLineInput {
  id?: string;
  merchandiseId?: string;
  quantity?: number;
}

interface FixtureCartLineState {
  id: string;
  merchandiseId: string;
  quantity: number;
}

interface FixtureCartState {
  discountCodes: string[];
  id: string;
  lines: FixtureCartLineState[];
  note: string | null;
  revision: number;
}

const carts = new Map<string, FixtureCartState>();
const sequences = new Map<string, number>();

/** Test-only reset so cart assertions never inherit another suite's state. */
export function resetFixtureCarts(): void {
  carts.clear();
  sequences.clear();
}

function nextSequence(dataset: FixtureDataset): number {
  const next = (sequences.get(dataset.mode) ?? 0) + 1;
  sequences.set(dataset.mode, next);
  return next;
}

function key(dataset: FixtureDataset, id: string): string {
  return `${dataset.mode}:${id}`;
}

function defaultVariantId(dataset: FixtureDataset): string {
  return (
    dataset.products[0]?.selectedOrFirstAvailableVariant.id ?? "gid://shopify/ProductVariant/0"
  );
}

function resolveMerchandise(
  dataset: FixtureDataset,
  merchandiseId: string,
): { product: FixtureProduct; variant: FixtureVariant } {
  for (const product of dataset.products) {
    for (const edge of product.variants.edges) {
      if (edge.node.id === merchandiseId) return { product, variant: edge.node };
    }
  }
  // Unknown merchandise keeps the requested id but borrows the catalogue's first
  // purchasable variant, exactly as the original fixture behaved.
  const fallback = dataset.products[0];
  if (!fallback) throw new Error("Fixture dataset must contain at least one product");
  return { product: fallback, variant: fallback.selectedOrFirstAvailableVariant };
}

function money(amount: number, currencyCode: string): FixtureMoney {
  return { amount: amount.toFixed(2), currencyCode };
}

function toLineState(
  dataset: FixtureDataset,
  input: FixtureCartLineInput,
  index: number,
): FixtureCartLineState {
  return {
    id: input.id ?? dataset.cart.lineIdFor(index),
    merchandiseId: input.merchandiseId ?? defaultVariantId(dataset),
    quantity: Math.max(1, input.quantity ?? 1),
  };
}

function synthesize(dataset: FixtureDataset, id: string): FixtureCartState {
  return {
    discountCodes: [],
    id,
    lines: [
      {
        id: dataset.cart.lineIdFor(0),
        merchandiseId: defaultVariantId(dataset),
        quantity: 1,
      },
    ],
    note: null,
    revision: 0,
  };
}

function load(dataset: FixtureDataset, id: string): FixtureCartState | null {
  const existing = carts.get(key(dataset, id));
  if (existing) return existing;
  if (dataset.cart.synthesizeUnknown?.(id)) {
    return synthesize(dataset, dataset.cart.idFor(0));
  }
  return null;
}

/** Mutations always operate on a cart, creating an empty one when the id is unknown. */
function loadForMutation(dataset: FixtureDataset, rawId: unknown): FixtureCartState {
  const id = typeof rawId === "string" && rawId ? rawId : dataset.cart.idFor(0);
  const existing = load(dataset, id);
  if (existing) {
    carts.set(key(dataset, existing.id), existing);
    return existing;
  }
  const created: FixtureCartState = { discountCodes: [], id, lines: [], note: null, revision: 0 };
  carts.set(key(dataset, id), created);
  return created;
}

function touch(dataset: FixtureDataset, state: FixtureCartState): FixtureCartState {
  state.revision += 1;
  carts.set(key(dataset, state.id), state);
  return state;
}

function renderLine(dataset: FixtureDataset, line: FixtureCartLineState) {
  const { product, variant } = resolveMerchandise(dataset, line.merchandiseId);
  const unit = Number.parseFloat(variant.price.amount);
  const currencyCode = variant.price.currencyCode;
  const lineTotal = money(unit * line.quantity, currencyCode);
  return {
    cost: {
      amountPerQuantity: variant.price,
      compareAtAmountPerQuantity: variant.compareAtPrice ?? null,
      subtotalAmount: lineTotal,
      totalAmount: lineTotal,
    },
    id: line.id,
    merchandise: {
      id: line.merchandiseId,
      image: variant.image,
      product: {
        handle: product.handle,
        id: product.id,
        productType: product.productType ?? dataset.cart.productType,
        title: product.title,
        vendor: product.vendor,
      },
      quantityAvailable: dataset.cart.quantityAvailable,
      selectedOptions: variant.selectedOptions,
      sku: dataset.cart.skuFor(variant),
      title: variant.title,
    },
    parentRelationship: null,
    quantity: line.quantity,
  };
}

export function renderCart(dataset: FixtureDataset, state: FixtureCartState) {
  const lines = state.lines.map((line) => renderLine(dataset, line));
  const totalQuantity = lines.reduce((total, line) => total + line.quantity, 0);
  const amount = lines.reduce(
    (total, line) => total + Number.parseFloat(line.cost.totalAmount.amount),
    0,
  );
  const total = money(amount, dataset.currencyCode);
  return {
    checkoutUrl: dataset.cart.checkoutUrl,
    cost: { checkoutChargeAmount: total, subtotalAmount: total, totalAmount: total },
    discountCodes: state.discountCodes.map((code) => ({ applicable: true, code })),
    id: state.id,
    lines: { nodes: lines },
    note: state.note,
    totalQuantity,
    updatedAt: dataset.cart.updatedAtFor(state.revision),
  };
}

export function queryCart(dataset: FixtureDataset, rawId: unknown) {
  const id = typeof rawId === "string" ? rawId : "";
  const state = id ? load(dataset, id) : null;
  return state ? renderCart(dataset, state) : null;
}

export function createCart(dataset: FixtureDataset, input: Record<string, unknown>) {
  const lines = Array.isArray(input.lines) ? (input.lines as FixtureCartLineInput[]) : [];
  const state: FixtureCartState = {
    discountCodes: Array.isArray(input.discountCodes) ? (input.discountCodes as string[]) : [],
    id: dataset.cart.idFor(nextSequence(dataset)),
    lines: lines.map((line, index) => toLineState(dataset, line, index)),
    note: typeof input.note === "string" ? input.note : null,
    revision: 0,
  };
  carts.set(key(dataset, state.id), state);
  return renderCart(dataset, state);
}

export function addCartLines(
  dataset: FixtureDataset,
  cartId: unknown,
  lines: FixtureCartLineInput[],
) {
  const state = loadForMutation(dataset, cartId);
  for (const input of lines) {
    const merchandiseId = input.merchandiseId ?? defaultVariantId(dataset);
    const quantity = Math.max(1, input.quantity ?? 1);
    const existing = state.lines.find((line) => line.merchandiseId === merchandiseId);
    if (existing) {
      existing.quantity += quantity;
      continue;
    }
    state.lines.push(
      toLineState(dataset, { ...input, merchandiseId, quantity }, state.lines.length),
    );
  }
  return renderCart(dataset, touch(dataset, state));
}

export function updateCartLines(
  dataset: FixtureDataset,
  cartId: unknown,
  lines: FixtureCartLineInput[],
) {
  const state = loadForMutation(dataset, cartId);
  for (const input of lines) {
    const existing = state.lines.find((line) => line.id === input.id);
    if (!existing) continue;
    if (input.quantity !== undefined) existing.quantity = Math.max(0, input.quantity);
    if (input.merchandiseId) existing.merchandiseId = input.merchandiseId;
  }
  state.lines = state.lines.filter((line) => line.quantity > 0);
  return renderCart(dataset, touch(dataset, state));
}

export function removeCartLines(dataset: FixtureDataset, cartId: unknown, lineIds: unknown) {
  const state = loadForMutation(dataset, cartId);
  const removed = new Set(Array.isArray(lineIds) ? lineIds.map(String) : []);
  state.lines = state.lines.filter((line) => !removed.has(line.id));
  return renderCart(dataset, touch(dataset, state));
}

export function updateCartDiscountCodes(
  dataset: FixtureDataset,
  cartId: unknown,
  discountCodes: unknown,
) {
  const state = loadForMutation(dataset, cartId);
  state.discountCodes = Array.isArray(discountCodes) ? discountCodes.map(String) : [];
  return renderCart(dataset, touch(dataset, state));
}

export function updateCartNote(dataset: FixtureDataset, cartId: unknown, note: unknown) {
  const state = loadForMutation(dataset, cartId);
  state.note = typeof note === "string" ? note : null;
  return renderCart(dataset, touch(dataset, state));
}
