function integer(name: string, fallback: number, min = 1) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= min ? value : fallback;
}

/** Hard application limits. Read at call time so deployments can tune them without a rebuild. */
export function autopsyLimits() {
  return {
    maxRepositoriesPerScan: Math.min(
      integer("MAX_REPOSITORIES_PER_SCAN", 100),
      300,
    ),
    maxAutopsiesPerIpPerDay: integer("MAX_AUTOPSIES_PER_IP_PER_DAY", 3),
    maxConcurrentAutopsiesPerIp: integer("MAX_CONCURRENT_AUTOPSIES_PER_IP", 1),
    maxAutopsyFiles: Math.min(integer("MAX_AUTOPSY_FILES", 12), 40),
    maxAutopsyInputTokens: integer("MAX_AUTOPSY_INPUT_TOKENS", 30000, 4000),
    maxAutopsyOutputTokens: integer("MAX_AUTOPSY_OUTPUT_TOKENS", 2000, 500),
  };
}

export const AUTOPSY_MODEL = "gemini-2.5-flash";

/** Rough, provider-agnostic estimate used to keep prompts inside the input budget. */
export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function githubConfigured() {
  return Boolean(process.env.GITHUB_TOKEN);
}
