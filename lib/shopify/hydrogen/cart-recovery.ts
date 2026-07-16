import "server-only";

const CART_COOKIE = "cart";

export function hasHydrogenCartCookie(request: Request): boolean {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .some((part) => part.trim().startsWith(`${CART_COOKIE}=`)) ?? false
  );
}

export function withoutHydrogenCartCookie(request: Request): Request {
  const headers = new Headers(request.headers);
  const cookie = headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith(`${CART_COOKIE}=`))
    .join("; ");
  if (cookie) headers.set("cookie", cookie);
  else headers.delete("cookie");
  return new Request(request, { headers });
}

export async function responseHasExpiredCart(response: Response): Promise<boolean> {
  if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
    return false;
  }
  const payload = (await response
    .clone()
    .json()
    .catch(() => null)) as {
    cart?: unknown;
    userErrors?: Array<{ code?: unknown; message?: unknown }>;
  } | null;
  if (!payload || payload.cart !== null || !Array.isArray(payload.userErrors)) return false;
  return payload.userErrors.some(
    (error) =>
      error.code === "INVALID" &&
      typeof error.message === "string" &&
      /(?:cart.*(?:expired|invalid|not found|does not exist)|(?:expired|invalid|not found).*cart)/i.test(
        error.message,
      ),
  );
}
