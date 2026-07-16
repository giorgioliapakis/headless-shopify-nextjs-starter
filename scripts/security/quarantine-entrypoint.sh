#!/bin/sh
set -eu

umask 077
mkdir -p /work/source /tmp/home /tmp/cache
cp -R /input/. /work/source/
cp -R /opt/deps/node_modules /work/source/node_modules

cd /work/source
./node_modules/.bin/next typegen
./node_modules/.bin/oxlint .
./node_modules/.bin/oxfmt --check
./node_modules/.bin/tsc --noEmit
node scripts/verify/graphql.mjs
node scripts/performance/query-budget.mjs
./node_modules/.bin/vitest run
node scripts/security/audit-lifecycle-scripts.mjs
node scripts/upstream/verify.mjs
node scripts/agents/verify-skills.mjs
node scripts/clean-room/scan.mjs

export NEXT_PUBLIC_BASE_URL=http://localhost:3000
export NEXT_PUBLIC_SITE_NAME="Neutral Verification Store"
export PUBLIC_STOREFRONT_API_TOKEN=fixture-public-token
export PUBLIC_STORE_DOMAIN=neutral-fixture.myshopify.com
export SHOPIFY_API_VERSION=2026-07
export SHOPIFY_STOREFRONT_FIXTURE=neutral
./node_modules/.bin/next build
node scripts/performance/bundle-budget.mjs
