import { z } from "zod";
import { aiConfigured, extractProject } from "@/lib/ai/extract-project";
import { clientKey, rateLimit, sameOrigin } from "@/lib/security";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!aiConfigured())
    return Response.json(
      {
        error:
          "Could not build the postmortem. You can still submit your story.",
      },
      { status: 503 },
    );
  if (!(await sameOrigin(request)))
    return Response.json({ error: "Request not allowed." }, { status: 403 });
  if (!rateLimit("ai-global", 30) || !rateLimit(`ai:${await clientKey()}`, 5))
    return Response.json(
      {
        error: "You can still submit your story or try again later.",
      },
      { status: 429 },
    );
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json({ error: "Add your story." }, { status: 400 });
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65000) {
        await reader.cancel();
        return Response.json(
          { error: "Keep your story under 15,000 characters." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    const data = z
      .object({
        story: z.string().trim().min(50).max(15000),
        locale: z.enum(["en", "pt"]).default("en"),
        title: z.string().trim().max(100).optional(),
      })
      .safeParse(JSON.parse(Buffer.concat(chunks).toString()));
    if (!data.success)
      return Response.json(
        { error: "Tell us your story in 50–15,000 characters." },
        { status: 400 },
      );
    return Response.json(
      {
        draft: await extractProject(
          `${data.data.title ? `Project: ${data.data.title}\n\n` : ""}${data.data.story}`,
          data.data.locale,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error: "We couldn't format your story automatically. Nothing was lost.",
      },
      { status: 502 },
    );
  }
}
