#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(process.cwd());
const staticRoot = join(root, ".next/static");
const budgets = JSON.parse(await readFile(join(root, "config/performance-budgets.json"), "utf8"));
const baseline = JSON.parse(await readFile(join(root, budgets.assets.baseline), "utf8"));
const files = await assetFiles(staticRoot).catch(() => []);
if (files.length === 0) {
  console.error("Bundle budget requires a completed production build in .next.");
  process.exit(1);
}

const measurements = await Promise.all(
  files.map(async (file) => ({
    file,
    gzipBytes: gzipSync(await readFile(file), { level: 9 }).byteLength,
  })),
);
const javascript = measurements.filter(({ file }) => file.endsWith(".js"));
const css = measurements.filter(({ file }) => file.endsWith(".css"));
const totalJavaScript = sum(javascript);
const totalCss = sum(css);
const largestJavaScript = javascript.sort((a, b) => b.gzipBytes - a.gzipBytes)[0];
const failures = [];

if (totalJavaScript > budgets.assets.totalClientJavaScriptGzipBytes) {
  failures.push(
    `client JavaScript ${totalJavaScript} > ${budgets.assets.totalClientJavaScriptGzipBytes} gzip bytes`,
  );
}
if (largestJavaScript && largestJavaScript.gzipBytes > budgets.assets.largestClientChunkGzipBytes) {
  failures.push(
    `largest chunk ${relative(root, largestJavaScript.file)} ${largestJavaScript.gzipBytes} > ${budgets.assets.largestClientChunkGzipBytes}`,
  );
}
if (totalCss > budgets.assets.totalCssGzipBytes) {
  failures.push(`CSS ${totalCss} > ${budgets.assets.totalCssGzipBytes} gzip bytes`);
}
for (const [label, actual, recorded] of [
  [
    "client JavaScript regression",
    totalJavaScript,
    baseline.measurements.totalClientJavaScriptGzipBytes,
  ],
  [
    "largest chunk regression",
    largestJavaScript?.gzipBytes ?? 0,
    baseline.measurements.largestClientChunkGzipBytes,
  ],
  ["CSS regression", totalCss, baseline.measurements.totalCssGzipBytes],
]) {
  if (actual > recorded + budgets.assets.regressionToleranceBytes) {
    failures.push(
      `${label} ${actual} > baseline ${recorded} + ${budgets.assets.regressionToleranceBytes}`,
    );
  }
}
if (failures.length > 0) {
  console.error(`Bundle budget failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `Bundle budget passed: JS ${totalJavaScript}/${budgets.assets.totalClientJavaScriptGzipBytes}, largest ${largestJavaScript?.gzipBytes ?? 0}/${budgets.assets.largestClientChunkGzipBytes}, CSS ${totalCss}/${budgets.assets.totalCssGzipBytes} gzip bytes.`,
);

function sum(items) {
  return items.reduce((total, item) => total + item.gzipBytes, 0);
}

async function assetFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return assetFiles(path);
      return path.endsWith(".js") || path.endsWith(".css") ? [path] : [];
    }),
  );
  return nested.flat();
}
