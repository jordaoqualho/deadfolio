"use client";
import { useState } from "react";
import { Link2, Search } from "lucide-react";
import { useTranslations } from "@/components/locale";
import { UsernameForm } from "./username-form";
import { RepositoryForm } from "./repository-form";

export type EntryMode = "scan" | "repo";

/** The two ways into an autopsy. Both end in the same service. */
export function EntryModes({
  initialMode,
  initialUser = "",
}: {
  initialMode: EntryMode;
  initialUser?: string;
}) {
  const t = useTranslations();
  const [mode, setMode] = useState<EntryMode>(initialMode);
  const modes: [EntryMode, string, string, typeof Search][] = [
    [
      "scan",
      "Scan my GitHub",
      "Find forgotten projects across a public GitHub profile.",
      Search,
    ],
    [
      "repo",
      "Paste a repository",
      "Already know which project you want to examine? Run an autopsy directly.",
      Link2,
    ],
  ];
  return (
    <div className="entry-modes">
      <div className="mode-switch" role="tablist" aria-label={t("Entry mode")}>
        {modes.map(([key, label, , Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`mode-tab-${key}`}
            aria-selected={mode === key}
            aria-controls={`mode-panel-${key}`}
            className={`mode-tab${mode === key ? " selected" : ""}`}
            onClick={() => setMode(key)}
          >
            <Icon size={16} aria-hidden="true" />
            {t(label)}
          </button>
        ))}
      </div>
      {modes.map(([key, , description]) => (
        <div
          key={key}
          role="tabpanel"
          id={`mode-panel-${key}`}
          aria-labelledby={`mode-tab-${key}`}
          hidden={mode !== key}
          className="mode-panel"
        >
          <p className="mode-description">{t(description)}</p>
          {key === "scan" ? (
            <UsernameForm initial={initialUser} />
          ) : (
            <RepositoryForm />
          )}
        </div>
      ))}
    </div>
  );
}
