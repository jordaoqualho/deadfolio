"use server";
import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/repositories";
import {
  autopsyPublishSchema,
  publishAutopsyProject,
} from "@/lib/services/publish-autopsy";
import { findAutopsy } from "@/lib/services/autopsy";
import { clientKey, rateLimit } from "@/lib/security";

export type ActionResult = {
  ok: boolean;
  id?: string;
  slug?: string;
  error?: string;
};

/** Publishes a Graveyard record built from a cached repository autopsy. */
export async function publishAutopsy(input: unknown): Promise<ActionResult> {
  try {
    if (!rateLimit(`publish:${await clientKey()}`, 10))
      return { ok: false, error: "rate-limit" };
    const parsed = autopsyPublishSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const autopsy = await findAutopsy(parsed.data.key);
    if (!autopsy) return { ok: false, error: "missing-autopsy" };
    const p = await publishAutopsyProject(
      autopsy,
      parsed.data,
      getRepository(),
    );
    revalidatePath("/", "layout");
    return { ok: true, id: p.id, slug: p.slug };
  } catch (error) {
    console.error(
      "Autopsy publish failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { ok: false, error: "save-failed" };
  }
}
