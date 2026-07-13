# Clean-room policy

This repository will become a distributable starter. Merchant-specific material must never enter its
tracked history.

## Prohibited material

- Merchant names, domains, handles, slogans, reviews, policies, or editorial copy
- Merchant logos, product photography, videos, fonts, mockups, or other brand assets
- Theme exports, saved theme configuration, screenshots, crawl output, or migration snapshots
- Shopify, analytics, email, hosting, or deployment credentials
- Generated artifacts containing unpublished or commercially sensitive store data
- Git history copied from a merchant storefront repository

## Permitted inputs

- Fresh upstream open-source dependencies with preserved licenses and notices
- Generic code reimplemented from documented behavior
- Selectively ported generic code only after provenance, license, secret, content, and asset review
- Synthetic fixtures created specifically for this repository

## Working rules

1. Begin from a fresh upstream commerce foundation, not a clone of a merchant repository.
2. Treat merchant repositories and stores as read-only behavioral references.
3. Import through an explicit allowlist; never bulk-copy and delete afterward.
4. Keep theme inputs and migration output in ignored local directories.
5. Run contamination and secret scans before every release boundary.
6. Preserve upstream license and attribution requirements.
7. If provenance or redistribution rights are unclear, do not import the material.
