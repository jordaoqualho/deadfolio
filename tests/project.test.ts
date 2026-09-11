import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { emptySubmission } from "../src/lib/schemas/empty-submission";
import {
  projectSubmissionSchema,
  projectDraftSchema,
  storedProjectSchema,
} from "../src/lib/schemas/project";
import { seedProjects } from "../src/data/seed-projects";
import { LocalProjectRepository } from "../src/lib/repositories/local-project-repository";
import { submitProject } from "../src/lib/services/submit-project";
import { attachMedia } from "../src/lib/services/media";
const valid = () => ({
  ...structuredClone(emptySubmission),
  title: "Test archive",
  tagline: "An unfinished project with lessons worth preserving.",
  originalIdea: "Help developers keep track of small ideas and experiments.",
  causeExplanation:
    "The maker stopped using the tool and decided to stop maintaining it.",
  creator: { ...emptySubmission.creator, name: "Test Maker" },
  email: "private@example.test",
});
test("the schema rejects unsafe URLs, invalid input and contradictory intentions", () => {
  assert.equal(projectSubmissionSchema.safeParse(valid()).success, true);
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
    "https://user:password@example.com",
  ])
    assert.equal(
      projectSubmissionSchema.safeParse({ ...valid(), contactUrl: url })
        .success,
      false,
    );
  assert.equal(
    projectSubmissionSchema.safeParse({
      ...valid(),
      desiredNextSteps: ["let-it-rest", "offers"],
    }).success,
    false,
  );
  assert.equal(
    projectSubmissionSchema.safeParse({ ...valid(), estimatedHours: -5 })
      .success,
    false,
  );
  assert.equal(
    projectSubmissionSchema.safeParse({ ...valid(), email: "broken" }).success,
    false,
  );
  assert.equal(
    projectSubmissionSchema.safeParse({ ...valid(), title: "" }).success,
    false,
  );
  assert.equal(
    projectSubmissionSchema.safeParse({
      ...valid(),
      screenshots: Array.from({ length: 6 }, () => ({
        url: "/media/id/img.webp",
        alt: "Screenshot",
      })),
    }).success,
    false,
  );
});
test("AI schema supports unknown facts and rejects fabricated enum categories", () => {
  const draft = {
    title: null,
    tagline: null,
    summary: null,
    category: null,
    stage: null,
    primaryCauseOfDeath: null,
    causeExplanation: null,
    originalIdea: null,
    whatWasBuilt: [],
    whatWentWrong: [],
    whatWorked: [],
    lessons: [],
    survivingAssets: [],
    technologies: [],
    desiredNextSteps: [],
  };
  assert.equal(projectDraftSchema.safeParse(draft).success, true);
  assert.equal(
    projectDraftSchema.safeParse({ ...draft, primaryCauseOfDeath: "bad luck" })
      .success,
    false,
  );
});
test("seeds are valid, explicitly marked examples and have no invented metrics", () => {
  for (const p of seedProjects) {
    assert.equal(storedProjectSchema.safeParse(p).success, true);
    assert.equal(p.isDemo, true);
    assert.equal(p.estimatedHours, null);
  }
  assert.deepEqual(seedProjects[0].technologies, []);
});
test("submission, moderation, edits and deletion persist across repository instances without exposing private email", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "deadfolio-test-"));
  try {
    const repo = new LocalProjectRepository(dir, false);
    const input = valid();
    const p = await submitProject(
      { ...input, moderationStatus: "published", isDemo: true },
      repo,
    );
    assert.equal(p.moderationStatus, "submitted");
    assert.equal(p.isDemo, false);
    assert.equal((await repo.findPublished()).length, 0);
    assert.equal(await repo.findBySlug(p.slug), null);
    const duplicate = await submitProject(input, repo);
    assert.notEqual(p.slug, duplicate.slug);
    await repo.approve(p.id);
    const restarted = new LocalProjectRepository(dir, false);
    const publicProject = await restarted.findBySlug(p.slug);
    assert.ok(publicProject);
    assert.equal("email" in publicProject, false);
    assert.equal(JSON.stringify(publicProject).includes(input.email), false);
    await restarted.update(p.id, { ...input, title: "Revised title" });
    assert.equal((await repo.findById(p.id))?.title, "Revised title");
    assert.equal((await repo.findById(p.id))?.slug, p.slug);
    await repo.reject(p.id);
    assert.equal(await restarted.findBySlug(p.slug), null);
    await repo.approve(p.id);
    await repo.delete(p.id);
    assert.equal(await restarted.findById(p.id), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("deleting seed records does not resurrect them on restart", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "deadfolio-seed-"));
  try {
    const repo = new LocalProjectRepository(dir, true);
    assert.equal((await repo.findPublished()).length, 2);
    await repo.delete("seed-fintal");
    assert.equal(
      (await new LocalProjectRepository(dir, true).findPublished()).length,
      1,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("media pipeline validates actual content, compresses images and associates them with the record", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "deadfolio-media-"));
  try {
    const repo = new LocalProjectRepository(dir, false);
    const image = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#c6f36b" },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.set(
      "cover",
      new File([new Uint8Array(image)], "cover.png", { type: "image/png" }),
    );
    form.set("coverAlt", "The project dashboard");
    const input = await attachMedia(valid(), form, "test-media", repo);
    assert.ok(input.coverImage);
    const stored = await repo.readMedia(
      "test-media",
      input.coverImage.url.split("/").pop()!,
    );
    assert.equal((await sharp(stored!).metadata()).format, "webp");
    await submitProject(input, repo, "test-media");
    await repo.delete("test-media");
    assert.equal(
      await repo.readMedia(
        "test-media",
        input.coverImage.url.split("/").pop()!,
      ),
      null,
    );
    const fake = new FormData();
    fake.set(
      "cover",
      new File(["<script>alert(1)</script>"], "fake.png", {
        type: "image/png",
      }),
    );
    fake.set("coverAlt", "Bad file");
    await assert.rejects(
      () => attachMedia(valid(), fake, "test-fake", repo),
      /could not be read/,
    );
    await assert.rejects(
      () => repo.readMedia("../outside", "test.webp"),
      /Invalid storage path/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
