ARG BASE_IMAGE=node:24-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d
FROM ${BASE_IMAGE} AS dependencies

ARG PACKAGE_MANAGER
ENV COREPACK_HOME=/opt/corepack \
    PNPM_HOME=/opt/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

WORKDIR /opt/deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN mkdir -p /opt/pnpm /opt/corepack \
  && corepack enable --install-directory /opt/pnpm \
  && corepack prepare "${PACKAGE_MANAGER}" --activate \
  && pnpm install --frozen-lockfile --ignore-scripts

FROM ${BASE_IMAGE}
ENV COREPACK_HOME=/opt/corepack \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/opt/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
WORKDIR /opt/deps
COPY --from=dependencies /opt/corepack /opt/corepack
COPY --from=dependencies /opt/pnpm /opt/pnpm
COPY --from=dependencies /opt/deps/node_modules ./node_modules
COPY quarantine-entrypoint.sh /usr/local/bin/quarantine-entrypoint
RUN chmod 0555 /usr/local/bin/quarantine-entrypoint \
  && chmod -R a-w /opt/corepack /opt/deps /opt/pnpm

ENTRYPOINT ["/usr/local/bin/quarantine-entrypoint"]
