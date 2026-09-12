import "server-only";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { autopsyLimits, autopsyModel } from "@/lib/autopsy/config";
import { aiAutopsyOutputSchema, normalizeAutopsy } from "@/lib/schemas/autopsy";
import { renderContext, type RepositoryContext } from "@/lib/github/collect";
import type { RepositoryAutopsy } from "@/types/autopsy";
import { repositoryAutopsyPrompt } from "./repository-autopsy-prompt";

export class AutopsyGenerationError extends Error {
  constructor(
    public readonly kind: "quota" | "transient" | "failed",
    message: string,
  ) {
    super(message);
    this.name = "AutopsyGenerationError";
  }
}

/** Server-side detail for operators. Never includes the API key or the prompt. */
function logFailure(error: unknown) {
  const key = process.env.GEMINI_API_KEY;
  const redact = (text: string) =>
    key ? text.split(key).join("[GEMINI_API_KEY]") : text;
  const detail =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
  const status = APICallError.isInstance(error) ? ` status=${error.statusCode}` : "";
  const generation = NoObjectGeneratedError.isInstance(error)
    ? ` finish=${error.finishReason ?? "?"} output_tokens=${error.usage?.outputTokens ?? "?"} text_length=${error.text?.length ?? 0} cause=${
        error.cause instanceof Error ? error.cause.message.slice(0, 300) : "?"
      }`
    : "";
  console.error(
    `[deadfolio] Gemini autopsy failed${status}${generation}: ${redact(detail).slice(0, 2000)}`,
  );
}

function classify(error: unknown): AutopsyGenerationError {
  if (error instanceof AutopsyGenerationError) return error;
  logFailure(error);
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429)
      return new AutopsyGenerationError("quota", "Model quota exhausted.");
    if (error.statusCode !== undefined && error.statusCode >= 500)
      return new AutopsyGenerationError("transient", "Model unavailable.");
    if (error.isRetryable)
      return new AutopsyGenerationError("transient", "Model request failed.");
    return new AutopsyGenerationError("failed", "Model request rejected.");
  }
  const name = (error as { name?: string })?.name ?? "";
  if (name === "TimeoutError" || name === "AbortError")
    return new AutopsyGenerationError("transient", "Model timed out.");
  return new AutopsyGenerationError("failed", "Autopsy generation failed.");
}

/**
 * Thinking tokens count against `maxOutputTokens`. Left at the default, a
 * thinking model spends most of the 2000-token budget reasoning and returns a
 * truncated JSON object, so reasoning is kept to the minimum the model allows.
 * Gemini 2.5 takes a numeric budget; Gemini 3+ rejects it and takes a level.
 */
function thinkingConfig(model: string) {
  return /^gemini-2\./.test(model)
    ? { thinkingBudget: 0 }
    : { thinkingLevel: "minimal" as const };
}

export type GeneratedAutopsy = {
  report: RepositoryAutopsy;
  usage: { inputTokens: number | null; outputTokens: number | null };
};

/**
 * One structured Gemini generation per autopsy. Transient failures are retried
 * exactly once; quota exhaustion (429) is surfaced as a typed error, never as a
 * provider message.
 */
export async function generateAutopsy(
  context: RepositoryContext,
  locale: "en" | "pt",
  timeoutMs = 45000,
): Promise<GeneratedAutopsy> {
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  const { maxAutopsyOutputTokens } = autopsyLimits();
  const prompt = renderContext(context);
  const model = autopsyModel();
  const attempt = async (budgetMs: number) => {
    const { output, usage } = await generateText({
      model: google(model),
      output: Output.object({ schema: aiAutopsyOutputSchema }),
      maxOutputTokens: maxAutopsyOutputTokens,
      maxRetries: 0,
      temperature: 0.3,
      providerOptions: { google: { thinkingConfig: thinkingConfig(model) } },
      abortSignal: AbortSignal.timeout(budgetMs),
      system: repositoryAutopsyPrompt(locale),
      prompt,
    });
    return {
      report: normalizeAutopsy(aiAutopsyOutputSchema.parse(output)),
      usage: {
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
      },
    };
  };
  const deadline = Date.now() + timeoutMs;
  try {
    return await attempt(timeoutMs);
  } catch (first) {
    const error = classify(first);
    // A single retry, and only when enough of the overall budget remains.
    const remaining = deadline - Date.now();
    if (error.kind !== "transient" || remaining < timeoutMs * 0.5) throw error;
    try {
      return await attempt(remaining);
    } catch (second) {
      throw classify(second);
    }
  }
}
