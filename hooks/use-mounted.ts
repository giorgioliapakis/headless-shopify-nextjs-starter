"use client";

import { useEffect, useState } from "react";

/**
 * `false` on the server and for the first client render, `true` afterwards.
 *
 * Use it when a client component has both a server-rendered snapshot and a live browser store.
 * Hydration compares the first client render against the server HTML, so reading the store before
 * mount desynchronises the two the moment the store has already settled. Render the snapshot until
 * this returns `true`, then switch to the store.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
