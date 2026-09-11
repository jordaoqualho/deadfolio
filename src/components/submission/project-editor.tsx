"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Plus,
  Upload,
  X,
} from "lucide-react";
import type { ProjectSubmission } from "@/types/project";
import {
  categories,
  stages,
  statuses,
  causes,
  nextSteps,
  projectSubmissionSchema,
} from "@/lib/schemas/project";
import { saveSubmission } from "@/app/actions";
import { trackEvent } from "@/components/analytics";
const sections = [
  "Project",
  "Story",
  "Autopsy",
  "Remains",
  "Future",
  "Creator",
  "Review",
];
const sectionFields = [
  ["title", "tagline", "category", "stage", "status", "links"],
  ["summary", "originalIdea", "whyBuilt", "whatWasBuilt"],
  [
    "primaryCauseOfDeath",
    "causeExplanation",
    "whatWentWrong",
    "whatWorked",
    "lessons",
  ],
  [
    "survivingAssets",
    "technologies",
    "developmentDuration",
    "developmentPeriod",
    "estimatedHours",
    "coverImage",
    "screenshots",
  ],
  ["desiredNextSteps", "contactUrl"],
  ["creator", "email"],
];
type Attachment = { file: File; alt: string };
async function compress(file: File) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("Choose JPEG, PNG or WebP images under 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 24000000)
      throw new Error("Choose an image smaller than 24 megapixels.");
    const scale = Math.min(1, 1600 / bitmap.width, 1600 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not prepare this image.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob: Blob | null = null;
    for (const quality of [0.82, 0.65, 0.45]) {
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob && blob.size <= 450000) break;
    }
    if (!blob || blob.size > 450000)
      throw new Error(
        "This image is too detailed. Please choose a smaller image.",
      );
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
      type: "image/webp",
    });
  } finally {
    bitmap.close();
  }
}
export function ProjectEditor({
  initial,
  story = "",
  editId,
}: {
  initial: ProjectSubmission;
  story?: string;
  editId?: string;
}) {
  const [data, setData] = useState<ProjectSubmission>(() =>
    structuredClone(initial),
  );
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [cover, setCover] = useState<Attachment | null>(null);
  const [shots, setShots] = useState<Attachment[]>([]);
  const [success, setSuccess] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  function update<K extends keyof ProjectSubmission>(
    key: K,
    value: ProjectSubmission[K],
  ) {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
  }
  function go(n: number) {
    setStep(n);
    setError("");
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }
  function fieldError(key: string) {
    return errors[key] ? (
      <span id={`${key}-error`} className="field-error">
        {errors[key]}
      </span>
    ) : null;
  }
  function textField(
    key: keyof ProjectSubmission,
    label: string,
    placeholder = "",
    multiline = false,
    required = false,
  ) {
    const value = data[key];
    return (
      <label className="field" key={key}>
        <span>
          {label}
          {required && <span className="required"> *</span>}
        </span>
        {multiline ? (
          <textarea
            id={key}
            value={String(value ?? "")}
            rows={4}
            placeholder={placeholder}
            maxLength={6000}
            aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? `${key}-error` : undefined}
            onChange={(e) => update(key, e.target.value as never)}
          />
        ) : (
          <input
            id={key}
            value={String(value ?? "")}
            placeholder={placeholder}
            maxLength={key === "title" ? 100 : key === "tagline" ? 240 : 100}
            aria-invalid={!!errors[key]}
            aria-describedby={errors[key] ? `${key}-error` : undefined}
            onChange={(e) => update(key, e.target.value as never)}
          />
        )}{" "}
        {fieldError(key)}
      </label>
    );
  }
  function listField(
    key: keyof ProjectSubmission,
    label: string,
    placeholder: string,
  ) {
    return (
      <ListField
        key={key}
        label={label}
        value={data[key] as string[]}
        onChange={(v) => update(key, v as never)}
        placeholder={placeholder}
        error={errors[key]}
      />
    );
  }
  function selectField(
    key: "category" | "stage" | "status" | "primaryCauseOfDeath",
    label: string,
    options: Record<string, string>,
  ) {
    return (
      <label className="field">
        <span>
          {label} <span className="required">*</span>
        </span>
        <select
          value={data[key]}
          onChange={(e) => update(key, e.target.value as never)}
        >
          {Object.entries(options).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {fieldError(key)}
      </label>
    );
  }
  function nestedField(
    group: "links" | "creator",
    key: string,
    label: string,
    type = "url",
  ) {
    const value = (data[group] as Record<string, string>)[key];
    const path = `${group}.${key}`;
    return (
      <label className="field" key={path}>
        <span>
          {label}
          {key === "name" && <span className="required"> *</span>}
        </span>
        <input
          type={type}
          value={value}
          maxLength={type === "url" ? 2048 : 100}
          placeholder={type === "url" ? "https://…" : ""}
          aria-invalid={!!errors[path]}
          aria-describedby={errors[path] ? `${path}-error` : undefined}
          onChange={(e) =>
            update(group, { ...data[group], [key]: e.target.value } as never)
          }
        />
        {fieldError(path)}
      </label>
    );
  }
  function validateSection() {
    const result = projectSubmissionSchema.safeParse(data);
    if (result.success) return true;
    const relevant = result.error.issues.filter((i) =>
      sectionFields[step]?.includes(String(i.path[0])),
    );
    setErrors(
      Object.fromEntries(relevant.map((i) => [i.path.join("."), i.message])),
    );
    if (relevant.length) {
      setError("A few details need your attention before continuing.");
      return false;
    }
    return true;
  }
  async function addFiles(files: FileList | null, isCover: boolean) {
    if (!files?.length) return;
    setError("");
    if (!isCover && shots.length + data.screenshots.length + files.length > 5) {
      setError("Attach no more than five screenshots.");
      return;
    }
    setCompressing(true);
    try {
      const prepared = await Promise.all(
        Array.from(files).map(async (file) => ({
          file: await compress(file),
          alt: "",
        })),
      );
      if (isCover) setCover(prepared[0]);
      else setShots((old) => [...old, ...prepared]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The images could not be prepared.",
      );
    } finally {
      setCompressing(false);
    }
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const parsed = projectSubmissionSchema.safeParse(data);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        setErrors(
          Object.fromEntries(issues.map((i) => [i.path.join("."), i.message])),
        );
        const target = sectionFields.findIndex((fields) =>
          fields.includes(String(issues[0].path[0])),
        );
        go(Math.max(0, target));
        setError("A few details need your attention.");
        return;
      }
      if ((cover && !cover.alt.trim()) || shots.some((s) => !s.alt.trim())) {
        go(3);
        setError("Add a description for each image.");
        return;
      }
      const form = new FormData();
      form.set("project", JSON.stringify(data));
      if (cover) {
        form.set("cover", cover.file);
        form.set("coverAlt", cover.alt);
      }
      for (const shot of shots) {
        form.append("screenshots", shot.file);
        form.append("screenshotAlt", shot.alt);
      }
      const result = await saveSubmission(form, editId);
      if (!result.ok) {
        setError(result.error || "Your project could not be saved.");
        setErrors(result.fields || {});
        return;
      }
      if (editId) {
        router.push("/admin");
        router.refresh();
      } else {
        setSuccess(result.id!);
        trackEvent("Submission completed");
      }
    } catch {
      setError(
        "We couldn’t save your project. Your story is still here. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <div className="submission-success" role="status">
        <span className="success-icon">
          <Check size={32} />
        </span>
        <span className="eyebrow">STORY RECEIVED</span>
        <h1>
          Your project is
          <br />
          waiting to be buried.
        </h1>
        <p>We review submissions before they enter the Graveyard.</p>
        <div className="submission-id">
          <span className="eyebrow">YOUR SUBMISSION IDENTIFIER</span>
          <code>{success}</code>
        </div>
        <p className="muted">Keep this identifier for your records.</p>
        <a className="button primary" href="/graveyard">
          Explore the Graveyard <ArrowRight size={18} />
        </a>
      </div>
    );
  return (
    <div className="editor">
      <div className="editor-intro">
        <span className="eyebrow">
          {editId ? "EDIT PROJECT RECORD" : "REVIEW BEFORE BURIAL"}
        </span>
        <h1>
          {editId ? "Edit the autopsy." : "Here’s your project’s autopsy."}
        </h1>
        <p>Keep it honest. Add what’s missing. Leave unknown details blank.</p>
      </div>
      {story && (
        <details className="original-story">
          <summary>Your original story is still here</summary>
          <p>{story}</p>
        </details>
      )}
      <div className="editor-layout">
        <nav className="step-nav" aria-label="Postmortem sections">
          {sections.map((section, i) => (
            <button
              key={section}
              type="button"
              className={step === i ? "active" : ""}
              aria-current={step === i ? "step" : undefined}
              disabled={busy || compressing}
              onClick={() => go(i)}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              {section}
              <ArrowRight size={14} />
            </button>
          ))}
        </nav>
        <form
          className="editor-panel"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 6) void submit();
            else if (validateSection()) go(step + 1);
          }}
        >
          <div className="editor-section-heading">
            <span className="eyebrow">
              {String(step + 1).padStart(2, "0")} / 07
            </span>
            <h2 tabIndex={-1} ref={heading}>
              {sections[step]}
            </h2>
            <p>
              {
                [
                  "Give the work a name and a little context.",
                  "What did you set out to do? What became real?",
                  "The honest part. What happened, and what did it teach you?",
                  "Code, designs, experiments. What is still worth keeping?",
                  "A proper ending, or a second beginning.",
                  "A name for the record. An email for the review.",
                  "One final look. Nothing is published until we review it.",
                ][step]
              }
            </p>
          </div>
          <div className="fields">
            {step === 0 && (
              <>
                {textField(
                  "title",
                  "Project name",
                  "The name on the repository",
                  false,
                  true,
                )}
                {textField(
                  "tagline",
                  "One sentence description",
                  "What was it, in one sentence?",
                  false,
                  true,
                )}
                <div className="field-grid">
                  {selectField("category", "Category", categories)}
                  {selectField("stage", "Stage reached", stages)}
                </div>
                {selectField("status", "Project status", statuses)}
                {nestedField("links", "website", "Website")}
                {nestedField("links", "github", "Project GitHub")}
                {nestedField("links", "demo", "Demo")}
              </>
            )}
            {step === 1 && (
              <>
                {textField(
                  "summary",
                  "Short summary",
                  "A brief overview of the project.",
                  true,
                )}
                {textField(
                  "originalIdea",
                  "What were you building?",
                  "What problem were you solving, and for whom?",
                  true,
                  true,
                )}
                {textField(
                  "whyBuilt",
                  "Why did you build it?",
                  "Why did you think this could work?",
                  true,
                )}
                {listField(
                  "whatWasBuilt",
                  "How far did you get?",
                  "One feature or completed component per line",
                )}
              </>
            )}
            {step === 2 && (
              <>
                {selectField(
                  "primaryCauseOfDeath",
                  "Primary cause of death",
                  causes,
                )}
                {textField(
                  "causeExplanation",
                  "Why did you stop?",
                  "Be specific. This is the core of your postmortem.",
                  true,
                  true,
                )}
                {listField(
                  "whatWentWrong",
                  "What went wrong?",
                  "Mistakes, assumptions and problems — one per line",
                )}
                {listField(
                  "whatWorked",
                  "What actually worked?",
                  "The parts that did their job — one per line",
                )}
                {listField(
                  "lessons",
                  "What did you learn?",
                  "Concrete lessons, not motivational quotes — one per line",
                )}
              </>
            )}
            {step === 3 && (
              <>
                {listField(
                  "survivingAssets",
                  "What still exists?",
                  "Frontend, repository, design system… one per line",
                )}
                {listField(
                  "technologies",
                  "Technologies",
                  "One technology per line",
                )}
                <div className="field-grid">
                  {textField(
                    "developmentDuration",
                    "Development time",
                    "e.g. 11 months",
                  )}
                  {textField(
                    "developmentPeriod",
                    "Development period",
                    "e.g. Jan–Nov 2024",
                  )}
                </div>
                <label className="field">
                  <span>Estimated hours invested</span>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    step={1}
                    value={data.estimatedHours ?? ""}
                    onChange={(e) =>
                      update(
                        "estimatedHours",
                        e.target.value === "" ? null : Number(e.target.value),
                      )
                    }
                  />
                  {fieldError("estimatedHours")}
                </label>
                <div className="upload-area">
                  <h3>Preserve the evidence</h3>
                  <p>
                    One cover and up to five screenshots. JPEG, PNG or WebP, up
                    to 10 MB each. Images are compressed before upload.
                  </p>
                  {data.coverImage && (
                    <ExistingImage
                      image={data.coverImage}
                      onAltChange={(alt) =>
                        update("coverImage", { ...data.coverImage!, alt })
                      }
                      onRemove={() => update("coverImage", null)}
                    />
                  )}
                  <label className="upload-control">
                    <Upload size={19} />
                    <span>{cover ? "Replace cover" : "Add a cover image"}</span>
                    <input
                      aria-label="Upload cover image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={compressing || busy}
                      onChange={(e) => {
                        void addFiles(e.target.files, true);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {cover && (
                    <AttachmentRow
                      value={cover}
                      update={setCover}
                      remove={() => setCover(null)}
                    />
                  )}
                  <div className="existing-images">
                    {data.screenshots.map((image, i) => (
                      <ExistingImage
                        key={image.url}
                        image={image}
                        onAltChange={(alt) =>
                          update(
                            "screenshots",
                            data.screenshots.map((s, j) =>
                              i === j ? { ...s, alt } : s,
                            ),
                          )
                        }
                        onRemove={() =>
                          update(
                            "screenshots",
                            data.screenshots.filter((_, j) => i !== j),
                          )
                        }
                      />
                    ))}
                  </div>
                  <label className="upload-control">
                    <Plus size={19} />
                    <span>
                      Add screenshots ({shots.length + data.screenshots.length}
                      /5)
                    </span>
                    <input
                      aria-label="Upload screenshots"
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      disabled={
                        compressing ||
                        busy ||
                        shots.length + data.screenshots.length >= 5
                      }
                      onChange={(e) => {
                        void addFiles(e.target.files, false);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {shots.map((shot, i) => (
                    <AttachmentRow
                      key={i}
                      value={shot}
                      update={(v) =>
                        v &&
                        setShots((items) =>
                          items.map((s, j) => (i === j ? v : s)),
                        )
                      }
                      remove={() =>
                        setShots((items) => items.filter((_, j) => i !== j))
                      }
                    />
                  ))}
                  {compressing && (
                    <p role="status" className="processing">
                      <LoaderCircle className="spin" size={17} />
                      Preparing images…
                    </p>
                  )}
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <fieldset className="intention-options">
                  <legend>What should happen to this project?</legend>
                  {Object.entries(nextSteps).map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={data.desiredNextSteps.includes(key as never)}
                        onChange={(e) => {
                          const k =
                            key as ProjectSubmission["desiredNextSteps"][number];
                          update(
                            "desiredNextSteps",
                            e.target.checked
                              ? key === "let-it-rest"
                                ? ["let-it-rest"]
                                : [
                                    ...data.desiredNextSteps.filter(
                                      (s) => s !== "let-it-rest",
                                    ),
                                    k,
                                  ]
                              : data.desiredNextSteps.filter((s) => s !== key),
                          );
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  {fieldError("desiredNextSteps")}
                </fieldset>
                <label className="field">
                  <span>Public contact link (optional)</span>
                  <input
                    type="url"
                    placeholder="https://your-site.com/contact"
                    value={data.contactUrl}
                    maxLength={2048}
                    onChange={(e) => update("contactUrl", e.target.value)}
                  />
                  <small>
                    Add a link only if you want people to contact you about this
                    project. It will be publicly visible. Leave it blank to
                    disable contact.
                  </small>
                  {fieldError("contactUrl")}
                </label>
              </>
            )}
            {step === 5 && (
              <>
                {nestedField("creator", "name", "Display name", "text")}
                <label className="field">
                  <span>
                    Private email <span className="required">*</span>
                  </span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={data.email}
                    maxLength={254}
                    aria-invalid={!!errors.email}
                    aria-describedby="email-note"
                    onChange={(e) => update("email", e.target.value)}
                  />
                  <small id="email-note">
                    Only available to the moderator. Never displayed on your
                    public postmortem.
                  </small>
                  {fieldError("email")}
                </label>
                {nestedField("creator", "profileUrl", "Public profile URL")}
                {nestedField("creator", "github", "Creator GitHub")}
                {nestedField("creator", "linkedin", "LinkedIn")}
                {nestedField("creator", "x", "X")}
              </>
            )}
            {step === 6 && (
              <div className="review-summary">
                {sections.slice(0, 6).map((section, i) => (
                  <section key={section}>
                    <div>
                      <h3>{section}</h3>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => go(i)}
                      >
                        Edit <ArrowRight size={15} />
                      </button>
                    </div>
                    <ReviewSection data={data} section={i} />
                  </section>
                ))}
                <p className="notice">
                  By submitting, you confirm this is your project or you have
                  permission to share its story and images. Your private email
                  is for moderation only.
                </p>
                {(cover || shots.length > 0) && (
                  <p>
                    {(cover ? 1 : 0) + shots.length} new image(s) ready to
                    upload.
                  </p>
                )}
              </div>
            )}
          </div>
          {error && (
            <div role="alert" className="form-error">
              {error}
            </div>
          )}
          <div className="editor-actions">
            <button
              type="button"
              className="button secondary"
              disabled={step === 0 || busy || compressing}
              onClick={() => go(step - 1)}
            >
              <ArrowLeft size={17} />
              Back
            </button>
            <button
              className="button primary"
              disabled={busy || compressing}
              type="submit"
            >
              {busy ? (
                <>
                  <LoaderCircle size={18} className="spin" />
                  Saving your story…
                </>
              ) : step === 6 ? (
                <>
                  {editId ? "Save changes" : "Submit to Deadfolio"}
                  <ArrowRight size={18} />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function ListField({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  error?: string;
}) {
  const [raw, setRaw] = useState(value.join("\n"));
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        rows={4}
        value={raw}
        placeholder={placeholder}
        maxLength={12000}
        aria-invalid={!!error}
        onChange={(e) => {
          setRaw(e.target.value);
          onChange(
            e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }}
      />
      <small>One item per line. Leave blank if unknown.</small>
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
function AttachmentRow({
  value,
  update,
  remove,
}: {
  value: Attachment;
  update: (v: Attachment | null) => void;
  remove: () => void;
}) {
  return (
    <div className="attachment">
      <div>
        <span>{value.file.name}</span>
        <button
          type="button"
          className="icon-button"
          aria-label={`Remove ${value.file.name}`}
          onClick={remove}
        >
          <X size={17} />
        </button>
      </div>
      <label className="field">
        <span>
          Image description <span className="required">*</span>
        </span>
        <input
          value={value.alt}
          maxLength={200}
          placeholder="Describe what this image shows"
          onChange={(e) => update({ ...value, alt: e.target.value })}
        />
      </label>
    </div>
  );
}
function ExistingImage({
  image,
  onRemove,
  onAltChange,
}: {
  image: { url: string; alt: string };
  onRemove: () => void;
  onAltChange: (alt: string) => void;
}) {
  return (
    <div className="existing-image">
      <img src={image.url} alt={image.alt} />
      <label className="field">
        <span>Image description</span>
        <input
          value={image.alt}
          maxLength={200}
          onChange={(e) => onAltChange(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="icon-button"
        aria-label={`Remove ${image.alt}`}
        onClick={onRemove}
      >
        <X size={16} />
      </button>
    </div>
  );
}
function ReviewSection({
  data: d,
  section,
}: {
  data: ProjectSubmission;
  section: number;
}) {
  const values: Record<string, React.ReactNode>[] = [
    {
      Name: d.title,
      Description: d.tagline,
      Category: categories[d.category],
      Stage: stages[d.stage],
      Status: statuses[d.status],
      ...d.links,
    },
    {
      Summary: d.summary,
      "The idea": d.originalIdea,
      "Why build it": d.whyBuilt,
      "What was built": d.whatWasBuilt.join("\n"),
    },
    {
      "Cause of death": causes[d.primaryCauseOfDeath],
      "Why it stopped": d.causeExplanation,
      "What went wrong": d.whatWentWrong.join("\n"),
      "What worked": d.whatWorked.join("\n"),
      Lessons: d.lessons.join("\n"),
    },
    {
      "Surviving assets": d.survivingAssets.join(", "),
      Technologies: d.technologies.join(", "),
      "Development time": d.developmentDuration,
      "Development period": d.developmentPeriod,
      Hours: d.estimatedHours,
      Cover: d.coverImage?.alt,
      Screenshots: d.screenshots.map((s) => s.alt).join(", "),
    },
    {
      "Next steps": d.desiredNextSteps.map((s) => nextSteps[s]).join(", "),
      "Public contact": d.contactUrl,
    },
    {
      "Display name": d.creator.name,
      "Private email": d.email,
      Profile: d.creator.profileUrl,
      GitHub: d.creator.github,
      LinkedIn: d.creator.linkedin,
      X: d.creator.x,
    },
  ];
  return (
    <dl>
      {Object.entries(values[section]).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>
            {value !== "" && value != null ? (
              value
            ) : (
              <span className="muted">Not provided</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
