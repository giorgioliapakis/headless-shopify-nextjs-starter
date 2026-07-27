/**
 * Deterministic, licence-free artwork for the demo fixture.
 *
 * Fixture image URLs point at the app's own `/demo-image` route, which renders a
 * seeded gradient. Nothing is downloaded, nothing is copyrighted, and the same
 * slug always produces the same picture.
 */

import type { FixtureImage } from "./types";

export const DEMO_IMAGE_BASE_PATH = "/demo-image";

/**
 * Dimensions live in the path, not a query string: `next/image` rejects local
 * sources with a query unless `images.localPatterns` is configured, and a
 * placeholder route is not worth widening that allowlist for.
 */
export function demoImageUrl(slug: string, width: number, height: number): string {
  return `${DEMO_IMAGE_BASE_PATH}/${slug}/${width}x${height}.png`;
}

export function demoImage(
  slug: string,
  altText: string,
  width: number,
  height: number,
): FixtureImage {
  return { altText, height, url: demoImageUrl(slug, width, height), width };
}

/** Stable 32-bit hash so the route and the dataset agree on a slug's palette. */
export function demoImageSeed(slug: string): number {
  let hash = 2166136261;
  for (let index = 0; index < slug.length; index++) {
    hash ^= slug.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
