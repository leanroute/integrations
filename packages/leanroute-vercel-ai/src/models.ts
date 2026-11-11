/**
 * Curated model id union — identical shape to the LangChain package's
 * so a single Leanroute customer can move between LangChain and Vercel
 * AI SDK without remembering different model strings.
 *
 * Kept in this package (not shared) because peer-dep pattern means we
 * do not want a runtime dependency on @leanroute/langchain just for a
 * type. Duplicating a string union is cheaper than the cross-package
 * dep graph.
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
  // Groq
  | "groq/openai/gpt-oss-20b"
  | "groq/openai/gpt-oss-120b"
  // Meta
  | "meta/muse-spark-1.2"
  | "meta/muse-code";

/**
 * Stable per-tier defaults. See the corresponding const in
 * @leanroute/langchain for the rationale on rotation policy.
 */
export const DEFAULT_MODELS = {
  cheapFast: "openai/gpt-5-nano" as LeanrouteModelId,
  flagship: "deepseek/deepseek-v4-flash" as LeanrouteModelId,
  premiumReasoning: "deepseek/deepseek-v4-pro" as LeanrouteModelId,
} as const;
