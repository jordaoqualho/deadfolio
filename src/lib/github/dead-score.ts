import type { DeadScore, DeadSignal, RepositoryFacts } from "@/types/autopsy";

const DAY = 86400000;

/**
 * Ramp `days` of inactivity onto a 0–90 scale. Piecewise-linear so a repository
 * untouched for a month still reads as active, while two-plus years saturates.
 */
function inactivityScore(days: number) {
  const stops: [number, number][] = [
    [30, 0],
    [180, 35],
    [365, 60],
    [730, 80],
    [1460, 90],
  ];
  if (days <= stops[0][0]) return 0;
  for (let i = 1; i < stops.length; i++) {
    const [d0, s0] = stops[i - 1];
    const [d1, s1] = stops[i];
    if (days <= d1) return s0 + ((days - d0) / (d1 - d0)) * (s1 - s0);
  }
  return stops[stops.length - 1][1];
}

/**
 * Deterministic staleness estimate from public metadata only. It never claims a
 * project is dead: the strongest non-archived classification is "likely-dead".
 */
export function deadScore(
  repo: Pick<
    RepositoryFacts,
    | "archived"
    | "disabled"
    | "fork"
    | "size"
    | "openIssues"
    | "createdAt"
    | "pushedAt"
  >,
  now: Date = new Date(),
): DeadScore {
  const signals: DeadSignal[] = [];
  if (repo.archived)
    return { score: 100, classification: "archived", signals: [{ code: "archived" }] };

  const created = new Date(repo.createdAt).getTime();
  const pushed = repo.pushedAt ? new Date(repo.pushedAt).getTime() : created;
  const daysSincePush = Math.max(0, Math.floor((now.getTime() - pushed) / DAY));
  const ageDays = Math.max(0, Math.floor((now.getTime() - created) / DAY));
  const activitySpanDays = Math.max(0, Math.floor((pushed - created) / DAY));

  let score = inactivityScore(daysSincePush);
  if (daysSincePush > 30) signals.push({ code: "inactive", value: daysSincePush });
  else signals.push({ code: "recent-push", value: daysSincePush });

  if (repo.disabled) {
    score += 10;
    signals.push({ code: "disabled" });
  }
  if (repo.size === 0) {
    score += 10;
    signals.push({ code: "empty" });
  }
  if (repo.fork) {
    score += 5;
    signals.push({ code: "fork" });
  }
  // A burst of work followed by silence is the classic abandoned side project.
  if (activitySpanDays < 14 && daysSincePush > 90) {
    score += 5;
    signals.push({ code: "short-activity", value: activitySpanDays });
  }
  if (ageDays > 3 * 365 && daysSincePush > 365) {
    score += 3;
    signals.push({ code: "old", value: ageDays });
  }
  if (repo.openIssues > 0 && daysSincePush > 180) {
    score += 3;
    signals.push({ code: "open-issues", value: repo.openIssues });
  }

  const rounded = Math.round(Math.min(100, Math.max(0, score)));
  return {
    score: rounded,
    classification:
      rounded >= 60 ? "likely-dead" : rounded >= 30 ? "stale" : "active",
    signals,
  };
}

export function autopsyEligible(score: DeadScore) {
  return score.classification !== "active";
}
