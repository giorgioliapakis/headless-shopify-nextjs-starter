#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const budgets = JSON.parse(await readFile(join(root, "config/performance-budgets.json"), "utf8"));
const files = await sourceFiles(join(root, "lib/shopify"));
const violations = [];
let operationCount = 0;

for (const file of files) {
  const source = await readFile(file, "utf8");
  const documents = [...source.matchAll(/gql\(?(?:\s*)`([^]*?)`/g)];
  for (const match of documents) {
    const document = match[1] ?? "";
    const operations = [...document.matchAll(/\b(?:query|mutation)\s+([A-Za-z]\w*)/g)];
    operationCount += operations.length;
    if (Buffer.byteLength(document) > budgets.graphql.maximumDocumentBytes) {
      violations.push(
        `${relative(root, file)}:${operations[0]?.[1] ?? "fragment"} is ${Buffer.byteLength(document)} bytes`,
      );
    }
    for (const pageSize of document.matchAll(/\b(?:first|last)\s*:\s*(\d+)/g)) {
      if (Number(pageSize[1]) > budgets.graphql.maximumLiteralPageSize) {
        violations.push(
          `${relative(root, file)} requests ${pageSize[0]} (max ${budgets.graphql.maximumLiteralPageSize})`,
        );
      }
    }
  }
}

if (operationCount > budgets.graphql.maximumOperations) {
  violations.push(
    `Storefront operation count ${operationCount} exceeds ${budgets.graphql.maximumOperations}`,
  );
}
if (violations.length > 0) {
  console.error(`GraphQL budget failed:\n- ${violations.join("\n- ")}`);
  process.exit(1);
}
console.log(
  `GraphQL budget passed: ${operationCount}/${budgets.graphql.maximumOperations} operations across ${files.length} files.`,
);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return [".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}
