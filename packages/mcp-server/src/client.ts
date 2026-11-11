/**
 * Thin HTTP client for the Leanroute platform API + runtime chat endpoint.
 *
 * We deliberately do NOT depend on any SDK (@leanroute/js, openai, etc.)
 * to keep this package's install footprint tiny — one small server that
 * agents run locally shouldn't pull in a hundred transitive deps.
 */

const DEFAULT_BASE_URL = "https://api.leanroute.dev";

/** Sent as X-Leanroute-Client so usage can be traced to this package. */
export const CLIENT_ID = "@leanroute/mcp-server/0.1.4";

export interface ClientOptions {
  /** Admin key (gw_admin_*). Required for /platform/v1/* calls. */
  adminKey: string;
  /**
   * Runtime key (gw_live_*). Optional; only required if you use the
   * `route_call` tool. Can be left unset if the agent only reads
   * pricing / usage / balance.
   */
  runtimeKey?: string;
  /** Base URL override — defaults to https://api.leanroute.dev. */
  baseUrl?: string;
  /** Extra request timeout in ms. Default 60_000. */
  timeoutMs?: number;
}

export class LeanrouteClient {
  private readonly baseUrl: string;
  private readonly adminKey: string;
  private readonly runtimeKey?: string;
  private readonly timeoutMs: number;

  constructor(opts: ClientOptions) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.adminKey = opts.adminKey;
    this.runtimeKey = opts.runtimeKey;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { auth: "admin" | "runtime" },
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const token = init.auth === "admin" ? this.adminKey : this.runtimeKey;
    if (!token) {
      throw new Error(
        init.auth === "runtime"
          ? "runtime_key_not_set: this tool needs a gw_live_* key. Set LEANROUTE_RUNTIME_KEY."
          : "admin_key_not_set: set LEANROUTE_ADMIN_KEY.",
      );
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
          "x-leanroute-client": CLIENT_ID,
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`leanroute_api_error: ${res.status} ${res.statusText} — ${text}`);
      }
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  // ----- Platform (admin) -----

  listModels() {
    return this.request<{ object: string; data: unknown[] }>("/v1/models", {
      auth: "runtime",
      method: "GET",
    });
  }

  getPricing() {
    return this.request<{ currency: string; models: unknown[] }>("/platform/v1/pricing", {
      auth: "admin",
      method: "GET",
    });
  }

  getUsage(params: { from?: string; to?: string; group_by?: string } = {}) {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.group_by) q.set("group_by", params.group_by);
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return this.request<Record<string, unknown>>(`/platform/v1/usage${suffix}`, {
      auth: "admin",
      method: "GET",
    });
  }

  getCredit() {
    return this.request<Record<string, unknown>>("/platform/v1/credit", {
      auth: "admin",
      method: "GET",
    });
  }

  listKeys() {
    return this.request<{ keys: unknown[] }>("/platform/v1/keys", {
      auth: "admin",
      method: "GET",
    });
  }

  createRuntimeKey(name: string) {
    return this.request<{ key: Record<string, unknown> }>("/platform/v1/keys", {
      auth: "admin",
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  revokeRuntimeKey(id: string) {
    return this.request<{ ok: boolean }>(`/platform/v1/keys/${encodeURIComponent(id)}`, {
      auth: "admin",
      method: "DELETE",
    });
  }

  /** Agent runs (requests grouped by X-Agent-Session-Id). */
  listRuns(params: { from?: string; to?: string; agent?: string; limit?: number } = {}) {
    const q = new URLSearchParams();
    if (params.from) q.set("from", params.from);
    if (params.to) q.set("to", params.to);
    if (params.agent) q.set("agent", params.agent);
    if (params.limit) q.set("limit", String(params.limit));
    const suffix = q.toString() ? `?${q.toString()}` : "";
    return this.request<Record<string, unknown>>(`/platform/v1/runs${suffix}`, {
      auth: "admin",
      method: "GET",
    });
  }

  getRun(sessionId: string) {
    return this.request<Record<string, unknown>>(
      `/platform/v1/runs/${encodeURIComponent(sessionId)}`,
      { auth: "admin", method: "GET" },
    );
  }

  // ----- Runtime -----

  /** MCP servers on the org's allowlist. Runtime key (/v1). */
  listMcpServers() {
    return this.request<{ object: string; data: unknown[] }>("/v1/mcp/servers", {
      auth: "runtime",
      method: "GET",
    });
  }

  chatCompletion(
    payload: Record<string, unknown>,
    agent: { name?: string; sessionId?: string } = {},
  ) {
    const headers: Record<string, string> = {};
    if (agent.name) headers["x-agent-name"] = agent.name;
    if (agent.sessionId) headers["x-agent-session-id"] = agent.sessionId;
    return this.request<Record<string, unknown>>("/v1/chat/completions", {
      auth: "runtime",
      method: "POST",
      body: JSON.stringify(payload),
      headers,
    });
  }
}
