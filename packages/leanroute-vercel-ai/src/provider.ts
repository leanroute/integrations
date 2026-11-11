/**
 * Leanroute provider for the Vercel AI SDK.
 *
 * `@ai-sdk/openai` exposes `createOpenAI({ baseURL, apiKey, headers })`
 * which returns a factory: `provider("model-id")` yields a
 * `LanguageModelV1` you hand to `generateText`, `streamText`,
 * `generateObject`, `streamObject`, or a Next.js server component.
 *
 * Leanroute speaks the OpenAI wire format on /v1, so we can point
 * `createOpenAI` directly at `api.leanroute.dev/v1` and inherit every
 * capability the OpenAI provider ships with — streaming, tool calling,
 * structured output, RSC helpers, all of it.
 *
 * Two exports:
 *   - `createLeanroute({ apiKey, gatewayOptions, ... })` — explicit
 *     config, useful when you want per-instance headers or a custom
 *     base URL (staging, self-hosted).
 *   - `leanroute` — the "default" provider, keyed off
 *     `process.env.LEANROUTE_API_KEY`. Matches the pattern
 *     `@ai-sdk/openai` uses with its top-level `openai` export.
 *
 * If `LEANROUTE_API_KEY` is not set, `leanroute` still creates a
 * provider but any call will error at request time with a clear
 * message. This matches Vercel's own behaviour — construction is lazy
 * about auth so tree-shakers do not have to know about env vars at
 * bundle time.
 */

import { createOpenAI, type OpenAIProvider } from "@ai-sdk/openai";
import { toHeaderRecord, type GatewayHeaderOptions } from "./gateway-headers.js";
import { CLIENT_ID, agentHeaders, type AgentOptions } from "./agent.js";

const DEFAULT_BASE_URL = "https://api.leanroute.dev/v1";

export interface CreateLeanrouteOptions {
  /**
   * Runtime key (`gw_live_*`). Falls back to
   * `process.env.LEANROUTE_API_KEY`. Errors at request time (not
   * construction) if neither is present, so bundlers do not need to
   * eagerly read env.
   */
  apiKey?: string;
  /**
   * Override the base URL. Default `https://api.leanroute.dev/v1`.
   * Only touch for self-hosted or staging.
   */
  baseURL?: string;
  /**
   * Per-provider-instance routing modifiers. Attached as `x-gateway-*`
   * headers on every request from this provider instance. Callers can
   * still override on a per-request basis via the Vercel AI SDK's own
   * `headers` field on generateText / streamText.
   */
  gatewayOptions?: GatewayHeaderOptions;
  /**
   * Additional raw headers to merge into every request. Rarely needed;
   * `gatewayOptions` covers the common Leanroute-specific ones.
   */
  headers?: Record<string, string>;
  /**
   * Agent identity sent on every request from this provider instance
   * (X-Agent-Name, X-Agent-Session-Id). For a per-run session id, pass
   * `headers: agentHeaders({ sessionId })` on each generateText /
   * streamText call instead.
   */
  agent?: AgentOptions;
}

/**
 * Create a Leanroute provider. Returns a Vercel AI SDK
 * `OpenAIProvider` — call it with a model id to get a `LanguageModelV1`:
 *
 * ```ts
 * const leanroute = createLeanroute({ gatewayOptions: { routing: "explicit" } });
 * const model = leanroute("deepseek/deepseek-v4-flash");
 * const { text } = await generateText({ model, prompt: "Hi" });
 * ```
 */
export function createLeanroute(options: CreateLeanrouteOptions = {}): OpenAIProvider {
  const gatewayHeaders = toHeaderRecord(options.gatewayOptions);
  const merged: Record<string, string> = {
    "x-leanroute-client": CLIENT_ID,
    ...(options.headers ?? {}),
    ...gatewayHeaders,
    ...agentHeaders(options.agent),
  };

  return createOpenAI({
    apiKey: options.apiKey ?? process.env.LEANROUTE_API_KEY,
    baseURL: options.baseURL ?? DEFAULT_BASE_URL,
    headers: merged,
    // `compatibility: "strict"` tells the SDK to expect strict OpenAI
    // wire format — safe because Leanroute translates upstream
    // provider responses back into that shape before returning.
    compatibility: "strict",
  });
}

/**
 * Default Leanroute provider — no per-instance options, keyed off
 * `process.env.LEANROUTE_API_KEY` at request time. Matches the
 * top-level `openai` export from `@ai-sdk/openai`.
 *
 * ```ts
 * import { leanroute } from "@leanroute/vercel-ai-sdk";
 * import { generateText } from "ai";
 *
 * const { text } = await generateText({
 *   model: leanroute("deepseek/deepseek-v4-flash"),
 *   prompt: "Hi",
 * });
 * ```
 */
export const leanroute: OpenAIProvider = createLeanroute();
