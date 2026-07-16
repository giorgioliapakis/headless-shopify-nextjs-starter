# Security policy

This repository is experimental alpha software and has no guaranteed security-support window yet.
Report suspected vulnerabilities privately to the repository owner through GitHub's private
vulnerability reporting. Do not open a public issue containing an exploit, merchant data or credentials.

Include the affected revision, impact, minimal reproduction and suggested mitigation. Use synthetic data
only. Never send Shopify, hosting, analytics or customer credentials. The maintainer will acknowledge a
valid report, coordinate a fix and disclosure timeline, and credit the reporter if requested and safe.

The migration CLI deliberately accepts no secrets and grants no production authority. Long-lived Admin
credentials and signed approvals belong to external OS-keychain services described in
`docs/security/trust-boundaries.md`. If a token appears in Git history, logs or artifacts, revoke it at
the provider immediately before beginning repository cleanup.
