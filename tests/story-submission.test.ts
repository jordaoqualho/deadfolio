import { requestDraft } from "../src/lib/ai/request-draft";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { submitStory } from "../src/lib/services/submit-project";
import { LocalProjectRepository } from "../src/lib/repositories/local-project-repository";
import { emptySubmission } from "../src/lib/schemas/empty-submission";
import {
  projectDraftSchema,
  rawSubmissionSchema,
  storedProjectSchema,
} from "../src/lib/schemas/project";
import { localePath, dictionaries } from "../src/lib/i18n/dictionaries";
const input = {
  title: "Real unfinished project",
  story:
    "I built a small writing tool, then stopped when my workflow changed. The code is still in my repository.",
  url: "https://example.test/project",
  nextStep: "adoption",
  creatorName: "Maker",
  email: "private@example.test",
  locale: "pt",
};
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
test("raw submissions validate only the six inputs and reject unsafe URLs", () => {
  assert.ok(rawSubmissionSchema.safeParse(input).success);
  for (const patch of [
    { email: "bad" },
    { url: "javascript:alert(1)" },
    { url: "https://user:password@example.test" },
    { story: "short" },
    { nextStep: "invented" },
  ]) {
    assert.equal(
      rawSubmissionSchema.safeParse({ ...input, ...patch }).success,
      false,
    );
  }
});
test("raw and incomplete AI drafts persist privately; only completed structured records can publish", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "deadfolio-stories-"));
  try {
    const repo = new LocalProjectRepository(dir, false);
    const raw = await submitStory(
      {
        ...input,
        isFounder: true,
        moderationStatus: "published",
        submissionType: "structured",
      },
      repo,
    );
    assert.equal(raw.submissionType, "raw");
    assert.equal(raw.isFounder, false);
    assert.equal(raw.moderationStatus, "submitted");
    assert.equal(raw.estimatedHours, null);
    await assert.rejects(repo.approve(raw.id), /Structure/);
    assert.equal((await repo.findPublished()).length, 0);
    const restarted = new LocalProjectRepository(dir, false);
    assert.equal((await restarted.findById(raw.id))?.rawStory, input.story);
    const structured = await submitStory(input, repo, draft);
    assert.equal(structured.submissionType, "structured");
    assert.equal(structured.originalIdea, "");
    assert.equal(structured.tagline, "");
    await assert.rejects(repo.approve(structured.id));
    await repo.update(raw.id, {
      ...structuredClone(emptySubmission),
      title: input.title,
      tagline: "A small writing tool that outlived its workflow.",
      originalIdea: "A writing tool for organizing unfinished documents.",
      causeExplanation:
        "The workflow changed and the tool no longer fit the maker's needs.",
      creator: { ...emptySubmission.creator, name: input.creatorName },
      email: input.email,
    });
    assert.equal((await repo.findById(raw.id))?.submissionType, "structured");
    assert.equal((await repo.findById(raw.id))?.rawStory, input.story);
    await repo.approve(raw.id);
    const published = await restarted.findBySlug(raw.slug);
    assert.ok(published);
    assert.equal("email" in published, false);
    assert.equal("rawStory" in published, false);
    assert.equal("locale" in published, false);
    assert.ok(!JSON.stringify(published).includes(input.email));
    await assert.rejects(
      repo.update(raw.id, { ...emptySubmission, title: input.title }),
    );
    assert.equal((await repo.findBySlug(raw.slug))?.title, input.title);
    assert.ok(projectDraftSchema.safeParse(draft).success);
    const { submissionType, rawStory, locale, isFounder, ...legacy } = raw;
    void submissionType;
    void rawStory;
    void locale;
    void isFounder;
    assert.equal(
      storedProjectSchema.parse(legacy).submissionType,
      "structured",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("English stays default and localized links preserve routes without changing private paths", () => {
  assert.deepEqual(Object.keys(dictionaries.en), Object.keys(dictionaries.pt));
  assert.equal(localePath("pt", "/"), "/pt");
  assert.equal(localePath("pt", "/projects/test"), "/pt/projects/test");
  assert.equal(localePath("en", "/pt/projects/test"), "/projects/test");
  assert.equal(localePath("pt", "/admin/new"), "/admin/new");
  assert.equal(
    localePath("pt", "https://example.test"),
    "https://example.test",
  );
});

test("formatting excludes identity and fails recoverably for offline, rejected, malformed and timed-out requests", async () => {
  const raw = rawSubmissionSchema.parse(input);
  const original = structuredClone(raw);
  const success = await requestDraft(raw, async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.deepEqual(Object.keys(body).sort(), ["locale", "story", "title"]);
    assert.ok(!String(options?.body).includes(raw.email));
    assert.ok(!String(options?.body).includes(raw.creatorName));
    return Response.json({ draft });
  });
  assert.deepEqual(success, draft);
  for (const status of [429, 502, 503])
    await assert.rejects(
      requestDraft(raw, async () => Response.json({}, { status })),
      /format-failed/,
    );
  await assert.rejects(
    requestDraft(raw, async () =>
      Response.json({ draft: { title: "Invalid draft" } }),
    ),
  );
  await assert.rejects(
    requestDraft(raw, async () => {
      throw new DOMException("Timed out", "TimeoutError");
    }),
  );
  assert.deepEqual(raw, original);
  const dir = await mkdtemp(path.join(tmpdir(), "deadfolio-fallback-"));
  try {
    const saved = await submitStory(
      raw,
      new LocalProjectRepository(dir, false),
    );
    assert.equal(saved.rawStory, original.story);
    assert.equal(saved.submissionType, "raw");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
