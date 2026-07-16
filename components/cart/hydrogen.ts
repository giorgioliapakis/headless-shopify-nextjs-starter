"use client";

import type { CartDataFromHandlers } from "@shopify/hydrogen";
import { createCartComponents } from "@shopify/hydrogen/react";

import type { hydrogenCartHandlers } from "@/lib/shopify/hydrogen/cart-handlers";

export const { CartProvider, useCart, useCartForm, useOptionalCart } =
  createCartComponents<typeof hydrogenCartHandlers>();

export type StorefrontCart = CartDataFromHandlers<typeof hydrogenCartHandlers>;
export type StorefrontCartLine = StorefrontCart["lines"]["nodes"][number];
