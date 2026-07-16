# Agent host qualification

The starter separates a deterministic pull-request protocol check from authenticated host proof.
`pnpm agents:qualify` validates exact workflow, skill and adapter hashes and runs a credential-free mock
plan with a seeded setup failure. It proves that repository contracts remain discoverable and bounded;
it does **not** prove that Codex or Claude Code completed a migration.

Codex and Claude Code remain `awaiting-evidence` in
`agent-workflows/qualification-matrix.json`. A protected external runner must exercise the required
black-box checks with an exact provider model ID, then emit one evidence document per host matching
`migration/schemas/agent-qualification.schema.json`. Evidence expires within 30 days. An unavailable
host blocks alpha qualification rather than being silently skipped.

Run the strict gate only after the protected job has downloaded and verified the GitHub attestation for
each evidence subject:

```sh
pnpm agents:qualify:alpha --evidence-dir /trusted/attested/evidence
```

The JSON fields describing OIDC and attestation are bindings for that protected workflow, not local
signature verification. Repository files are agent-writable, so local JSON alone is never proof of
authentication, release authority or human approval. The protected workflow must verify the attestation
before invoking the alpha gate and must retain the evidence with the release record.
