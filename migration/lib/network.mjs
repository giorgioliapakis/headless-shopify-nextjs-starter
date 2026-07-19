import { resolve4, resolve6 } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

const MAX_RESPONSE_BYTES = 1_048_576;

export function validatePublicStoreUrl(input) {
  const url = new URL(input);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new Error("Store URL must be credential-free HTTPS on the standard port");
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local") || isIP(hostname)) {
    throw new Error("Store URL must use a public DNS hostname, not localhost or an IP literal");
  }
  url.hash = "";
  return url;
}

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    if (normalized === "::" || normalized === "::1") return false;
    if (/^(?:fc|fd|fe8|fe9|fea|feb)/.test(normalized.replace(/^0+/, ""))) return false;
    if (/^(?:ff|100:|2001:db8:|64:ff9b:1:)/.test(normalized.replace(/^0+/, ""))) return false;
    if (normalized.startsWith("::ffff:")) return isPublicAddress(normalized.slice(7));
    return true;
  }
  return false;
}

export async function safePublicGet(input, options = {}) {
  const approvedOrigin = options.approvedOrigin ?? new URL(input).origin;
  let url = new URL(input);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    if (url.origin !== approvedOrigin)
      throw new Error(`Cross-origin redirect blocked: ${url.origin}`);
    const addresses = await resolvePublicAddresses(url.hostname);
    const response = await requestPinned(url, addresses[0], options.maxBytes ?? MAX_RESPONSE_BYTES);
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.location;
      if (!location) throw new Error("Redirect response omitted Location");
      url = new URL(location, url);
      continue;
    }
    return { ...response, url: url.toString() };
  }
  throw new Error("Too many redirects");
}

async function resolvePublicAddresses(hostname) {
  const [v4, v6] = await Promise.all([
    resolve4(hostname).catch(() => []),
    resolve6(hostname).catch(() => []),
  ]);
  const addresses = [
    ...v4.map((address) => ({ address, family: 4 })),
    ...v6.map((address) => ({ address, family: 6 })),
  ];
  if (addresses.length === 0) throw new Error(`No DNS addresses found for ${hostname}`);
  if (addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error(`Private or reserved DNS address blocked for ${hostname}`);
  }
  return addresses;
}

function requestPinned(url, resolved, maxBytes) {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        headers: {
          accept: "text/html, application/xml, text/xml, text/plain;q=0.8",
          "accept-encoding": "identity",
          "user-agent": "AgenticShopifyMigration/0.1 (+read-only public snapshot)",
        },
        lookup: (_hostname, _options, callback) =>
          callback(null, resolved.address, resolved.family),
        servername: url.hostname,
        timeout: 10_000,
      },
      (response) => {
        const chunks = [];
        let bytes = 0;
        response.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > maxBytes) {
            request.destroy(new Error(`Response exceeded ${maxBytes} bytes`));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            bytes,
            headers: response.headers,
            status: response.statusCode ?? 0,
          });
        });
      },
    );
    request.on("timeout", () => request.destroy(new Error("Public snapshot request timed out")));
    request.on("error", reject);
    request.end();
  });
}
