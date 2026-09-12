"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { projectSubmissionSchema } from "@/lib/schemas/project";
import { getRepository } from "@/lib/repositories";
import { submitStory, submitProject } from "@/lib/services/submit-project";
import {
  autopsyPublishSchema,
  submitAutopsyProject,
} from "@/lib/services/publish-autopsy";
import { findAutopsy } from "@/lib/services/autopsy";
import { attachMedia } from "@/lib/services/media";
import {
  adminConfigured,
  constantEqual,
  setAdminSession,
  clearAdminSession,
  requireAdmin,
  rateLimit,
  clientKey,
} from "@/lib/security";
export type ActionResult = {
  ok: boolean;
  id?: string;
  error?: string;
  fields?: Record<string, string>;
};
export async function saveSubmission(
  form: FormData,
  editId?: string,
): Promise<ActionResult> {
  try {
    const founder = form.get("founder") === "true";
    if (editId || founder) await requireAdmin();
    else if (!rateLimit(`submit:${await clientKey()}`, 10))
      return {
        ok: false,
        error: "Too many submissions. Please try again in an hour.",
      };
    let raw: unknown;
    try {
      raw = JSON.parse(String(form.get("project")));
    } catch {
      return {
        ok: false,
        error: "The project could not be read. Please try again.",
      };
    }
    const parsed = projectSubmissionSchema.safeParse(raw);
    if (!parsed.success)
      return {
        ok: false,
        error: "A few details need your attention.",
        fields: Object.fromEntries(
          parsed.error.issues.map((i) => [i.path.join("."), i.message]),
        ),
      };
    const repo = getRepository();
    const id = editId || randomUUID();
    const input = parsed.data;
    if (!editId && (input.coverImage || input.screenshots.length))
      return { ok: false, error: "Please upload your own project images." };
    if (editId) {
      const old = await repo.findById(editId);
      if (!old) throw new Error("Project not found.");
      const allowed = new Set([
        old.coverImage?.url,
        ...old.screenshots.map((s) => s.url),
      ]);
      if (
        [input.coverImage, ...input.screenshots].some(
          (m) => m && !allowed.has(m.url),
        )
      )
        throw new Error("Invalid existing image.");
    }
    const existing = editId ? await repo.findById(editId) : null;
    const previousUrls = [
      existing?.coverImage,
      ...(existing?.screenshots || []),
    ].flatMap((m) => (m ? [m.url] : []));
    await attachMedia(input, form, id, repo);
    const currentUrls = [input.coverImage, ...input.screenshots].flatMap((m) =>
      m ? [m.url] : [],
    );
    try {
      if (editId) await repo.update(id, input);
      else {
        const created = await submitProject(input, repo, id);
        if (founder) await repo.save({ ...created, isFounder: true });
      }
    } catch (error) {
      if (!editId) await repo.delete(id).catch(() => {});
      else
        await repo
          .deleteMedia(
            id,
            currentUrls
              .filter((url) => !previousUrls.includes(url))
              .map((url) => url.split("/").pop()!),
          )
          .catch(() => {});
      throw error;
    }
    if (editId)
      await repo
        .deleteMedia(
          id,
          previousUrls
            .filter((url) => !currentUrls.includes(url))
            .map((url) => url.split("/").pop()!),
        )
        .catch(() => {
          console.error("Unused image cleanup failed.");
        });
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (error) {
    console.error(
      "Submission failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return {
      ok: false,
      error:
        error instanceof Error &&
        /image|screenshot|session|Project not found/.test(error.message)
          ? error.message
          : "We couldn’t save your project. Your story is still here. Please try again.",
    };
  }
}
export async function loginAdmin(_state: { error: string }, form: FormData) {
  if (!rateLimit(`admin:${await clientKey()}`, 5, 15 * 60000))
    return { error: "Too many attempts. Try again in 15 minutes." };
  if (
    !adminConfigured() ||
    !constantEqual(
      String(form.get("password") || ""),
      process.env.ADMIN_PASSWORD!,
    )
  )
    return {
      error: "Unable to sign in. Check your password and configuration.",
    };
  await setAdminSession();
  redirect("/admin");
}
export async function logoutAdmin() {
  await clearAdminSession();
  redirect("/admin");
}
export async function moderateProject(
  id: string,
  action: "publish" | "reject" | "delete",
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const repo = getRepository();
    if (action === "publish") await repo.approve(id);
    else if (action === "reject") await repo.reject(id);
    else if (action === "delete") await repo.delete(id);
    else throw new Error("Invalid action.");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "The change could not be saved. Check your session and try again.",
    };
  }
}

export async function saveStory(
  input: unknown,
  draft?: unknown,
): Promise<ActionResult> {
  try {
    if (!rateLimit(`submit:${await clientKey()}`, 10))
      return { ok: false, error: "rate-limit" };
    const p = await submitStory(input, getRepository(), draft);
    revalidatePath("/admin");
    return { ok: true, id: p.id };
  } catch {
    return { ok: false, error: "save-failed" };
  }
}

/** Files a pending submission built from a cached repository autopsy. */
export async function publishAutopsy(input: unknown): Promise<ActionResult> {
  try {
    if (!rateLimit(`submit:${await clientKey()}`, 10))
      return { ok: false, error: "rate-limit" };
    const parsed = autopsyPublishSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };
    const autopsy = await findAutopsy(parsed.data.key);
    if (!autopsy) return { ok: false, error: "missing-autopsy" };
    const p = await submitAutopsyProject(
      autopsy,
      parsed.data,
      getRepository(),
    );
    revalidatePath("/admin");
    return { ok: true, id: p.id };
  } catch (error) {
    console.error(
      "Autopsy publish failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { ok: false, error: "save-failed" };
  }
}
