import { ImageResponse } from "next/og";

import { shopConfig } from "@/shop.config";

export function GET() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#f4f1eb",
        color: "#171717",
        display: "flex",
        fontSize: 72,
        fontWeight: 600,
        height: "100%",
        justifyContent: "center",
        letterSpacing: "-0.04em",
        padding: 80,
        textAlign: "center",
        width: "100%",
      }}
    >
      {shopConfig.site.name}
    </div>,
    { width: 1200, height: 630 },
  );
}
