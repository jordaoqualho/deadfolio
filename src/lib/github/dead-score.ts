import type {
  DeadScore,
  DeadSignal,
  RepositoryFacts,
  RepositoryLifeStatus,
} from "@/types/autopsy";

const DAY = 86400000;

/**
 * Every number the heuristic uses lives here. Tune it freely: the score is a
 * ranking aid computed from public metadata, not a probability of anything.
 */
export const deadScoreConfig = {
  /** Days of inactivity → base score, interpolated linearly between stops. */
  inactivityStops: [
    [30, 0],
    [90, 20],
    [180, 40],
    [365, 60],
    [730, 80],
    [1095, 92],
  ] as [days: number, score: number][],
  bonuses: {
    disabled: 10,
    empty: 10,
    /** All commits landed within a short burst, then silence. */
    shortActivity: { maxSpanDays: 14, minIdleDays: 90, points: 5 },
    /** Old repository that once had sustained work and then stopped. */
    oldAndAbandoned: {
      minAgeDays: 730,
      minSpanDays: 30,
      minIdleDays: 365,
      points: 5,
    },
    openIssues: { minIdleDays: 180, points: 3 },
  },
  penalties: {
    fork: 15,
    template: 20,
    recentlyCreated: { maxAgeDays: 90, points: 15 },
  },
  /** Lowest score for each band; anything below the first is "active". */
  bands: [
    [85, "likely-dead"],
    [70, "probably-abandoned"],
    [50, "possibly-abandoned"],
    [30, "stale"],
  ] as [minScore: number, status: RepositoryLifeStatus][],
  /** An experiment is a short burst of work nobody starred. */
  experiment: { maxSpanDays: 7, maxStars: 1 },
  templatePattern:
    /(^|[-_ ])(template|boilerplate|starter|scaffold|skeleton|example|examples|sample|samples|playground|sandbox|tutorial|exercise|kata|hello[-_ ]?world)([-_ .]|$)/i,
};

function interpolate(days: number, stops: [number, number][]) {
  if (days <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [d0, s0] = stops[i - 1];
    const [d1, s1] = stops[i];
    if (days <= d1) return s0 + ((days - d0) / (d1 - d0)) * (s1 - s0);
  }
  return stops[stops.length - 1][1];
}

export function classifyScore(score: number): RepositoryLifeStatus {
  for (const [min, status] of deadScoreConfig.bands)
    if (score >= min) return status;
  return "active";
}

export function looksLikeTemplate(
  repo: Pick<RepositoryFacts, "name" | "description" | "template">,
) {
  return (
    repo.template ||
    deadScoreConfig.templatePattern.test(repo.name) ||
    (repo.description
      ? deadScoreConfig.templatePattern.test(repo.description.slice(0, 80))
      : false)
  );
}

export type DeadScoreInput = Pick<
  RepositoryFacts,
  | "name"
  | "description"
  | "archived"
  | "disabled"
  | "fork"
  | "template"
  | "size"
  | "stars"
  | "openIssues"
  | "createdAt"
  | "pushedAt"
>;

/**
 * Deterministic staleness heuristic from public metadata only. It never claims
 * a project is dead: the strongest non-archived band is "likely dead", and the
 * result is a discovery aid, never a reason to publish anything automatically.
 */
export function calculateDeadScore(
  repo: DeadScoreInput,
  now: Date = new Date(),
): DeadScore {
  const { bonuses, penalties, experiment } = deadScoreConfig;
  const created = new Date(repo.createdAt).getTime();
  const pushed = repo.pushedAt ? new Date(repo.pushedAt).getTime() : created;
  const daysSincePush = Math.max(0, Math.floor((now.getTime() - pushed) / DAY));
  const ageDays = Math.max(0, Math.floor((now.getTime() - created) / DAY));
  const activitySpanDays = Math.max(0, Math.floor((pushed - created) / DAY));
  const template = looksLikeTemplate(repo);
  const kind = repo.fork
    ? "fork"
    : template
      ? "template"
      : activitySpanDays <= experiment.maxSpanDays &&
          repo.stars <= experiment.maxStars
        ? "experiment"
        : "project";

  if (repo.archived)
    return {
      score: 100,
      classification: "archived",
      kind,
      daysSincePush,
      ageDays,
      signals: [{ code: "archived" }],
    };

  const signals: DeadSignal[] = [];
  let score = interpolate(daysSincePush, deadScoreConfig.inactivityStops);
  signals.push(
    daysSincePush > deadScoreConfig.inactivityStops[0][0]
      ? { code: "inactive", value: daysSincePush }
      : { code: "recent-push", value: daysSincePush },
  );

  if (repo.disabled) {
    score += bonuses.disabled;
    signals.push({ code: "disabled" });
  }
  if (repo.size === 0) {
    score += bonuses.empty;
    signals.push({ code: "empty" });
  }
  if (
    activitySpanDays <= bonuses.shortActivity.maxSpanDays &&
    daysSincePush > bonuses.shortActivity.minIdleDays
  ) {
    score += bonuses.shortActivity.points;
    signals.push({ code: "short-activity", value: activitySpanDays });
  }
  if (
    ageDays >= bonuses.oldAndAbandoned.minAgeDays &&
    activitySpanDays >= bonuses.oldAndAbandoned.minSpanDays &&
    daysSincePush > bonuses.oldAndAbandoned.minIdleDays
  ) {
    score += bonuses.oldAndAbandoned.points;
    signals.push({ code: "old-and-abandoned", value: ageDays });
  }
  if (repo.openIssues > 0 && daysSincePush > bonuses.openIssues.minIdleDays) {
    score += bonuses.openIssues.points;
    signals.push({ code: "open-issues", value: repo.openIssues });
  }

  if (repo.fork) {
    score -= penalties.fork;
    signals.push({ code: "fork" });
  }
  if (template) {
    score -= penalties.template;
    signals.push({ code: "template" });
  }
  if (ageDays <= penalties.recentlyCreated.maxAgeDays) {
    score -= penalties.recentlyCreated.points;
    signals.push({ code: "recently-created", value: ageDays });
  }

  const rounded = Math.round(Math.min(100, Math.max(0, score)));
  return {
    score: rounded,
    classification: classifyScore(rounded),
    kind,
    daysSincePush,
    ageDays,
    signals,
  };
}

export function autopsyEligible(score: DeadScore) {
  return score.classification !== "active";
}

export type ScanSummary = {
  total: number;
  byStatus: Record<RepositoryLifeStatus, number>;
  experiments: number;
  forks: number;
  untouchedForAYear: number;
  averageAgeDays: number | null;
  oldestUntouched: { name: string; daysSincePush: number } | null;
  mostRecentlyAbandoned: { name: string; daysSincePush: number } | null;
};

/**
 * Plain counts a visitor can read before any AI runs. "Untouched" always means
 * "no push", never a judgement about the project's outcome.
 */
export function summarizeScan(
  repositories: { name: string; deadScore: DeadScore }[],
): ScanSummary {
  const byStatus: Record<RepositoryLifeStatus, number> = {
    active: 0,
    stale: 0,
    "possibly-abandoned": 0,
    "probably-abandoned": 0,
    "likely-dead": 0,
    archived: 0,
  };
  let ageTotal = 0;
  let untouchedForAYear = 0;
  let experiments = 0;
  let forks = 0;
  let oldest: ScanSummary["oldestUntouched"] = null;
  let recent: ScanSummary["mostRecentlyAbandoned"] = null;
  for (const { name, deadScore: s } of repositories) {
    byStatus[s.classification]++;
    ageTotal += s.ageDays;
    if (s.daysSincePush >= 365) untouchedForAYear++;
    if (s.kind === "experiment") experiments++;
    if (s.kind === "fork") forks++;
    if (s.classification !== "active" && s.classification !== "archived") {
      if (!oldest || s.daysSincePush > oldest.daysSincePush)
        oldest = { name, daysSincePush: s.daysSincePush };
      if (
        s.score >= 50 &&
        (!recent || s.daysSincePush < recent.daysSincePush)
      )
        recent = { name, daysSincePush: s.daysSincePush };
    }
  }
  return {
    total: repositories.length,
    byStatus,
    experiments,
    forks,
    untouchedForAYear,
    averageAgeDays: repositories.length
      ? Math.round(ageTotal / repositories.length)
      : null,
    oldestUntouched: oldest,
    mostRecentlyAbandoned: recent,
  };
}
