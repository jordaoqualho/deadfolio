import { ImageResponse } from "next/og";
export const alt = "Deadfolio — Dead projects belong in your portfolio too.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#111310",
        color: "#eeeee6",
        padding: 70,
        justifyContent: "space-between",
      }}
    >
      <div style={{ fontSize: 25, color: "#c6f36b" }}>
        THE PORTFOLIO OF THINGS THAT DIDN’T MAKE IT
      </div>
      <div
        style={{
          fontSize: 84,
          letterSpacing: -4,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span>Good projects die.</span>
        <span style={{ color: "#a2a59a" }}>Their work doesn’t have to.</span>
      </div>
      <div style={{ display: "flex", fontSize: 32 }}>
        deadfolio<span style={{ color: "#c6f36b" }}>.</span>
      </div>
    </div>,
    size,
  );
}
