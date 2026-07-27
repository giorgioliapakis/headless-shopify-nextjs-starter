/**
 * Seeded gradient/geometric artwork for the demo fixture. Same slug in, same
 * bytes out — no network calls, no third-party assets, no licensing questions.
 */

import { demoImageSeed } from "./images";
import { encodePng } from "./png";

const MAX_EDGE = 1400;
const MAX_PIXELS = 1_400_000;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = (((h % 360) + 360) / 60) % 6;
  const second = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const [r, g, b] =
    huePrime < 1
      ? [chroma, second, 0]
      : huePrime < 2
        ? [second, chroma, 0]
        : huePrime < 3
          ? [0, chroma, second]
          : huePrime < 4
            ? [0, second, chroma]
            : huePrime < 5
              ? [second, 0, chroma]
              : [chroma, 0, second];
  const match = l - chroma / 2;
  return [
    Math.round((r + match) * 255),
    Math.round((g + match) * 255),
    Math.round((b + match) * 255),
  ];
}

export function clampDimension(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(MAX_EDGE, Math.max(16, parsed));
}

export function renderDemoArtwork(slug: string, width: number, height: number): Uint8Array {
  const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (width * height)));
  const w = Math.max(16, Math.round(width * scale));
  const h = Math.max(16, Math.round(height * scale));

  const seed = demoImageSeed(slug);
  const baseHue = seed % 360;
  const accentHue = (baseHue + 40 + (seed % 60)) % 360;
  const saturation = 0.18 + ((seed >>> 8) % 22) / 100;
  const bandAngle = ((seed >>> 16) % 90) - 45;
  const radians = (bandAngle * Math.PI) / 180;
  const circleX = 0.25 + ((seed >>> 5) % 50) / 100;
  const circleY = 0.2 + ((seed >>> 11) % 50) / 100;
  const circleR = 0.18 + ((seed >>> 19) % 20) / 100;

  const rgb = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const projected = nx * Math.cos(radians) + ny * Math.sin(radians);
      const gradient = Math.min(1, Math.max(0, projected * 0.9 + 0.05));

      const distance = Math.hypot(nx - circleX, (ny - circleY) * (h / w) * (w / h));
      const inCircle = distance < circleR ? 1 : 0;
      const band = Math.floor(projected * 6) % 2 === 0 ? 0.03 : -0.03;

      const hue = inCircle ? accentHue : baseHue;
      const lightness = Math.min(
        0.94,
        Math.max(0.12, 0.78 - gradient * 0.42 + band + (inCircle ? 0.06 : 0)),
      );
      const [r, g, b] = hslToRgb(hue, saturation, lightness);
      const offset = (y * w + x) * 3;
      rgb[offset] = r;
      rgb[offset + 1] = g;
      rgb[offset + 2] = b;
    }
  }

  return encodePng(rgb, w, h);
}
