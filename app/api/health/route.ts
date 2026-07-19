export function GET(): Response {
  return Response.json({ status: "ok" }, { headers: { "cache-control": "private, no-store" } });
}
