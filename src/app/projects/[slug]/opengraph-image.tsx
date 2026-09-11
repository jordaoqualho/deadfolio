import { ImageResponse } from "next/og";
import { getRepository } from "@/lib/repositories";
import { causes, statuses } from "@/lib/schemas/project";
export const alt = "A project postmortem on Deadfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await getRepository().findBySlug((await params).slug);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#111310",
        color: "#eeeee6",
        padding: 65,
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", color: "#a2a59a", fontSize: 23 }}>
        PROJECT POSTMORTEM / {p ? statuses[p.status].toUpperCase() : "ARCHIVE"}
        {p?.developmentDuration
          ? ` AFTER ${p.developmentDuration.toUpperCase()}`
          : ""}
      </div>
      <div style={{ fontSize: 80, letterSpacing: -3 }}>
        {p?.title || "Deadfolio"}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderLeft: "4px solid #c6f36b",
          paddingLeft: 25,
        }}
      >
        <span style={{ fontSize: 20, color: "#a2a59a" }}>CAUSE OF DEATH</span>
        <span style={{ fontSize: 44, color: "#c6f36b", marginTop: 15 }}>
          {p ? causes[p.primaryCauseOfDeath].toUpperCase() : "STORY NOT FOUND"}
        </span>
      </div>
      <div style={{ fontSize: 28 }}>deadfolio.</div>
    </div>,
    size,
  );
}
