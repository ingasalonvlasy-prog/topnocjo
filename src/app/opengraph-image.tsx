import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Qsport.cz — sportovní vybavení";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B1727",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo text */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontSize: "96px",
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-2px",
            }}
          >
            QSPORT
          </span>
          <span
            style={{
              fontSize: "96px",
              fontWeight: 800,
              color: "#CEFF2F",
              letterSpacing: "-2px",
            }}
          >
            .
          </span>
        </div>

        {/* Lime accent line */}
        <div
          style={{
            width: "80px",
            height: "5px",
            backgroundColor: "#CEFF2F",
            borderRadius: "3px",
            marginTop: "24px",
            marginBottom: "24px",
          }}
        />

        {/* Tagline */}
        <span
          style={{
            fontSize: "28px",
            fontWeight: 500,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Sport bez kompromisu
        </span>

        {/* Domain */}
        <span
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#CEFF2F",
            letterSpacing: "4px",
            marginTop: "40px",
          }}
        >
          QSPORT.CZ
        </span>
      </div>
    ),
    { ...size },
  );
}
