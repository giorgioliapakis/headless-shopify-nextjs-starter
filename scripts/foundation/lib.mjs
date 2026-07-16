export function analyzeUpdate(updateConfig, foundationChanges, downstreamChanges) {
  const foundationPaths = new Set(foundationChanges.flatMap((change) => change.paths));
  const downstreamPaths = new Set(downstreamChanges.flatMap((change) => change.paths));
  const protectedPrefixes = [
    ...(updateConfig.merchantOwned ?? []),
    ...(updateConfig.generatedMerchantOwned ?? []),
  ];
  const protectedFoundationChanges = [...foundationPaths]
    .filter((path) => protectedPrefixes.some((prefix) => path.startsWith(prefix)))
    .sort();
  const conflicts = [...foundationPaths].filter((path) => downstreamPaths.has(path)).sort();
  return {
    protectedFoundationChanges,
    conflicts,
    safeToMerge: protectedFoundationChanges.length === 0 && conflicts.length === 0,
  };
}

export function parseNameStatus(output) {
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [status, ...paths] = line.split("\t");
      if (!/^[ACDMRTUXB][0-9]*$/.test(status) || !paths.length) {
        throw new Error(`Unexpected git name-status record: ${line}`);
      }
      return { status, paths };
    });
}
