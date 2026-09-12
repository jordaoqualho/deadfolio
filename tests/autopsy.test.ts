import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { deadScore, autopsyEligible } from "../src/lib/github/dead-score";
import {
  excludedFromAnalysis,
  rankFile,
  scrubSecrets,
  selectFiles,
  truncateText,
} from "../src/lib/github/file-selection";
import {
  aiAutopsyOutputSchema,
  normalizeAutopsy,
  storedAutopsySchema,
} from "../src/lib/schemas/autopsy";
import { autopsyToDraft } from "../src/lib/autopsy/draft";
import {
  autopsyPublishSchema,
  submitAutopsyProject,
} from "../src/lib/services/publish-autopsy";
import { autopsyLimits } from "../src/lib/autopsy/config";
import {
  cached,
  LayeredKeyValueStore,
  LocalKeyValueStore,
  MemoryKeyValueStore,
} from "../src/lib/repositories/kv-store";
import { LocalProjectRepository } from "../src/lib/repositories/local-project-repository";
import { dictionaries } from "../src/lib/i18n/dictionaries";
import type { StoredAutopsy } from "../src/types/autopsy";

const now = new Date("2026-09-12T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 86400000).toISOString();
const repo = (patch: Partial<Parameters<typeof deadScore>[0]> = {}) => ({
  archived: false,
  disabled: false,
  fork: false,
  size: 1200,
  openIssues: 0,
  createdAt: daysAgo(900),
  pushedAt: daysAgo(10),
  ...patch,
});

test("dead score is deterministic, metadata-only and never certain about death", () => {
  const active = deadScore(repo(), now);
  assert.equal(active.classification, "active");
  assert.equal(autopsyEligible(active), false);
  const stale = deadScore(repo({ pushedAt: daysAgo(240) }), now);
  assert.equal(stale.classification, "stale");
  const dead = deadScore(repo({ pushedAt: daysAgo(500) }), now);
  assert.equal(dead.classification, "likely-dead");
  assert.ok(dead.score > stale.score && stale.score > active.score);
  assert.deepEqual(deadScore(repo({ pushedAt: daysAgo(500) }), now), dead);
  const archived = deadScore(repo({ archived: true, pushedAt: daysAgo(1) }), now);
  assert.equal(archived.classification, "archived");
  assert.equal(archived.score, 100);
  const weekend = deadScore(
    repo({ createdAt: daysAgo(400), pushedAt: daysAgo(395), fork: true, size: 0 }),
    now,
  );
  assert.ok(weekend.signals.some((s) => s.code === "short-activity"));
  assert.ok(weekend.signals.some((s) => s.code === "fork"));
  assert.ok(weekend.signals.some((s) => s.code === "empty"));
  assert.ok(weekend.score <= 100);
  assert.equal(deadScore(repo({ pushedAt: null, createdAt: daysAgo(3) }), now).classification, "active");
});

test("file selection prefers architecture and never touches secrets, vendored or generated files", () => {
  for (const forbidden of [
    ".env",
    ".env.local",
    "config/.env.production",
    "certs/server.key",
    "id_rsa",
    "credentials.json",
    "service-account-key.json",
    "node_modules/react/index.js",
    "vendor/autoload.php",
    "dist/bundle.js",
    "build/main.min.js",
    "package-lock.json",
    "yarn.lock",
    "assets/logo.png",
    "data/model.safetensors",
    "terraform.tfstate",
  ])
    assert.equal(excludedFromAnalysis(forbidden), true, forbidden);
  assert.equal(excludedFromAnalysis("src/index.ts"), false);
  assert.equal(excludedFromAnalysis("src/huge.ts", 500_000), true);
  assert.ok(rankFile("package.json") > rankFile("src/index.ts"));
  assert.ok(rankFile("src/index.ts") > rankFile("src/lib/util.ts"));
  assert.ok(rankFile("src/lib/util.ts") > rankFile("src/lib/util.test.ts"));
  assert.ok(rankFile("Dockerfile") > rankFile("docs/notes.md"));
  const tree = [
    { path: "README.md", type: "blob" as const, size: 10 },
    { path: ".env", type: "blob" as const, size: 10 },
    { path: "package.json", type: "blob" as const, size: 500 },
    { path: "src/index.ts", type: "blob" as const, size: 900 },
    { path: "src/lib/deep/very/nested/helper.ts", type: "blob" as const, size: 100 },
    { path: "node_modules/x/index.js", type: "blob" as const, size: 10 },
    { path: "prisma/schema.prisma", type: "blob" as const, size: 300 },
    { path: "src", type: "tree" as const },
    { path: "assets/hero.png", type: "blob" as const, size: 100000 },
  ];
  const picked = selectFiles(tree, 3);
  assert.deepEqual(picked, ["package.json", "prisma/schema.prisma", "src/index.ts"]);
  assert.ok(!selectFiles(tree, 20).includes("README.md"));
  assert.ok(!selectFiles(tree, 20).includes(".env"));
  assert.ok(!selectFiles(tree, 20).some((p) => p.startsWith("node_modules")));
  assert.deepEqual(selectFiles(tree, 20), selectFiles([...tree].reverse(), 20));
});

test("secret scrubbing redacts assignments and known token shapes and refuses private keys", () => {
  const scrubbed = scrubSecrets(
    [
      'const apiKey = "sk-live-abcdefghijklmnopqrstuvwxyz123456";',
      "DATABASE_URL=postgres://user:pass@host/db",
      "token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
      "const name = 'deadfolio';",
    ].join("\n"),
  );
  assert.ok(scrubbed);
  assert.ok(!scrubbed.includes("abcdefghijklmnopqrstuvwxyz123456"));
  assert.ok(!scrubbed.includes("postgres://user:pass"));
  assert.ok(!scrubbed.includes("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
  assert.ok(scrubbed.includes("[REDACTED]"));
  assert.ok(scrubbed.includes("const name = 'deadfolio';"));
  assert.equal(
    scrubSecrets("-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"),
    null,
  );
  const cut = truncateText("line1\nline2\nline3\nline4", 14);
  assert.equal(cut.truncated, true);
  assert.equal(cut.text, "line1\nline2");
});

const aiOutput = {
  repositoryStatus: {
    verdict: "likely-dead",
    confidence: 141.7,
    evidence: ["Last push 2024-03-02", " ", "README describes an MVP"],
  },
  projectSummary: "A CLI that syncs notes to a static site.  Built in Go.",
  whatWasBuilt: ["CLI entry point (cmd/notes/main.go)", "Markdown renderer"],
  technologies: ["Go", "Cobra", ""],
  category: "developer-tool",
  stage: "prototype",
  ideaAssessment: { verdict: "promising", explanation: "Narrow and useful." },
  technicalCondition: {
    overallScore: -4,
    architectureScore: 55.4,
    maintainabilityScore: null,
    completenessScore: 30,
    documentationScore: null,
    explanation: "Small, readable, unfinished.",
  },
  strengths: ["Clear package layout"],
  weaknesses: ["No tests", "Hard-coded paths"],
  likelyCausesOfDeath: [
    {
      cause: "Scope stalled at prototype",
      category: "lost-interest",
      confidence: "low",
      explanation: "Commits stop right after the renderer landed.",
      evidence: ["Last 5 commits are renderer work", "No issues or releases"],
    },
    { cause: "", category: null, confidence: "low", explanation: "", evidence: [] },
  ],
  survivingAssets: ["Markdown renderer package"],
  revivalPotential: { score: 62, verdict: "Worth a weekend.", suggestedDirection: null },
  unknowns: ["Whether anyone used it", "Why the author stopped"],
};

test("model output is normalized into the strict report: clamped scores, trimmed items, dropped blanks", () => {
  const report = normalizeAutopsy(aiAutopsyOutputSchema.parse(aiOutput));
  assert.equal(report.repositoryStatus.confidence, 100);
  assert.deepEqual(report.repositoryStatus.evidence, [
    "Last push 2024-03-02",
    "README describes an MVP",
  ]);
  assert.equal(report.technicalCondition.overallScore, 0);
  assert.equal(report.technicalCondition.architectureScore, 55);
  assert.equal(report.technicalCondition.maintainabilityScore, undefined);
  assert.equal(report.likelyCausesOfDeath.length, 1);
  assert.deepEqual(report.technologies, ["Go", "Cobra"]);
  assert.equal(report.projectSummary, "A CLI that syncs notes to a static site. Built in Go.");
  assert.equal(report.revivalPotential.suggestedDirection, undefined);
});

function storedAutopsy(locale: "en" | "pt" = "en"): StoredAutopsy {
  return storedAutopsySchema.parse({
    key: "maker/notes-sync/abc123def456",
    owner: "maker",
    repo: "notes-sync",
    sha: "abc123def456",
    defaultBranch: "main",
    locale,
    model: "gemini-2.5-flash",
    createdAt: now.toISOString(),
    repository: {
      owner: "maker",
      name: "notes-sync",
      fullName: "maker/notes-sync",
      htmlUrl: "https://github.com/maker/notes-sync",
      description: "Sync your notes to a static site.",
      homepage: "notes.example",
      language: "Go",
      topics: ["cli"],
      license: "MIT",
      stars: 12,
      forks: 1,
      openIssues: 3,
      size: 400,
      archived: false,
      disabled: false,
      fork: false,
      defaultBranch: "main",
      createdAt: daysAgo(700),
      pushedAt: daysAgo(480),
      updatedAt: daysAgo(480),
    },
    deadScore: deadScore(
      { archived: false, disabled: false, fork: false, size: 400, openIssues: 3, createdAt: daysAgo(700), pushedAt: daysAgo(480) },
      now,
    ),
    report: normalizeAutopsy(aiAutopsyOutputSchema.parse(aiOutput)),
    filesAnalyzed: ["go.mod", "cmd/notes/main.go"],
    usage: { inputTokens: 8000, outputTokens: 1200 },
  });
}

test("the creator's correction becomes the authoritative cause; otherwise the top inferred cause is hedged", () => {
  const autopsy = storedAutopsy();
  const agreed = autopsyToDraft(autopsy, { causeConfirmed: true, actualCause: "" });
  assert.equal(agreed.primaryCauseOfDeath, "lost-interest");
  assert.match(agreed.causeExplanation!, /^Based on repository evidence: Scope stalled/);
  assert.deepEqual(agreed.lessons, []);
  assert.equal(agreed.tagline, "Sync your notes to a static site.");
  assert.deepEqual(agreed.technologies, ["Go", "Cobra"]);
  assert.equal(agreed.originalIdea, autopsy.report.projectSummary);
  const corrected = autopsyToDraft(autopsy, {
    causeConfirmed: false,
    actualCause: "I changed jobs and lost the evenings I used to spend on it.",
  });
  assert.equal(corrected.primaryCauseOfDeath, "other");
  assert.equal(
    corrected.causeExplanation,
    "I changed jobs and lost the evenings I used to spend on it.",
  );
  const noCauses = storedAutopsy("pt");
  noCauses.report.likelyCausesOfDeath = [];
  const unknown = autopsyToDraft(noCauses, { causeConfirmed: true, actualCause: "" });
  assert.equal(unknown.primaryCauseOfDeath, null);
  assert.match(unknown.causeExplanation!, /não é possível determinar/);
});

test("publishing an autopsy files a pending structured record that moderation can approve", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "deadfolio-autopsy-"));
  try {
    const repository = new LocalProjectRepository(dir, false);
    const input = autopsyPublishSchema.parse({
      key: "maker/notes-sync/abc123def456",
      creatorName: "Maker",
      email: "private@example.test",
      nextStep: "open-source",
      locale: "en",
      causeConfirmed: false,
      actualCause: "Ran out of evenings.",
    });
    const project = await submitAutopsyProject(storedAutopsy(), input, repository);
    assert.equal(project.moderationStatus, "submitted");
    assert.equal(project.submissionType, "structured");
    assert.equal(project.status, "dead");
    assert.equal(project.primaryCauseOfDeath, "other");
    assert.equal(project.causeExplanation, "Ran out of evenings.");
    assert.equal(project.links.github, "https://github.com/maker/notes-sync");
    assert.equal(project.links.website, "");
    assert.equal(project.creator.github, "https://github.com/maker");
    assert.match(project.developmentDuration, /months of activity/);
    assert.match(project.developmentPeriod, /^\d{4}-\d{2} – \d{4}-\d{2}$/);
    assert.ok(project.rawStory.includes("According to the creator: Ran out of evenings."));
    assert.equal((await repository.findPublished()).length, 0);
    await repository.approve(project.id);
    const published = await repository.findBySlug(project.slug);
    assert.ok(published);
    assert.equal("email" in published, false);
    assert.equal(published.title, "notes-sync");
    assert.equal(
      autopsyPublishSchema.safeParse({ ...input, email: "nope" }).success,
      false,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the cache store hashes keys, layers memory over disk and honours TTLs", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "deadfolio-cache-"));
  try {
    const durable = new LocalKeyValueStore(dir);
    const store = new LayeredKeyValueStore(new MemoryKeyValueStore(), durable);
    await store.set("autopsies", "owner/repo/../../etc", { ok: true });
    assert.deepEqual(await durable.get("autopsies", "owner/repo/../../etc"), { ok: true });
    assert.equal(await durable.get("autopsies", "other"), null);
    await assert.rejects(store.set("Bad Namespace", "k", 1));
    let loads = 0;
    const load = async () => ++loads;
    assert.equal(await cached(store, "github-repo", "k", 60000, load), 1);
    assert.equal(await cached(store, "github-repo", "k", 60000, load), 1);
    assert.equal(await cached(store, "github-repo", "expired", -1, load), 2);
    assert.equal(await cached(store, "github-repo", "expired", -1, load), 3);
    await assert.rejects(
      cached(store, "github-repo", "fail", 60000, async () => {
        throw new Error("boom");
      }),
    );
    assert.equal(await durable.get("github-repo", "fail"), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("limits fall back to documented defaults and reject nonsense", () => {
  const previous = { ...process.env };
  try {
    delete process.env.MAX_AUTOPSY_FILES;
    delete process.env.MAX_AUTOPSIES_PER_IP_PER_DAY;
    assert.deepEqual(autopsyLimits(), {
      maxRepositoriesPerScan: 100,
      maxAutopsiesPerIpPerDay: 3,
      maxConcurrentAutopsiesPerIp: 1,
      maxAutopsyFiles: 12,
      maxAutopsyInputTokens: 30000,
      maxAutopsyOutputTokens: 2000,
    });
    process.env.MAX_AUTOPSY_FILES = "5";
    process.env.MAX_AUTOPSIES_PER_IP_PER_DAY = "abc";
    process.env.MAX_REPOSITORIES_PER_SCAN = "9999";
    assert.equal(autopsyLimits().maxAutopsyFiles, 5);
    assert.equal(autopsyLimits().maxAutopsiesPerIpPerDay, 3);
    assert.equal(autopsyLimits().maxRepositoriesPerScan, 300);
  } finally {
    process.env = previous;
  }
});

test("every autopsy string has a Portuguese translation", () => {
  for (const key of [
    "🔬 Run Autopsy",
    "New activity detected. Run a new autopsy?",
    "Did we get the cause of death right?",
    "Pretty much",
    "Not really",
    "What actually killed it?",
    "Add to my Deadfolio",
    "Publish",
    "Edit details",
  ])
    assert.ok(dictionaries.pt[key as keyof typeof dictionaries.pt], key);
  assert.equal(dictionaries.pt["🔬 Run Autopsy"], "🔬 Fazer autópsia");
});
