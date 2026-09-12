import { adminConfigured, isAdmin } from "@/lib/security";
import { getRepository } from "@/lib/repositories";
import { AdminLogin, AdminActions } from "@/components/admin";
import Link from "next/link";
import { projectSubmissionSchema } from "@/lib/schemas/project";
import { logoutAdmin } from "@/app/actions";
export default async function Admin() {
  if (!(await isAdmin()))
    return (
      <div className="shell page-space">
        <AdminLogin configured={adminConfigured()} />
      </div>
    );
  const projects = (await getRepository().findAll()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
  const realPublished = projects.filter(
    (p) =>
      !p.isDemo &&
      p.submissionType !== "raw" &&
      p.moderationStatus === "published",
  );
  const founders = realPublished.filter((p) => p.isFounder);
  return (
    <div className="shell page-space">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MODERATION</span>
          <h1>The keeper’s desk.</h1>
        </div>
        <form action={logoutAdmin}>
          <button className="button secondary">Sign out</button>
        </form>
      </div>
      <div
        className={
          realPublished.length === 0
            ? "form-error launch-readiness"
            : "notice launch-readiness"
        }
        role="status"
      >
        <strong>
          {realPublished.length === 0
            ? "Not ready to launch: no real published projects."
            : `${realPublished.length} real projects in the public archive.`}
        </strong>
        <p>
          {founders.length}/2 founder projects published. Add and review at
          least two genuine founder projects before launch. Sample records do
          not count and are hidden in production.
        </p>
        <Link href="/admin/new" className="button primary small">
          Add a founder project
        </Link>
      </div>
      {(["submitted", "published", "rejected", "draft"] as const).map(
        (status) => (
          <section className="admin-group" key={status}>
            <h2>
              {status === "submitted"
                ? "Pending submissions"
                : status === "published"
                  ? "Published projects"
                  : status === "rejected"
                    ? "Rejected submissions"
                    : "Drafts"}{" "}
              <span className="muted">
                ({projects.filter((p) => p.moderationStatus === status).length})
              </span>
            </h2>
            {projects
              .filter((p) => p.moderationStatus === status)
              .map((p) => (
                <article className="admin-record" key={p.id}>
                  <div>
                    <h3>
                      {p.title}
                      {p.isDemo && <span className="inline-demo">SAMPLE</span>}
                    </h3>
                    <p>
                      {p.submissionType === "raw"
                        ? "Raw story · needs structuring before publication"
                        : "Structured record"}
                      {p.isFounder ? " · Founder project" : ""}
                    </p>
                    <p>{p.tagline || p.rawStory.slice(0, 180)}</p>
                    <p className="mono">
                      {p.creator.name} ·{" "}
                      {new Date(p.createdAt).toLocaleDateString("en-US")}
                    </p>
                    <details>
                      <summary>Private submission details</summary>
                      <p>{p.email}</p>
                      <code>{p.id}</code>
                    </details>
                  </div>
                  <AdminActions
                    id={p.id}
                    status={status}
                    canPublish={
                      p.submissionType !== "raw" &&
                      projectSubmissionSchema.safeParse(p).success
                    }
                  />
                </article>
              ))}
            {!projects.some((p) => p.moderationStatus === status) && (
              <p className="muted">
                No {status === "submitted" ? "pending" : status} records.
              </p>
            )}
          </section>
        ),
      )}
    </div>
  );
}
