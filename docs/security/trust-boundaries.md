# Migration trust boundaries

This design is a release requirement, not a prompt convention. Coding agents, source storefronts,
theme archives, generated code, and pull requests are untrusted principals.

## Credential broker

Long-lived Shopify Admin client credentials live in the operating-system keychain and are owned by a
broker process installed outside the repository and outside agent-writable paths. They are never passed
through a prompt, repository file, migration artifact, process environment, command argument, stdout,
log, screenshot, browser profile, generated application, or child process.

The broker exposes authenticated local IPC with a fixed, versioned allowlist of read-only discovery
operations. It rejects arbitrary GraphQL, unexpected scopes, unknown shops, writes, customer/order data,
and requests outside the active run. A merchant bootstrap ceremony binds a short-lived session to the
shop, run, allowed operations, expiry, and caller. Revocation closes the session and removes transient
material. Broker logs contain operation IDs and redacted outcomes, never tokens or response bodies.

The host qualification suite must attempt direct filesystem, environment, child-process, IPC replay,
operation-confusion, and broker-bypass attacks. A host cannot claim protected Admin discovery unless
those checks pass. Otherwise the merchant runs an explicit manual export flow.

## Human approval service

Files in `.migration/` are evidence and workflow state, not authorization. A coding agent can edit them.
Human approval is issued by a separate local service whose signing key remains in the OS keychain. The
service authenticates the local merchant, renders the exact proposed action and evidence, and signs an
immutable decision envelope containing:

- schema version, decision ID, actor, run, shop, environment, action, and expiry;
- source snapshot, preview deployment, evidence, check, and proposal hashes;
- the explicit approved scope and risk rationale.

Every privileged apply boundary verifies the signature and every binding independently. Rejection,
expiry, source drift, preview drift, check drift, environment mismatch, or action mismatch fails closed.
Approval for one action never authorizes deploy, Shopify changes, tracking, domain attachment, DNS,
cutover, rollback, or another environment.

## Hostile input and generated-code quarantine

Public pages execute only in disposable browsers with fresh profiles, no credentials, no broker socket,
no host mounts, no persistent service workers, disabled downloads/popups, and network egress restricted
to revalidated approved storefront/CDN hosts.

Theme archives and repositories are inspected without execution. Git hooks, filters, submodules, LFS
smudge, credential helpers, file transports, symlink escapes, special files, excessive history, and
mutable refs are rejected or disabled.

Generated code is installed, built, tested, and rendered first in an ephemeral sandbox with no Admin
credentials, broker access, production environment, or writable evidence. Package lifecycle scripts are
disabled by default. New dependencies, scripts, endpoints, subprocesses, dynamic execution, secret
reads, filesystem mounts, and network destinations require static review and a separate signed approval
before privileged execution.

## CI and deployment

- Untrusted and fork pull requests receive no secrets and use only synthetic fixtures.
- Credentialed contract checks run only on protected branches or manually approved environments.
- Preview uses a separate least-privilege Storefront token and never receives Admin credentials.
- Production secrets exist only in the protected production environment.
- Preview-bypass and release credentials are job-scoped, redacted, and unavailable to application code.
- Release jobs use pinned Actions, least-privilege tokens, frozen lockfiles, audited lifecycle scripts,
  dependency review, an SBOM, and signed provenance.

## Repository separation

Real migrations run in separate private downstream repositories created from a clean foundation
release. Merchant source, assets, generated code, snapshots, reports, approvals, and history remain
there. The public foundation receives only sanitized, independently reimplemented generic improvements
and aggregate evidence that cannot identify the merchant.
