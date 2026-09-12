import { z } from "zod";
import {
  aiAutopsyOutputSchema,
  deadScoreSchema,
  deadSignalSchema,
  discoveredRepositorySchema,
  repositoryAutopsySchema,
  repositoryFactsSchema,
  storedAutopsySchema,
} from "@/lib/schemas/autopsy";

export type { RepositoryLifeStatus } from "@/lib/schemas/autopsy";
export type RepositoryAutopsy = z.infer<typeof repositoryAutopsySchema>;
export type AiAutopsyOutput = z.infer<typeof aiAutopsyOutputSchema>;
export type RepositoryFacts = z.infer<typeof repositoryFactsSchema>;
export type DeadSignal = z.infer<typeof deadSignalSchema>;
export type DeadScore = z.infer<typeof deadScoreSchema>;
export type RepositoryKind = DeadScore["kind"];
export type DiscoveredRepository = z.infer<typeof discoveredRepositorySchema>;
export type StoredAutopsy = z.infer<typeof storedAutopsySchema>;

/** What the autopsy page knows before the visitor decides to run anything. */
export type AutopsyLookup =
  | { state: "ready"; autopsy: StoredAutopsy }
  | { state: "outdated"; autopsy: StoredAutopsy; currentSha: string }
  | { state: "none"; currentSha: string };
