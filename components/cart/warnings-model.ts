import type { CartErrorGroup, CartErrorState } from "@shopify/hydrogen";

function groupMessages(group: CartErrorGroup): string[] {
  return [
    ...group.userErrors.map((error) => error.message),
    ...group.warnings.map((warning) => warning.message),
  ].filter((message) => message.length > 0);
}

/**
 * Errors keyed to line IDs that are no longer in `data.lines.nodes` have no inline home — the
 * line row that would render them is gone — so they are promoted to the cart-level banner
 * instead of being silently lost. When an orphaned error group carries no readable message,
 * `fallbackMessage` is surfaced once per orphaned line so the failure is still visible.
 */
export function collectOrphanedLineMessages(
  lineErrors: CartErrorState["lines"],
  lines: ReadonlyArray<{ id: string }>,
  fallbackMessage: string,
): string[] {
  const presentIds = new Set(lines.map((line) => line.id));
  const messages: string[] = [];
  for (const [lineId, group] of lineErrors) {
    if (presentIds.has(lineId)) continue;
    const orphaned = groupMessages(group);
    if (orphaned.length === 0 && group.userErrors.length + group.warnings.length > 0) {
      messages.push(fallbackMessage);
    } else {
      messages.push(...orphaned);
    }
  }
  return messages;
}

/**
 * Dismissal is timestamp-based, per the Hydrogen cart store contract: the banner stays hidden
 * while `errors.lastUpdatedAt <= dismissedAt`, and reappears as soon as the store records a
 * newer error (which advances `lastUpdatedAt` past the dismissal).
 */
export function isBannerDismissed(lastUpdatedAt: number, dismissedAt: number): boolean {
  return lastUpdatedAt <= dismissedAt;
}
