#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { buildMockMigrationPlan } from "./mock-host.mjs";

const root = resolve(import.meta.dirname, "../..");
const matrixPath = join(root, "agent-workflows", "qualification-matrix.json");
const fixturePath = join(root, "tests", "fixtures", "agent-runs", "migration-workflow-v1.json");

/**
 * @param {{mode?: "foundation" | "alpha", evidenceDirectory?: string, now?: Date}} [options]
 */
export async function verifyQualification({ mode = "foundation", evidenceDirectory, now } = {}) {
  if (!new Set(["foundation", "alpha"]).has(mode)) throw new Error("Invalid qualification mode");
  const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
  validateMatrix(matrix);
  const bindings = await verifyBindings(matrix);
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const mockPlan = buildMockMigrationPlan(fixture.request);
  if (JSON.stringify(mockPlan) !== JSON.stringify(fixture.expected)) {
    throw new Error("Deterministic mock host drifted from its reviewed fixture");
  }
  const pendingHosts = matrix.hosts
    .filter((host) => host.status === "awaiting-evidence")
    .map((host) => host.id);
  const report = {
    schemaVersion: 1,
    mode,
    matrix: "current",
    bindings,
    deterministicMock: "passed",
    authenticatedHosts: [],
    pendingHosts,
    alphaReady: false,
    authority: "qualification-evidence-only",
  };
  if (mode === "foundation") return { ok: true, ...report };
  if (!evidenceDirectory) {
    throw qualificationError(
      "AUTHENTICATED_EVIDENCE_REQUIRED",
      "Alpha qualification requires protected, attested Codex and Claude Code evidence",
      report,
    );
  }
  const evidence = await readEvidence(evidenceDirectory);
  const authenticatedHosts = [];
  for (const hostId of matrix.policy.alphaRequiredHosts) {
    const host = matrix.hosts.find((candidate) => candidate.id === hostId);
    const entry = evidence.find((candidate) => candidate.host === hostId);
    validateEvidence(entry, host, matrix, now ?? new Date());
    authenticatedHosts.push({ host: hostId, modelId: entry.modelId, expiresAt: entry.expiresAt });
  }
  return {
    ok: true,
    ...report,
    authenticatedHosts,
    pendingHosts: [],
    alphaReady: true,
  };
}

async function verifyBindings(matrix) {
  const values = [];
  for (const binding of Object.values(matrix.bindings)) {
    const observed = await sha256(join(root, binding.path));
    if (observed !== binding.sha256)
      throw new Error(`Qualification binding drift: ${binding.path}`);
    values.push({ path: binding.path, sha256: observed });
  }
  for (const host of matrix.hosts.filter((candidate) => candidate.adapter)) {
    const observed = await sha256(join(root, host.adapter));
    if (observed !== host.adapterSha256) {
      throw new Error(`Qualification adapter drift: ${host.adapter}`);
    }
    values.push({ path: host.adapter, sha256: observed });
  }
  return values;
}

async function readEvidence(directory) {
  const evidenceRoot = resolve(directory);
  const entries = await readdir(evidenceRoot).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  return Promise.all(
    entries
      .filter((name) => name.endsWith(".json") && !name.includes("/"))
      .sort()
      .map(async (name) => JSON.parse(await readFile(join(evidenceRoot, name), "utf8"))),
  );
}

function validateEvidence(evidence, host, matrix, now) {
  if (!evidence || !host)
    throw new Error(`Missing authenticated evidence for ${host?.id ?? "host"}`);
  if (
    evidence.schemaVersion !== 1 ||
    evidence.host !== host.id ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{1,119}$/.test(evidence.modelId ?? "") ||
    /latest|default/i.test(evidence.modelId) ||
    evidence.workflowSha256 !== matrix.bindings.workflow.sha256 ||
    evidence.skillManifestSha256 !== matrix.bindings.skillManifest.sha256 ||
    evidence.adapterSha256 !== host.adapterSha256 ||
    evidence.authentication !== "protected-job-oidc" ||
    evidence.attestation?.issuer !== "https://token.actions.githubusercontent.com" ||
    !/^sha256:[a-f0-9]{64}$/.test(evidence.attestation?.subjectDigest ?? "") ||
    typeof evidence.attestation?.workflowRef !== "string"
  ) {
    throw new Error(`Invalid authenticated evidence for ${host.id}`);
  }
  for (const check of matrix.requiredChecks) {
    if (evidence.checks?.[check] !== "passed") throw new Error(`${host.id} did not pass ${check}`);
  }
  const testedAt = Date.parse(evidence.testedAt);
  const expiresAt = Date.parse(evidence.expiresAt);
  const maximumAge = matrix.policy.authenticatedEvidenceMaxAgeDays * 86_400_000;
  if (
    !Number.isFinite(testedAt) ||
    !Number.isFinite(expiresAt) ||
    testedAt > now.getTime() + 300_000 ||
    expiresAt <= now.getTime() ||
    expiresAt <= testedAt ||
    expiresAt - testedAt > maximumAge
  ) {
    throw new Error(`Expired or invalid qualification window for ${host.id}`);
  }
}

function validateMatrix(matrix) {
  const ids = matrix.hosts?.map((host) => host.id) ?? [];
  if (
    matrix.schemaVersion !== 1 ||
    matrix.policy?.authenticatedEvidenceMaxAgeDays !== 30 ||
    matrix.policy?.unavailableHostOutcome !== "blocked" ||
    JSON.stringify(matrix.policy?.alphaRequiredHosts) !==
      JSON.stringify(["codex", "claude-code"]) ||
    JSON.stringify(ids) !== JSON.stringify(["deterministic-mock", "codex", "claude-code"]) ||
    !Array.isArray(matrix.requiredChecks) ||
    matrix.requiredChecks.length !== 7
  ) {
    throw new Error("Agent qualification matrix is invalid");
  }
}

async function sha256(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

function qualificationError(code, message, report) {
  const error = new Error(message);
  error.code = code;
  error.report = report;
  return error;
}

function parseArguments(argv) {
  const options = { mode: "foundation", json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--json") options.json = true;
    else if (value === "--mode" && argv[index + 1]) options.mode = argv[++index];
    else if (value === "--evidence-dir" && argv[index + 1])
      options.evidenceDirectory = argv[++index];
    else throw new Error(`Unknown or incomplete argument: ${value}`);
  }
  return options;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArguments(process.argv.slice(2));
  verifyQualification(options)
    .then((result) => {
      process.stdout.write(
        options.json
          ? `${JSON.stringify(result, null, 2)}\n`
          : `Agent qualification passed (${result.mode}); alpha ready: ${result.alphaReady}\n`,
      );
    })
    .catch((error) => {
      process.stderr.write(
        `${JSON.stringify({ ok: false, code: error.code ?? "QUALIFICATION_FAILED", message: error.message, report: error.report }, null, 2)}\n`,
      );
      process.exitCode = 1;
    });
}
