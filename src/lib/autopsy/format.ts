import type { Locale } from "@/lib/i18n/dictionaries";
import type { DeadSignal } from "@/types/autopsy";

/** Humanizes a day count: "3 days", "7 months", "2 years". */
export function formatSpan(days: number, locale: Locale) {
  const pt = locale === "pt";
  if (days < 1) return pt ? "hoje" : "today";
  if (days < 45) return `${days} ${pt ? (days === 1 ? "dia" : "dias") : days === 1 ? "day" : "days"}`;
  const months = Math.round(days / 30.44);
  if (months < 24)
    return `${months} ${pt ? (months === 1 ? "mês" : "meses") : months === 1 ? "month" : "months"}`;
  const years = Math.round((days / 365.25) * 10) / 10;
  const shown = Number.isInteger(years) ? String(years) : years.toFixed(1);
  return `${shown} ${pt ? (years === 1 ? "ano" : "anos") : years === 1 ? "year" : "years"}`;
}

export function formatDate(iso: string | null | undefined, locale: Locale) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** English label keys for signals; the UI translates them and fills `{n}`. */
export function signalLabel(signal: DeadSignal): { key: string; n?: string } {
  switch (signal.code) {
    case "archived":
      return { key: "Archived on GitHub" };
    case "disabled":
      return { key: "Disabled by GitHub" };
    case "fork":
      return { key: "Fork of another repository" };
    case "empty":
      return { key: "Empty repository" };
    case "inactive":
      return { key: "No pushes for {n}", n: String(signal.value ?? 0) };
    case "recent-push":
      return { key: "Pushed recently" };
    case "short-activity":
      return (signal.value ?? 0) < 1
        ? { key: "All commits on a single day" }
        : { key: "Active for only {n}", n: String(signal.value) };
    case "old":
      return { key: "Created {n} ago", n: String(signal.value ?? 0) };
    case "open-issues":
      return signal.value === 1
        ? { key: "1 open issue left behind" }
        : { key: "{n} open issues left behind", n: String(signal.value ?? 0) };
  }
}

export function fill(template: string, value: string | undefined) {
  return value === undefined ? template : template.replace("{n}", value);
}
