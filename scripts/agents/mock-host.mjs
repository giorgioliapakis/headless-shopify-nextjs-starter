const SECRET_VALUE = /\b(?:shpat|shpca|shpss|shppa)_[A-Za-z0-9_-]+\b|\bBearer\s+\S+/i;

export function buildMockMigrationPlan(request) {
  if (request?.storeUrl !== "<STORE_URL>" || request?.themeSource !== "<THEME_SOURCE>") {
    throw new Error(
      "Mock host accepts placeholders only; merchant evidence and secrets are forbidden",
    );
  }
  if (SECRET_VALUE.test(JSON.stringify(request))) throw new Error("Secret-like fixture rejected");
  const doctor =
    "pnpm migrate doctor --store-url <STORE_URL> --theme-source <THEME_SOURCE> --theme-rights-confirmed";
  const commands = [doctor];
  if (request.seededSetupFailure === "pnpm-version") {
    commands.push("corepack prepare pnpm@11.5.0 --activate", doctor);
  } else if (request.seededSetupFailure) {
    throw new Error("Unknown seeded setup failure");
  }
  commands.push(
    "pnpm migrate capability",
    "pnpm migrate snapshot",
    "pnpm migrate review",
    "pnpm migrate verify --production",
    "pnpm migrate resume --json",
  );
  return {
    authority: "migration-review-only",
    commands,
    blockedActions: ["admin-write", "deploy", "dns", "cutover", "launch"],
  };
}
