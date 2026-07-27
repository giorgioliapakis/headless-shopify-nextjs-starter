# Security policy

This is a starter template, not a hosted service. It is young software with no guaranteed
security-support window yet.

## Reporting

Report suspected vulnerabilities privately through GitHub's private vulnerability reporting. Do not
open a public issue containing an exploit, store data or credentials.

Include the affected revision, the impact, a minimal reproduction and any suggested mitigation. Use
synthetic data only — never send Shopify, hosting, analytics or customer credentials. We will
acknowledge a valid report, agree a fix and disclosure timeline, and credit you if you want that.

## What this starter expects of you

- The only Shopify credential the storefront needs at runtime is a **public** Storefront API token,
  which is safe to expose to the browser by design. A private Storefront token is optional and is
  only used server-side.
- Never commit `.env.local` or any token. If a token reaches Git history, logs or a build artifact,
  revoke it at Shopify first, then clean up the repository.
- Checkout, payment and customer accounts are hosted by Shopify. This starter never handles card
  data, and you should not add code that does.
- Content from the Storefront API is sanitised before rendering (`lib/security/html.ts`). Keep it
  that way — treat all store content as untrusted input.
