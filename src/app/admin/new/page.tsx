import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/security";
import { ProjectEditor } from "@/components/submission/project-editor";
import { emptySubmission } from "@/lib/schemas/empty-submission";
export default async function NewFounderProject() {
  if (!(await isAdmin())) redirect("/admin");
  return (
    <div className="shell page-space">
      <div className="notice">
        Add a real founder project. Use only facts you can verify; leave unknown
        metrics blank. Saving keeps it in review until you explicitly publish
        it.
      </div>
      <ProjectEditor initial={emptySubmission} founder />
    </div>
  );
}
