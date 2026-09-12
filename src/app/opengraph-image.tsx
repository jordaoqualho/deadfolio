import { ImageResponse } from "next/og";
export const alt = "Deadfolio — Your GitHub is full of projects you left behind.";
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
        FAILED PROJECTS BELONG IN YOUR PORTFOLIO
      </div>
      <div
        style={{
          fontSize: 66,
          letterSpacing: -4,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span>Your GitHub is full of projects you left behind.</span>
        <span style={{ color: "#a2a59a" }}>Deadfolio digs them up.</span>
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 32 }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "#111310",
            border: "1px solid #34392e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c6f36b",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          +
        </div>
        deadfolio<span style={{ color: "#c6f36b" }}>.</span>
      </div>
    </div>,
    size,
  );
}
