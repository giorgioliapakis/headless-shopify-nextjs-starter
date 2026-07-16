export function appendServerTiming(
  headers: Headers,
  metric: string,
  durationMs: number,
  description?: string,
): void {
  if (!/^[a-z][a-z0-9_-]{0,31}$/i.test(metric) || !Number.isFinite(durationMs)) return;
  const safeDuration = Math.max(0, durationMs).toFixed(1);
  const safeDescription = description?.replace(/[^\w .:/-]/g, "").slice(0, 80);
  const value = `${metric};dur=${safeDuration}${safeDescription ? `;desc="${safeDescription}"` : ""}`;
  const existing = headers.get("server-timing");
  headers.set("server-timing", existing ? `${existing}, ${value}` : value);
}
