import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  autopsyEligible,
  calculateDeadScore,
  classifyScore,
  deadScoreConfig,
  summarizeScan,
} from "../src/lib/github/dead-score";
import {
  parseRepositoryReference,
  parseUsername,
} from "../src/lib/github/reference";
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
  publishAutopsyProject,
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
const repo = (patch: Partial<Parameters<typeof calculateDeadScore>[0]> = {}) => ({
  name: "notes-sync",
  description: "Sync your notes to a static site.",
  archived: false,
  disabled: false,
  fork: false,
  template: false,
  size: 1200,
  stars: 4,
  openIssues: 0,
  createdAt: daysAgo(900),
  pushedAt: daysAgo(10),
  ...patch,
});

test("dead score is deterministic, metadata-only, banded by configuration and never certain about death", () => {
  const active = calculateDeadScore(repo(), now);
  assert.equal(active.classification, "active");
  assert.equal(active.kind, "project");
  assert.equal(autopsyEligible(active), false);
  const stale = calculateDeadScore(repo({ pushedAt: daysAgo(150) }), now);
  assert.equal(stale.classification, "stale");
  const possibly = calculateDeadScore(repo({ pushedAt: daysAgo(300) }), now);
  assert.equal(possibly.classification, "possibly-abandoned");
  const probably = calculateDeadScore(repo({ pushedAt: daysAgo(500) }), now);
  assert.equal(probably.classification, "probably-abandoned");
  const dead = calculateDeadScore(repo({ createdAt: daysAgo(1500), pushedAt: daysAgo(1200) }), now);
  assert.equal(dead.classification, "likely-dead");
  assert.ok(dead.score > probably.score && probably.score > possibly.score);
  assert.ok(possibly.score > stale.score && stale.score > active.score);
  assert.ok(dead.score <= 100);
  assert.deepEqual(
    calculateDeadScore(repo({ createdAt: daysAgo(1500), pushedAt: daysAgo(1200) }), now),
    dead,
  );
  assert.equal(dead.daysSincePush, 1200);
  assert.equal(dead.ageDays, 1500);
  assert.ok(dead.signals.some((s) => s.code === "old-and-abandoned"));
  // Thresholds come from configuration, not from the components.
  for (const [min, status] of deadScoreConfig.bands) {
    assert.equal(classifyScore(min), status);
    assert.notEqual(classifyScore(min - 1), status);
  }
  assert.equal(classifyScore(0), "active");
  const archived = calculateDeadScore(repo({ archived: true, pushedAt: daysAgo(1) }), now);
  assert.equal(archived.classification, "archived");
  assert.equal(archived.score, 100);
  // Negative signals: forks, templates and brand-new repositories score lower.
  const base = calculateDeadScore(repo({ pushedAt: daysAgo(400) }), now);
  const forked = calculateDeadScore(repo({ pushedAt: daysAgo(400), fork: true }), now);
  const template = calculateDeadScore(
    repo({ pushedAt: daysAgo(400), name: "nextjs-starter-template" }),
    now,
  );
  const flagged = calculateDeadScore(repo({ pushedAt: daysAgo(400), template: true }), now);
  assert.ok(forked.score < base.score && forked.kind === "fork");
  assert.ok(template.score < base.score && template.kind === "template");
  assert.equal(flagged.kind, "template");
  const fresh = calculateDeadScore(repo({ createdAt: daysAgo(20), pushedAt: daysAgo(20) }), now);
  assert.equal(fresh.classification, "active");
  assert.ok(fresh.signals.some((s) => s.code === "recently-created"));
  // A weekend burst nobody starred is an experiment, and empty repositories are flagged.
  const weekend = calculateDeadScore(
    repo({ createdAt: daysAgo(400), pushedAt: daysAgo(397), stars: 0, size: 0 }),
    now,
  );
  assert.equal(weekend.kind, "experiment");
  assert.ok(weekend.signals.some((s) => s.code === "short-activity"));
  assert.ok(weekend.signals.some((s) => s.code === "empty"));
  assert.equal(
    calculateDeadScore(repo({ pushedAt: null, createdAt: daysAgo(3) }), now).classification,
    "active",
  );
});

test("scan summary reports plain counts and insights without AI", () => {
  const scored = [
    { name: "a", deadScore: calculateDeadScore(repo(), now) },
    { name: "b", deadScore: calculateDeadScore(repo({ pushedAt: daysAgo(500) }), now) },
    { name: "c", deadScore: calculateDeadScore(repo({ createdAt: daysAgo(1500), pushedAt: daysAgo(1200) }), now) },
    { name: "d", deadScore: calculateDeadScore(repo({ archived: true }), now) },
    {
      name: "e",
      deadScore: calculateDeadScore(
        repo({ createdAt: daysAgo(300), pushedAt: daysAgo(299), stars: 0 }),
        now,
      ),
    },
  ];
  const summary = summarizeScan(scored);
  assert.equal(summary.total, 5);
  assert.equal(summary.byStatus.active, 1);
  assert.equal(summary.byStatus.archived, 1);
  assert.equal(summary.byStatus["probably-abandoned"] + summary.byStatus["likely-dead"], 2);
  assert.equal(summary.experiments, 1);
  assert.equal(summary.untouchedForAYear, 2);
  assert.equal(summary.oldestUntouched?.name, "c");
  assert.equal(summary.mostRecentlyAbandoned?.name, "e");
  assert.ok(summary.averageAgeDays! > 0);
});

test("repository references accept URLs and owner/repo, and reject everything else", () => {
  for (const input of [
    "https://github.com/maker/notes-sync",
    "http://www.github.com/maker/notes-sync/",
    "github.com/maker/notes-sync.git",
    "https://github.com/maker/notes-sync/tree/main/src",
    "maker/notes-sync",
    "  maker/notes-sync  ",
    "git@github.com:maker/notes-sync.git",
  ])
    assert.deepEqual(parseRepositoryReference(input), { owner: "maker", repo: "notes-sync" }, input);
  for (const input of [
    "",
    "maker",
    "https://gitlab.com/maker/notes-sync",
    "https://github.com/maker",
    "ftp://github.com/maker/notes-sync",
    "-maker/notes-sync",
    "maker/..",
    "not a url at all",
  ])
    assert.equal(parseRepositoryReference(input), null, input);
  assert.equal(parseUsername("https://github.com/Maker?tab=repos"), "Maker");
  assert.equal(parseUsername("@maker"), "maker");
  assert.equal(parseUsername("not valid!"), null);
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
    confidence: "medium",
    evidence: ["Last push 2024-03-02", " ", "README describes an MVP"],
  },
  projectSummary: "A CLI that syncs notes to a static site.  Built in Go.",
  whatWasBuilt: ["CLI entry point (cmd/notes/main.go)", "Markdown renderer"],
  technologies: ["Go", "Cobra", ""],
  category: "developer-tool",
  stage: "prototype",
  productAssessment: {
    problemQuality: "promising",
    differentiation: "weak",
    explanation: "Narrow and useful, but many static site tools already sync notes.",
  },
  technicalCondition: {
    overallScore: -4,
    architectureScore: 55.4,
    maintainabilityScore: null,
    completenessScore: 3,
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
  revivalPotential: {
    score: 62,
    verdict: "possible",
    explanation: "Worth a weekend, probably not as the same product.",
    suggestedDirection: "   ",
  },
  unknowns: ["Whether anyone used it", "Why the author stopped"],
};

test("model output is normalized into the strict report: 0–10 scores, trimmed items, dropped blanks", () => {
  const report = normalizeAutopsy(aiAutopsyOutputSchema.parse(aiOutput));
  assert.equal(report.repositoryStatus.confidence, "medium");
  assert.deepEqual(report.repositoryStatus.evidence, [
    "Last push 2024-03-02",
    "README describes an MVP",
  ]);
  assert.equal(report.technicalCondition.overallScore, 0);
  // A 0–100 answer is rescaled instead of being clamped to 10.
  assert.equal(report.technicalCondition.architectureScore, 5.5);
  assert.equal(report.technicalCondition.completenessScore, 3);
  assert.equal(report.technicalCondition.maintainabilityScore, null);
  assert.equal(report.likelyCausesOfDeath.length, 1);
  assert.deepEqual(report.technologies, ["Go", "Cobra"]);
  assert.equal(report.projectSummary, "A CLI that syncs notes to a static site. Built in Go.");
  assert.equal(report.productAssessment.problemQuality, "promising");
  assert.equal(report.productAssessment.differentiation, "weak");
  assert.equal(report.revivalPotential.score, 6.2);
  assert.equal(report.revivalPotential.verdict, "possible");
  assert.equal(report.revivalPotential.suggestedDirection, null);
  assert.equal(
    aiAutopsyOutputSchema.safeParse({ ...aiOutput, repositoryStatus: { ...aiOutput.repositoryStatus, confidence: 80 } }).success,
    false,
  );
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
      template: false,
      defaultBranch: "main",
      createdAt: daysAgo(700),
      pushedAt: daysAgo(480),
      updatedAt: daysAgo(480),
    },
    deadScore: calculateDeadScore(
      repo({ size: 400, stars: 12, openIssues: 3, createdAt: daysAgo(700), pushedAt: daysAgo(480) }),
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
  assert.equal(agreed.originalIdea, autopsy.report.productAssessment.explanation);
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

test("publishing an autopsy creates a public, unverified record immediately; no moderation exists", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "deadfolio-autopsy-"));
  try {
    const repository = new LocalProjectRepository(dir, false);
    const input = autopsyPublishSchema.parse({
      key: "maker/notes-sync/abc123def456",
      creatorName: "Maker",
      nextStep: "open-source",
      locale: "en",
      confirmation: "disagree",
      actualCause: "Ran out of evenings.",
    });
    const project = await publishAutopsyProject(storedAutopsy(), input, repository);
    assert.equal(project.source, "autopsy");
    assert.equal(project.ownershipVerified, false);
    assert.equal(project.causeSource, "creator");
    assert.equal(project.status, "dead");
    assert.equal(project.primaryCauseOfDeath, "other");
    assert.equal(project.causeExplanation, "Ran out of evenings.");
    assert.equal(project.links.github, "https://github.com/maker/notes-sync");
    assert.equal(project.links.website, "");
    assert.equal(project.creator.github, "https://github.com/maker");
    assert.equal(project.autopsyKey, "maker/notes-sync/abc123def456");
    assert.match(project.developmentDuration, /months of activity/);
    assert.match(project.developmentPeriod, /^\d{4}-\d{2} – \d{4}-\d{2}$/);
    assert.ok(project.publishedAt);
    assert.equal("moderationStatus" in project, false);
    assert.equal("email" in project, false);
    const published = await repository.findBySlug(project.slug);
    assert.ok(published);
    assert.equal(published.title, "notes-sync");
    assert.equal((await repository.findPublished()).length, 1);

    // Unanswered confirmation keeps the AI inference labeled as such; an empty
    // display name falls back to the GitHub owner.
    const silent = await publishAutopsyProject(
      storedAutopsy(),
      autopsyPublishSchema.parse({ ...input, creatorName: "", confirmation: "unanswered", actualCause: "" }),
      repository,
    );
    assert.equal(silent.causeSource, "inferred");
    assert.equal(silent.creator.name, "maker");
    assert.equal(silent.primaryCauseOfDeath, "lost-interest");
    const agreed = await publishAutopsyProject(
      storedAutopsy(),
      autopsyPublishSchema.parse({ ...input, confirmation: "agree", actualCause: "" }),
      repository,
    );
    assert.equal(agreed.causeSource, "creator");
    assert.equal(agreed.primaryCauseOfDeath, "lost-interest");
    assert.equal(autopsyPublishSchema.safeParse({ ...input, confirmation: "maybe" }).success, false);
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
    "Run Autopsy",
    "New activity detected since this autopsy.",
    "Run a fresh autopsy",
    "Scan my GitHub",
    "Paste a repository",
    "Find my forgotten projects",
    "Run Repository Autopsy",
    "That doesn’t look like a GitHub repository URL.",
    "This repository does not appear to be public.",
    "Based on inactivity, repository age, archive status and recent development signals.",
    "Did we get the cause of death right?",
    "Pretty much",
    "Not really",
    "What actually killed it?",
    "Add to my Deadfolio",
    "Publish",
    "Edit details",
  ])
    assert.ok(dictionaries.pt[key as keyof typeof dictionaries.pt], key);
  assert.equal(dictionaries.pt["Run Autopsy"], "Fazer autópsia");
  assert.equal(dictionaries.pt["Did we get the cause of death right?"], "A causa da morte faz sentido?");
  assert.equal(dictionaries.pt["Not really"], "Não foi isso");
  assert.equal(dictionaries.pt["Scan my GitHub"], "Analisar meu GitHub");
});
