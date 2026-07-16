"use client";

import { createCartComponents } from "@shopify/hydrogen/react";

import type { hydrogenCartHandlers } from "@/lib/shopify/hydrogen/cart-handlers";

export const { CartProvider, useCart, useCartForm, useOptionalCart } =
  createCartComponents<typeof hydrogenCartHandlers>();
