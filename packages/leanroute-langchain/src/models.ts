/**
 * Curated list of Leanroute model ids for the type-safe LangChain API.
 *
 * This is a HAND-CURATED subset, not the full catalog. Full model list
 * (50+ SKUs) is available at GET /v1/models on your account. The point
 * of the type union here is IDE autocomplete for the common cases, not
 * exhaustiveness — a caller passing a string outside this union still
 * works at runtime because `ChatLeanroute` accepts arbitrary string
 * model ids (the underlying ChatOpenAI class does).
 *
 * When Leanroute adds a headline SKU that customers ask for by name,
 * add it here. Silently dropping one from the union is a breaking
 * change; only remove if the upstream provider retired it too.
 */

export type LeanrouteModelId =
  // OpenAI
  | "openai/gpt-5-nano"
  | "openai/gpt-5-mini"
  | "openai/gpt-5.6-luna"
  | "openai/gpt-5.6-terra"
  | "openai/gpt-5.6-sol"
  | "openai/gpt-5.6-cyber"
  | "openai/gpt-5.3-codex"
  // Anthropic
  | "anthropic/claude-haiku-4-5"
  | "anthropic/claude-sonnet-5"
  | "anthropic/claude-sonnet-4-6"
  | "anthropic/claude-opus-5"
  | "anthropic/claude-fable-5"
  // DeepSeek
  | "deepseek/deepseek-v4-flash"
  | "deepseek/deepseek-v4-pro"
  | "deepseek/deepseek-v4-flash-vision-exp"
  // Google
  | "google/gemini-3.7-flash"
  | "google/gemini-3.6-flash"
  | "google/gemini-2.5-pro"
  // xAI
  | "xai/grok-4-6"
  | "xai/grok-build-0-1"
  // Groq (LPU-fast open weights)
  | "groq/openai/gpt-oss-20b"
  | "groq/openai/gpt-oss-120b"
  // Meta
  | "meta/muse-spark-1.2"
  | "meta/muse-code";

/**
 * Cheapest safe defaults per quality tier. Handy when a caller wants a
 * "pick one" default and does not care which SKU. These are stable
 * enough to hard-code; the underlying model may rotate over time as
 * prices shift, so consuming code should treat them as opaque.
 */
export const DEFAULT_MODELS = {
  /** Cheap-fast: gpt-5-nano at $0.05 / $0.40 per M tokens. */
  cheapFast: "openai/gpt-5-nano" as LeanrouteModelId,
  /** Flagship: DeepSeek V4 Flash at $0.22 / $0.66 per M tokens off-peak. */
  flagship: "deepseek/deepseek-v4-flash" as LeanrouteModelId,
  /** Premium reasoning: DeepSeek V4 Pro at $0.66 / $1.98 per M tokens off-peak. */
  premiumReasoning: "deepseek/deepseek-v4-pro" as LeanrouteModelId,
} as const;
