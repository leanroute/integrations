/**
 * Agent runs (Leanroute agent-native phase 1, 2026-10).
 *
 * Two optional headers turn agent traffic into runs on the Leanroute
 * Agent runs page and /platform/v1/runs:
 *
 *   X-Agent-Name        which agent (defaults to the API key's name)
 *   X-Agent-Session-Id  which run: send the same value on every request
 *                       in one run, a new one for the next run
 *
 * Every request from this package also carries X-Leanroute-Client, so
 * usage can be traced to the integration that sent it.
 * Docs: https://leanroute.dev/docs/agents
 */

/** Sent as X-Leanroute-Client. Keep in step with package.json. */
export const CLIENT_ID = "@leanroute/vercel-ai-sdk/0.2.0";

export interface AgentOptions {
  /** X-Agent-Name, e.g. "support-bot". Max 128 chars. */
  name?: string;
  /** X-Agent-Session-Id: one value per run. See `newRunId()`. */
  sessionId?: string;
  /** X-Agent-Id: optional subagent id within the run. */
  id?: string;
}

/** Agent options as request headers. Unset fields produce no header. */
export function agentHeaders(agent: AgentOptions | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (agent?.name) out["x-agent-name"] = agent.name;
  if (agent?.sessionId) out["x-agent-session-id"] = agent.sessionId;
  if (agent?.id) out["x-agent-id"] = agent.id;
  return out;
}

/** A fresh run id (UUID v4). Call once per run, not per request. */
export function newRunId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback for runtimes without crypto.randomUUID. Uniqueness, not secrecy.
  return "run_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}
