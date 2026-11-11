/**
 * ChatLeanroute — LangChain chat model that routes through Leanroute.
 *
 * Under the hood this is a `ChatOpenAI` instance with `baseURL` pointed
 * at `https://api.leanroute.dev/v1` and `apiKey` set to your Leanroute
 * runtime key (`gw_live_*`). We wrap it as a factory rather than a
 * subclass because:
 *
 *   1. `ChatOpenAI`'s constructor signature has changed twice in the
 *      LangChain 0.2 -> 0.3 transition. Wrapping keeps our surface
 *      stable regardless of which upstream ChatOpenAI shape ships.
 *   2. Subclassing forces us to mirror every one of ChatOpenAI's
 *      methods that returns `this`. A factory returns `ChatOpenAI`
 *      directly, so users get the exact upstream type back.
 *   3. Peer-dep model is cleaner when we do not depend on internal
 *      class shape.
 *
 * Trade-off: `new ChatLeanroute()` returns a plain `ChatOpenAI`, not a
 * `ChatLeanroute` instance. If you `instanceof` check, use `ChatOpenAI`.
 * TypeScript sees the return type accurately, so day-to-day use is
 * indistinguishable from calling `ChatOpenAI` directly.
 */

import { ChatOpenAI, type ChatOpenAIFields } from "@langchain/openai";
import type { LeanrouteModelId } from "./models.js";
import { toHeaderRecord, type GatewayHeaderOptions } from "./gateway-headers.js";
import { CLIENT_ID, agentHeaders, type AgentOptions } from "./agent.js";

const DEFAULT_BASE_URL = "https://api.leanroute.dev/v1";

/**
 * Config for `ChatLeanroute`. Accepts almost everything `ChatOpenAI`
 * accepts, plus our gateway-specific bits.
 *
 * Fields deliberately omitted from the passthrough:
 *   - `openAIApiKey` / `apiKey`: use `leanrouteApiKey` (or env
 *     `LEANROUTE_API_KEY`). Explicit naming reduces confusion for
 *     LangChain users who might accidentally paste an sk-... key.
 *   - `configuration.baseURL`: use `baseURL` at the top level.
 *
 * Notes on `model`: LangChain 0.3 renamed `modelName` to `model`. Both
 * still work at runtime because ChatOpenAI accepts both. We type the
 * new spelling only.
 */
export interface ChatLeanrouteFields extends Omit<
  ChatOpenAIFields,
  "apiKey" | "openAIApiKey" | "configuration" | "model" | "modelName"
> {
  /** Provider-prefixed model id. E.g. `"deepseek/deepseek-v4-flash"`. */
  model: LeanrouteModelId | (string & {});
  /**
   * Leanroute runtime key (`gw_live_*`). Falls back to
   * `process.env.LEANROUTE_API_KEY` if omitted. Errors clearly if
   * neither is present.
   */
  leanrouteApiKey?: string;
  /**
   * Override the Leanroute base URL. Only touch this if you are
   * hitting a self-hosted Leanroute instance or a staging endpoint.
   * Defaults to `https://api.leanroute.dev/v1`.
   */
  baseURL?: string;
  /**
   * Per-request routing modifiers (arbitrage on/off, region hint,
   * fallback model). Attached as `x-gateway-*` headers on every
   * request from this model instance.
   */
  gatewayOptions?: GatewayHeaderOptions;
  /**
   * Agent identity for Leanroute's Agent runs page: `name` becomes
   * X-Agent-Name, `sessionId` becomes X-Agent-Session-Id. Headers are
   * fixed per instance, so create one instance per run (cheap: it holds
   * no connection) with `sessionId: newRunId()`.
   */
  agent?: AgentOptions;
}

/**
 * Create a LangChain chat model routed through Leanroute.
 *
 * Basic use:
 * ```ts
 * import { ChatLeanroute } from "@leanroute/langchain";
 *
 * const llm = new ChatLeanroute({ model: "deepseek/deepseek-v4-flash" });
 * const res = await llm.invoke("Hi");
 * ```
 *
 * With gateway options:
 * ```ts
 * const llm = new ChatLeanroute({
 *   model: "anthropic/claude-sonnet-5",
 *   gatewayOptions: { routing: "explicit", region: "global", tag: "billing-lookup" },
 * });
 * ```
 *
 * Return value is a plain `ChatOpenAI` — plugs into every LangChain
 * runnable, agent, and chain that accepts a BaseChatModel.
 */
export function ChatLeanroute(fields: ChatLeanrouteFields): ChatOpenAI {
  const apiKey = fields.leanrouteApiKey ?? process.env.LEANROUTE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ChatLeanroute: missing runtime key. Pass `leanrouteApiKey` or set env LEANROUTE_API_KEY. Mint one at https://leanroute.dev/dashboard/keys",
    );
  }

  // Pull our custom fields out AND capture any pre-existing defaultHeaders
  // the caller may have set. We merge both header sources through the
  // single `configuration.defaultHeaders` sink so ChatOpenAI never sees
  // two conflicting sources.
  const {
    leanrouteApiKey: _apiKey,
    baseURL,
    gatewayOptions,
    agent,
    model,
    defaultHeaders: callerHeaders,
    ...rest
  } = fields as ChatLeanrouteFields & { defaultHeaders?: Record<string, string> };
  void _apiKey;

  const gatewayHeaders = toHeaderRecord(gatewayOptions);
  const mergedHeaders: Record<string, string> = {
    "x-leanroute-client": CLIENT_ID,
    ...(callerHeaders ?? {}),
    ...gatewayHeaders,
    ...agentHeaders(agent),
  };

  return new ChatOpenAI({
    ...rest,
    model,
    apiKey,
    configuration: {
      baseURL: baseURL ?? DEFAULT_BASE_URL,
      defaultHeaders: mergedHeaders,
    },
  });
}

/**
 * Type used in LangChain code that wants to accept "any BaseChatModel"
 * but also convey to readers "this is a Leanroute-provisioned one."
 * At runtime it is just `ChatOpenAI`.
 */
export type ChatLeanrouteInstance = ChatOpenAI;
