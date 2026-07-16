# Foundation release runbook

The project remains an experimental alpha until the compatibility proof in `docs/TASKS.md` is complete.
Generating evidence does not publish a release, deploy a store or authorize a cutover.

## Local evidence

From a clean committed tree on exact Node 24 and pnpm 11.5.0, run:

```bash
pnpm release:verify
```

This reruns the source/type/query/test/lifecycle/provenance/clean-room gates and neutral production build,
then writes ignored `.release/` evidence: a Git archive, SHA-256 source manifest, CycloneDX 1.6 SBOM,
production-license inventory and an unsigned local report. The license audit fails closed when a new
expression appears; non-permissive runtime assets are accepted only through narrow package-pattern
exceptions with distribution rationale in `config/supply-chain/license-policy.json`. Inspect the
archive/report and preserve them outside the source repository.

## Protected GitHub evidence

The manual `Release evidence` workflow rebuilds from an exact commit with frozen dependencies and uploads
an immutable 30-day evidence artifact. Its actions are pinned to full commits and it receives no Shopify,
Vercel or merchant secrets. Enable the `attest` input only when the repository's GitHub plan supports
private-repository artifact attestations; otherwise the evidence build still succeeds without pretending
to be signed.

When enabled, GitHub's short-lived OIDC/Sigstore flow signs both SLSA build provenance and the CycloneDX
SBOM binding for the archive. Verify before distribution:

```bash
gh attestation verify agentic-shopify-starter-0.1.0.tar --repo OWNER/REPOSITORY
```

Create a version tag/release only after the browser/Lighthouse matrix, independent migration proof,
licensing, compatibility statement and release review pass. Tagging, publishing, changing repository
visibility and attaching artifacts are separate current human decisions.
