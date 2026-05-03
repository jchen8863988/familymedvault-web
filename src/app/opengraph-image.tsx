import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "FamilyMedVault — Family health records & emergency readiness";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #115e59 50%, #0f172a 100%)",
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "white",
            letterSpacing: -1,
          }}
        >
          FamilyMedVault
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 26,
            color: "#94a3b8",
            textAlign: "center",
            maxWidth: 920,
            lineHeight: 1.35,
          }}
        >
          Family health records & emergency readiness
        </div>
      </div>
    ),
    { ...size },
  );
}
