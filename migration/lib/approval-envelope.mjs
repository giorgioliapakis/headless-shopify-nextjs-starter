import { createPublicKey, verify } from "node:crypto";

const ACTIONS = new Set([
  "preview",
  "deploy",
  "shopify-change",
  "webhook-change",
  "tracking-change",
  "domain-attachment",
  "dns-change",
  "cutover",
  "rollback",
  "observation",
]);
const BINDING_KEYS = [
  "sourceSnapshotSha256",
  "previewDeploymentSha256",
  "evidenceSha256",
  "checksSha256",
  "proposalSha256",
];
const ENVELOPE_KEYS = [
  "schemaVersion",
  "decisionId",
  "actor",
  "runId",
  "shop",
  "environment",
  "action",
  "issuedAt",
  "expiresAt",
  "bindings",
  "scope",
  "riskRationale",
];
const MAX_LIFETIME_MS = 24 * 60 * 60 * 1_000;

export function verifyApprovalEnvelope({
  envelope,
  signature,
  publicKey,
  expected,
  now = new Date(),
}) {
  validateEnvelope(envelope);
  validateExpected(expected);
  const key = publicKey?.type === "public" ? publicKey : createPublicKey(publicKey);
  if (key.asymmetricKeyType !== "ed25519") {
    throw approvalError("UNSUPPORTED_APPROVAL_KEY", "Approval trust anchor must be Ed25519");
  }
  const signatureBytes = decodeSignature(signature);
  if (!verify(null, Buffer.from(canonicalJson(envelope)), key, signatureBytes)) {
    throw approvalError("INVALID_APPROVAL_SIGNATURE", "Approval signature verification failed");
  }

  const nowMs = now.getTime();
  const issuedAt = Date.parse(envelope.issuedAt);
  const expiresAt = Date.parse(envelope.expiresAt);
  if (!Number.isFinite(nowMs) || !Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) {
    throw approvalError("INVALID_APPROVAL_TIME", "Approval timestamps are invalid");
  }
  if (issuedAt > nowMs + 5 * 60 * 1_000 || expiresAt <= nowMs) {
    throw approvalError("EXPIRED_APPROVAL", "Approval is expired or not yet valid");
  }
  if (expiresAt <= issuedAt || expiresAt - issuedAt > MAX_LIFETIME_MS) {
    throw approvalError(
      "INVALID_APPROVAL_WINDOW",
      "Approval lifetime must be positive and at most 24 hours",
    );
  }

  for (const [field, actual] of [
    ["decisionId", envelope.decisionId],
    ["actorId", envelope.actor.id],
    ["runId", envelope.runId],
    ["shop", envelope.shop],
    ["environment", envelope.environment],
    ["action", envelope.action],
  ]) {
    if (actual !== expected[field]) bindingMismatch(field);
  }
  for (const keyName of BINDING_KEYS) {
    if (envelope.bindings[keyName] !== expected.bindings[keyName]) {
      bindingMismatch(`bindings.${keyName}`);
    }
  }
  if (canonicalJson([...envelope.scope].sort()) !== canonicalJson([...expected.scope].sort())) {
    bindingMismatch("scope");
  }

  return {
    schemaVersion: 1,
    valid: true,
    decisionId: envelope.decisionId,
    actorId: envelope.actor.id,
    runId: envelope.runId,
    shop: envelope.shop,
    environment: envelope.environment,
    action: envelope.action,
    expiresAt: envelope.expiresAt,
    bindings: envelope.bindings,
    authority: "cryptographic-evidence-only-privileged-boundary-must-reverify",
  };
}

export function canonicalApprovalEnvelope(envelope) {
  validateEnvelope(envelope);
  return canonicalJson(envelope);
}

function validateEnvelope(envelope) {
  if (
    !plainObject(envelope) ||
    canonicalJson(Object.keys(envelope).sort()) !== canonicalJson(ENVELOPE_KEYS.slice().sort())
  ) {
    throw approvalError(
      "INVALID_APPROVAL_ENVELOPE",
      "Approval envelope fields are incomplete or unexpected",
    );
  }
  if (
    envelope.schemaVersion !== 1 ||
    !/^[a-z0-9][a-z0-9-]{0,79}$/.test(envelope.decisionId ?? "") ||
    !plainObject(envelope.actor) ||
    !/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,119}$/.test(envelope.actor.id ?? "") ||
    !/^[a-z][a-z0-9-]{1,79}$/.test(envelope.actor.authentication ?? "") ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(envelope.runId ?? "") ||
    !/^[a-z0-9][a-z0-9-]{1,61}\.myshopify\.com$/.test(envelope.shop ?? "") ||
    !new Set(["preview", "production"]).has(envelope.environment) ||
    !ACTIONS.has(envelope.action) ||
    typeof envelope.issuedAt !== "string" ||
    typeof envelope.expiresAt !== "string" ||
    typeof envelope.riskRationale !== "string" ||
    envelope.riskRationale.length < 10 ||
    envelope.riskRationale.length > 1_000
  ) {
    throw approvalError("INVALID_APPROVAL_ENVELOPE", "Approval envelope values are invalid");
  }
  if (
    Object.keys(envelope.actor).sort().join("\0") !== "authentication\0id" ||
    !plainObject(envelope.bindings) ||
    Object.keys(envelope.bindings).sort().join("\0") !== BINDING_KEYS.slice().sort().join("\0") ||
    BINDING_KEYS.some((key) => !/^[a-f0-9]{64}$/.test(envelope.bindings[key] ?? "")) ||
    !Array.isArray(envelope.scope) ||
    envelope.scope.length < 1 ||
    envelope.scope.length > 20 ||
    new Set(envelope.scope).size !== envelope.scope.length ||
    envelope.scope.some((item) => !/^[a-z0-9][a-z0-9:._/-]{0,119}$/.test(item))
  ) {
    throw approvalError(
      "INVALID_APPROVAL_ENVELOPE",
      "Approval actor, bindings or scope are invalid",
    );
  }
}

function validateExpected(expected) {
  if (
    !plainObject(expected) ||
    !plainObject(expected.bindings) ||
    !Array.isArray(expected.scope) ||
    ["decisionId", "actorId", "runId", "shop", "environment", "action"].some(
      (field) => typeof expected[field] !== "string" || !expected[field],
    ) ||
    BINDING_KEYS.some((key) => !/^[a-f0-9]{64}$/.test(expected.bindings[key] ?? ""))
  ) {
    throw approvalError("INVALID_EXPECTED_APPROVAL", "Expected approval bindings are incomplete");
  }
}

function decodeSignature(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{86}==$/.test(value)) {
    throw approvalError(
      "INVALID_APPROVAL_SIGNATURE",
      "Approval signature must be canonical base64",
    );
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 64 || decoded.toString("base64") !== value) {
    throw approvalError("INVALID_APPROVAL_SIGNATURE", "Approval signature has an invalid encoding");
  }
  return decoded;
}

function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (plainObject(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  throw approvalError("INVALID_APPROVAL_ENVELOPE", "Approval envelope is not canonical JSON data");
}

function plainObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype,
  );
}

function bindingMismatch(field) {
  throw approvalError("APPROVAL_BINDING_MISMATCH", `Approval does not match expected ${field}`, {
    field,
  });
}

function approvalError(code, message, details) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}
