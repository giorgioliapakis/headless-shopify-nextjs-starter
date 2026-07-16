export function auditLicenseReport(report, policy) {
  validatePolicy(policy);
  if (!report || Array.isArray(report) || typeof report !== "object") {
    throw new Error("license report must be an object grouped by license expression");
  }

  const approved = new Set(policy.approvedExpressions);
  const exceptions = policy.reviewedExceptions.map((entry) => ({
    ...entry,
    packageRegex: new RegExp(entry.packagePattern),
  }));
  const packages = [];

  for (const [expression, entries] of Object.entries(report)) {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error(`license ${expression} has no package entries`);
    }
    for (const entry of entries) {
      if (!entry?.name || !Array.isArray(entry.versions) || entry.versions.length === 0) {
        throw new Error(`license ${expression} contains an incomplete package entry`);
      }
      const exception = exceptions.find(
        (candidate) => candidate.license === expression && candidate.packageRegex.test(entry.name),
      );
      if (!approved.has(expression) && !exception) {
        throw new Error(`unreviewed license ${expression} for ${entry.name}`);
      }
      for (const version of entry.versions) {
        if (typeof version !== "string" || version.length === 0) {
          throw new Error(`license ${expression} contains an invalid version for ${entry.name}`);
        }
        packages.push({
          name: entry.name,
          version,
          license: expression,
          review: exception ? "reviewed-exception" : "approved",
        });
      }
    }
  }

  return packages.sort((left, right) =>
    `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`),
  );
}

export function licenseMap(packages) {
  const result = new Map();
  for (const entry of packages) result.set(`${entry.name}@${entry.version}`, entry.license);
  return result;
}

function validatePolicy(policy) {
  if (
    policy?.schemaVersion !== 1 ||
    !Array.isArray(policy.approvedExpressions) ||
    !Array.isArray(policy.reviewedExceptions)
  ) {
    throw new Error("invalid license policy");
  }
  if (new Set(policy.approvedExpressions).size !== policy.approvedExpressions.length) {
    throw new Error("duplicate approved license expression");
  }
  for (const entry of policy.reviewedExceptions) {
    if (
      typeof entry.license !== "string" ||
      typeof entry.packagePattern !== "string" ||
      !entry.packagePattern.startsWith("^") ||
      !entry.packagePattern.endsWith("$") ||
      typeof entry.reason !== "string" ||
      entry.reason.length < 40
    ) {
      throw new Error("invalid reviewed license exception");
    }
    const packageRegex = new RegExp(entry.packagePattern);
    if (packageRegex.test("")) throw new Error("license exception must not match an empty package");
  }
}
