import { generateKeyPairSync, sign } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  canonicalApprovalEnvelope,
  verifyApprovalEnvelope,
} from "../../../migration/lib/approval-envelope.mjs";

const bindings = {
  sourceSnapshotSha256: "a".repeat(64),
  previewDeploymentSha256: "b".repeat(64),
  evidenceSha256: "c".repeat(64),
  checksSha256: "d".repeat(64),
  proposalSha256: "e".repeat(64),
};
const envelope = {
  schemaVersion: 1,
  decisionId: "deploy-proof-1",
  actor: { id: "merchant@example.com", authentication: "local-passkey" },
  runId: "2026-07-18-proof",
  shop: "synthetic-proof.myshopify.com",
  environment: "production",
  action: "deploy",
  issuedAt: "2026-07-18T00:00:00.000Z",
  expiresAt: "2026-07-18T01:00:00.000Z",
  bindings,
  scope: ["vercel:project:synthetic-proof"],
  riskRationale: "Merchant reviewed the exact immutable deployment proposal.",
};
const expected = {
  decisionId: envelope.decisionId,
  actorId: envelope.actor.id,
  runId: envelope.runId,
  shop: envelope.shop,
  environment: envelope.environment,
  action: envelope.action,
  bindings,
  scope: envelope.scope,
};

describe("external approval envelope verification", () => {
  it("verifies an exact detached Ed25519 envelope without granting repository authority", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const signature = sign(
      null,
      Buffer.from(canonicalApprovalEnvelope(envelope)),
      privateKey,
    ).toString("base64");
    expect(
      verifyApprovalEnvelope({
        envelope,
        signature,
        publicKey,
        expected,
        now: new Date("2026-07-18T00:30:00.000Z"),
      }),
    ).toMatchObject({
      valid: true,
      action: "deploy",
      authority: "cryptographic-evidence-only-privileged-boundary-must-reverify",
    });
  });

  it("fails closed on tampering, cross-action reuse, expiry and the wrong trust anchor", () => {
    const first = generateKeyPairSync("ed25519");
    const second = generateKeyPairSync("ed25519");
    const signature = sign(
      null,
      Buffer.from(canonicalApprovalEnvelope(envelope)),
      first.privateKey,
    ).toString("base64");
    const verifyExact = (overrides = {}) =>
      verifyApprovalEnvelope({
        envelope,
        signature,
        publicKey: first.publicKey,
        expected,
        now: new Date("2026-07-18T00:30:00.000Z"),
        ...overrides,
      });

    expect(() => verifyExact({ envelope: { ...envelope, action: "cutover" } })).toThrow(
      /signature verification failed/,
    );
    expect(() => verifyExact({ expected: { ...expected, action: "cutover" } })).toThrow(
      /expected action/,
    );
    expect(() =>
      verifyExact({
        expected: {
          ...expected,
          bindings: { ...bindings, sourceSnapshotSha256: "f".repeat(64) },
        },
      }),
    ).toThrow(/sourceSnapshotSha256/);
    expect(() => verifyExact({ now: new Date("2026-07-18T01:00:00.000Z") })).toThrow(/expired/);
    expect(() => verifyExact({ publicKey: second.publicKey })).toThrow(
      /signature verification failed/,
    );
  });
});
