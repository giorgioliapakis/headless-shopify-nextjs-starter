import { access, writeFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

describe("quarantine boundary probe", () => {
  it("cannot inherit host environment, write outside tmpfs, reach the broker or use the network", async () => {
    expect(process.env.QUARANTINE_HOST_SENTINEL).toBeUndefined();
    await expect(writeFile("/input/quarantine-escape", "blocked")).rejects.toBeDefined();
    await expect(writeFile("/quarantine-escape", "blocked")).rejects.toBeDefined();
    await expect(access("/var/run/agentic-shopify-broker.sock")).rejects.toBeDefined();
    await expect(
      fetch(["https:", "", "example.com"].join("/"), { signal: AbortSignal.timeout(1_000) }),
    ).rejects.toBeDefined();
  });
});
