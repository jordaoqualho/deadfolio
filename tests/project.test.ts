import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  emptyProjectContent,
  projectDraftSchema,
  projectSchema,
  storedProjectSchema,
} from "../src/lib/schemas/project";
import { seedProjects } from "../src/data/seed-projects";
import { LocalProjectRepository } from "../src/lib/repositories/local-project-repository";

const record = (patch: Record<string, unknown> = {}) => ({
  ...structuredClone(emptyProjectContent),
  id: "test-archive",
  slug: "test-archive",
  title: "Test archive",
  tagline: "An unfinished project with lessons worth preserving.",
  originalIdea: "Help developers keep track of small ideas and experiments.",
  causeExplanation: "The maker stopped using the tool and decided to stop maintaining it.",
  creator: { ...emptyProjectContent.creator, name: "Test Maker" },
  createdAt: "2026-09-01T10:00:00.000Z",
  publishedAt: "2026-09-01T10:00:00.000Z",
  source: "autopsy",
  ownershipVerified: false,
  causeSource: "inferred",
  locale: "en",
  ...patch,
});

test("the schema rejects unsafe URLs, invalid input and contradictory intentions", () => {
  assert.equal(storedProjectSchema.safeParse(record()).success, true);
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
    "https://user:password@example.com",
  ])
    assert.equal(storedProjectSchema.safeParse(record({ contactUrl: url })).success, false, url);
  assert.equal(
    storedProjectSchema.safeParse(record({ desiredNextSteps: ["let-it-rest", "offers"] })).success,
    false,
  );
  assert.equal(storedProjectSchema.safeParse(record({ estimatedHours: -5 })).success, false);
  assert.equal(storedProjectSchema.safeParse(record({ title: "" })).success, false);
  assert.equal(storedProjectSchema.safeParse(record({ source: "import" })).success, false);
  assert.equal(storedProjectSchema.safeParse(record({ causeSource: "guess" })).success, false);
  // Fields from the retired manual submission / moderation flow are gone.
  const parsed = storedProjectSchema.parse(
    record({ moderationStatus: "submitted", email: "private@example.test", media: {} }),
  );
  assert.equal("moderationStatus" in parsed, false);
  assert.equal("email" in parsed, false);
  assert.equal("media" in parsed, false);
  // Records default to unverified and never silently claim ownership.
  const defaults = storedProjectSchema.parse(
    record({ ownershipVerified: undefined, source: undefined, causeSource: undefined }),
  );
  assert.equal(defaults.ownershipVerified, false);
  assert.equal(defaults.source, "manual");
  assert.equal(defaults.causeSource, "creator");
  assert.equal("autopsyKey" in projectSchema.parse(record({ autopsyKey: "a/b/c" })), false);
});

test("AI draft schema supports unknown facts and rejects fabricated enum categories", () => {
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
    projectDraftSchema.safeParse({ ...draft, primaryCauseOfDeath: "bad luck" }).success,
    false,
  );
});

test("seeds are valid, explicitly marked examples and have no invented metrics", () => {
  for (const p of seedProjects) {
    assert.equal(storedProjectSchema.safeParse(p).success, true);
    assert.equal(p.isDemo, true);
    assert.equal(p.source, "sample");
    assert.equal(p.ownershipVerified, false);
    assert.equal(p.estimatedHours, null);
  }
  assert.deepEqual(seedProjects[0].technologies, []);
});

test("records persist across repository instances, sort by publish date and legacy files are skipped", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "deadfolio-test-"));
  try {
    const repo = new LocalProjectRepository(dir, false);
    assert.equal((await repo.findPublished()).length, 0);
    const first = storedProjectSchema.parse(record());
    const second = storedProjectSchema.parse(
      record({
        id: "later",
        slug: "later",
        title: "Later",
        publishedAt: "2026-09-05T10:00:00.000Z",
        autopsyKey: "maker/later/abc",
      }),
    );
    await repo.save(first);
    await repo.save(second);
    // A pending record from the retired manual submission flow.
    await writeFile(
      path.join(dir, "projects", "legacy.json"),
      JSON.stringify({ ...record({ id: "legacy", slug: "legacy" }), moderationStatus: "submitted", title: "" }),
    );
    const warnings: string[] = [];
    const warn = console.warn;
    console.warn = (message: string) => warnings.push(message);
    try {
      const restarted = new LocalProjectRepository(dir, false);
      const published = await restarted.findPublished();
      assert.deepEqual(
        published.map((p) => p.slug),
        ["later", "test-archive"],
      );
      assert.equal("autopsyKey" in published[0], false);
      assert.equal((await restarted.findById("later"))?.autopsyKey, "maker/later/abc");
      assert.equal(await restarted.findBySlug("legacy"), null);
      assert.ok(warnings.some((w) => w.includes("legacy")));
      await restarted.save({ ...first, title: "Revised title" });
      assert.equal((await repo.findById(first.id))?.title, "Revised title");
      await repo.delete(first.id);
      assert.equal(await restarted.findById(first.id), null);
      await assert.rejects(repo.delete("../escape"));
    } finally {
      console.warn = warn;
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("deleting seed records does not resurrect them on restart", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "deadfolio-seed-"));
  try {
    const repo = new LocalProjectRepository(dir, true);
    assert.equal((await repo.findPublished()).length, seedProjects.length);
    await repo.delete(seedProjects[0].id);
    assert.equal(
      (await new LocalProjectRepository(dir, true).findPublished()).length,
      seedProjects.length - 1,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
