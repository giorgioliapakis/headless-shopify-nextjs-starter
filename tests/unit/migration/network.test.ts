import { describe, expect, it } from "vitest";

import { isPublicAddress, validatePublicStoreUrl } from "../../../migration/lib/network.mjs";

describe("migration public network boundary", () => {
  it("allows credential-free public HTTPS origins", () => {
    expect(validatePublicStoreUrl("https://example.com/collections/all").hostname).toBe(
      "example.com",
    );
  });

  it.each([
    "http://example.com",
    "https://user:pass@example.com",
    "https://localhost",
    "https://127.0.0.1",
    "https://example.com:8443",
  ])("rejects unsafe store URL %s", (url) => {
    expect(() => validatePublicStoreUrl(url)).toThrow();
  });

  it.each([
    "0.0.0.0",
    "10.1.2.3",
    "127.0.0.1",
    "169.254.1.1",
    "172.20.1.1",
    "192.168.1.1",
    "192.0.2.1",
    "198.51.100.1",
    "203.0.113.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
  ])("rejects private or reserved address %s", (address) =>
    expect(isPublicAddress(address)).toBe(false),
  );

  it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])("allows public address %s", (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
});
