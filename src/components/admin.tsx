"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAdmin, moderateProject } from "@/app/actions";
export function AdminLogin({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(loginAdmin, { error: "" });
  return (
    <form action={action} className="admin-login">
      <span className="eyebrow">RESTRICTED ACCESS</span>
      <h1>The keeper’s desk.</h1>
      <p>Review the stories before they enter the archive.</p>
      {!configured ? (
        <div className="notice">
          Admin access is disabled. Set ADMIN_PASSWORD to a random value of at
          least 16 characters in the server environment.
        </div>
      ) : (
        <>
          <label className="field">
            <span>Admin password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </label>
          {state.error && (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          )}
          <button className="button primary" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </>
      )}
    </form>
  );
}
export function AdminActions({ id, status, canPublish = true }: { id: string; status: string; canPublish?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function run(action: "publish" | "reject" | "delete") {
    if (
      action === "delete" &&
      !window.confirm(
        "Permanently delete this project and its images? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await moderateProject(id, action);
      if (!result.ok) setError(result.error || "Change failed.");
      else router.refresh();
    } catch {
      setError("The change failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="admin-actions">
        <Link className="button secondary small" href={`/admin/${id}`}>
          Preview
        </Link>
        <Link className="button secondary small" href={`/admin/${id}/edit`}>
          Edit
        </Link>
        {status !== "published" && canPublish && (
          <button
            className="button primary small"
            disabled={busy}
            onClick={() => run("publish")}
          >
            Publish
          </button>
        )}
        {status !== "rejected" && (
          <button
            className="button secondary small"
            disabled={busy}
            onClick={() => run("reject")}
          >
            Reject
          </button>
        )}
        <button
          className="button danger small"
          disabled={busy}
          onClick={() => run("delete")}
        >
          Delete
        </button>
      </div>
      {busy && <p role="status">Saving…</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
