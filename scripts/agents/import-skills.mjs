#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import process from "node:process";

const root = resolve(process.cwd());
const sources = [
  {
    repository: "https://github.com/vercel-labs/agent-skills.git",
    commit: "f8a72b9603728bb92a217a879b7e62e43ad76c81",
    license: "MIT",
    skills: [
      ["skills/react-best-practices", "vercel-react-best-practices"],
      ["skills/composition-patterns", "vercel-composition-patterns"],
      ["skills/web-design-guidelines", "web-design-guidelines"],
    ],
  },
  {
    repository: "https://github.com/shadcn-ui/ui.git",
    commit: "3cdaa6eb2f0da27aca8598cb752c32d840e06940",
    license: "MIT",
    skills: [["skills/shadcn", "shadcn"]],
  },
];
const excludedExtensions = new Set([".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const excludedSegments = new Set(["agents", "assets", "evals"]);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excludedSegments.has(entry.name)) continue;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(absolutePath)));
    else if (entry.isFile() && !excludedExtensions.has(extname(entry.name).toLowerCase()))
      files.push(absolutePath);
    else if (!entry.isFile()) throw new Error(`Refusing non-regular skill path: ${absolutePath}`);
  }
  return files;
}

const manifest = {
  schemaVersion: 1,
  nextReference: {
    package: "next",
    version: "16.2.10",
    path: "node_modules/next/dist/docs",
    rationale: "Next.js moved reference skills into version-matched bundled documentation.",
  },
  sources: [],
};

for (const source of sources) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "agentic-shopify-skills-"));
  try {
    run("git", ["init", "--quiet"], temporaryDirectory);
    run("git", ["remote", "add", "origin", source.repository], temporaryDirectory);
    run("git", ["fetch", "--quiet", "--depth", "1", "origin", source.commit], temporaryDirectory);
    if (run("git", ["rev-parse", "FETCH_HEAD"], temporaryDirectory) !== source.commit) {
      throw new Error(`Commit mismatch for ${source.repository}`);
    }
    run("git", ["checkout", "--quiet", "--detach", source.commit], temporaryDirectory);

    const importedSkills = [];
    for (const [sourcePath, target] of source.skills) {
      const sourceRoot = resolve(temporaryDirectory, sourcePath);
      const destinationRoot = resolve(root, ".agents/skills", target);
      await rm(destinationRoot, { recursive: true, force: true });

      const files = [];
      for (const sourceFile of await listFiles(sourceRoot)) {
        const path = relative(sourceRoot, sourceFile).split(sep).join("/");
        const destination = resolve(destinationRoot, path);
        const content = await readFile(sourceFile);
        await mkdir(dirname(destination), { recursive: true });
        await copyFile(sourceFile, destination);
        files.push({ path, sha256: sha256(content) });
      }
      files.sort((left, right) => left.path.localeCompare(right.path));
      importedSkills.push({ sourcePath, target, files });
    }

    manifest.sources.push({
      repository: source.repository,
      commit: source.commit,
      license: source.license,
      skills: importedSkills,
    });
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await mkdir(resolve(root, "agent-workflows"), { recursive: true });
await writeFile(
  resolve(root, "agent-workflows/skills.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
console.log(
  `Imported ${manifest.sources.flatMap((source) => source.skills).length} audited skills.`,
);
