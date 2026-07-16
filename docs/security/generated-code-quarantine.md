# Generated-code quarantine

Storefront evidence and code produced from it are untrusted. Build, test or preview generated code only
after this quarantine passes from a clean, immutable foundation checkout.

## Prerequisites

- A separate clean checkout of the exact tagged foundation release used to create the downstream store.
- Docker or Podman running locally. The command fails closed when neither is available.
- No production, Admin, preview-bypass or credential-broker secret in the generated workspace.

Run the tool from the clean foundation checkout, not from the generated repository:

```bash
node /absolute/path/to/clean-foundation/scripts/security/quarantine.mjs \
  --workspace /absolute/path/to/generated-store \
  --foundation /absolute/path/to/clean-foundation \
  --prove-boundary \
  --json
```

`pnpm quarantine:verify --workspace ... --foundation ...` is a convenience command only when the
command itself comes from the clean foundation checkout. `--self-test` exists solely to prove the
foundation against itself; it is not a migration bypass.

`--prove-boundary` injects a trusted temporary test into the staged copy. It proves that the generated
process cannot inherit a host sentinel, write to the read-only source/root filesystems, reach the broker
socket or make an external request. The probe never enters the source repository.

## Enforced boundary

- The dependency image uses the exact digest in `config/security/quarantine-policy.json`.
- Dependency installation sees only the immutable package manifest, lockfile, workspace file and npm
  configuration. Generated source is absent and lifecycle scripts are disabled.
- The generated workspace must match the clean foundation's dependency, provenance, security, API,
  proxy and verification controls. Drift fails before execution.
- A bounded staging pass excludes `.git`, `.migration`, build output, dependencies and release output;
  rejects environment files, secrets, symlinks, special files and size/count overages; and never mounts
  the original repository.
- New endpoints, subprocesses, raw sockets, dynamic execution, secret reads or literal fetch
  destinations fail with `STATIC_REVIEW_REQUIRED`. There is deliberately no agent-writable override.
- The staged copy is mounted read-only into an ephemeral unprivileged container. The root filesystem is
  read-only; only bounded `/work` and `/tmp` tmpfs mounts are writable.
- Network and IPC are disabled, Linux capabilities are dropped, `no-new-privileges` and the default
  container seccomp profile apply, and CPU, memory, PID, file-descriptor, core-dump and wall-time limits
  are set.
- The container receives only synthetic fixture variables. The host environment, Docker socket,
  credential broker, migration evidence and source workspace are not mounted.
- Trusted quality commands run directly, without dispatching package scripts from generated code. They
  typecheck, lint, format-check, validate GraphQL and budgets, run tests, verify lifecycle/provenance,
  scan the staged copy, build the neutral production fixture and enforce bundle budgets.

The Node.js permission model is not used as the isolation boundary because Node's own documentation says
it is not a security guarantee for malicious code. OS/container isolation is mandatory. See the
[Node.js permission model constraints](https://nodejs.org/api/permissions.html#permission-model).

## What a pass does not authorize

A quarantine pass does not approve a dependency, script, endpoint, provider, network destination,
preview, deployment, Shopify mutation, tracking change, domain, DNS, cutover or rollback. Those remain
separate reviews and, where privileged, separate signed human approvals. Browser rendering also remains
inside the disposable browser-capture boundary; the quarantine does not silently launch a browser.
