/**
 * Tool definitions for the Leanroute MCP server.
 *
 * We register each tool as a name + JSON-schema-shaped input + handler.
 * The handler receives the parsed args and a shared LeanrouteClient
 * instance. Tools return either structured JSON (best for downstream
 * agent reasoning) or a short text summary.
 *
 * Design notes:
 *
 *   - `cheapest_for` does the sort/filter client-side over the pricing
 *     catalog rather than adding a server endpoint. Keeps the platform
 *     API small and lets us tweak scoring without a gateway redeploy.
 *
 *   - `route_call` intentionally mirrors OpenAI chat-completions shape
 *     because that's what every agent already knows how to build. The
 *     agent picks the model (or asks `cheapest_for` first). We do NOT
 *     invent a new prompt schema.
 *
 *   - Money-moving tools are deliberately absent. There's no
 *     `top_up_credit`, no `upload_provider_key`, no `create_admin_key`.
 *     Those require the dashboard. This is the invariant that lets an
 *     end-user hand out an admin key without worrying about the agent
 *     draining their card.
 */

import { z } from "zod";
import type { LeanrouteClient } from "./client.js";

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: unknown, client: LeanrouteClient) => Promise<unknown>;
}

// ---- Schemas ----

const CheapestForSchema = z.object({
  task_type: z
    .enum(["flagship", "cheap_fast", "premium_reasoning", "any"])
    .default("any")
    .describe("Which tier of model to consider. 'any' scans all."),
  vision: z.boolean().optional().describe("If true, only return models with vision support."),
  max_input_price_per_million_usd: z
    .number()
    .optional()
    .describe("Filter out models whose input price exceeds this."),
  top_n: z.number().int().positive().max(20).default(5).describe("How many results to return."),
});

const UsageSchema = z.object({
  from: z.string().optional().describe("ISO date. Default: 30 days ago."),
  to: z.string().optional().describe("ISO date. Default: now."),
  group_by: z.enum(["day", "model", "provider", "key"]).default("day"),
});

const CreateKeySchema = z.object({
  name: z.string().min(1).max(64).describe("Human-readable label for the key."),
});

const RevokeKeySchema = z.object({
  id: z.string().min(1).describe("api_key.id of the runtime key to revoke."),
});

const RouteCallSchema = z.object({
  model: z.string().describe("Canonical model id, e.g. 'anthropic/claude-sonnet-4-6'."),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant", "tool"]),
        content: z.string(),
      }),
    )
    .describe("OpenAI-shaped messages array."),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  agent_name: z
    .string()
    .max(128)
    .optional()
    .describe("Sent as X-Agent-Name. Shows on the Agent runs page. Default: the key's name."),
  session_id: z
    .string()
    .max(128)
    .optional()
    .describe("Sent as X-Agent-Session-Id. Use one id per run to group calls into a run."),
});

const ListRunsSchema = z.object({
  from: z.string().optional().describe("ISO date. Default: 7 days ago."),
  to: z.string().optional().describe("ISO date. Default: now."),
  agent: z.string().max(128).optional().describe("Only runs where this agent name appears."),
  limit: z.number().int().min(1).max(200).optional().describe("1-200. Default 50."),
});

const GetRunSchema = z.object({
  session_id: z.string().min(1).max(128).describe("The run's X-Agent-Session-Id."),
});

// ---- Tool factory ----

export function makeTools(): ToolDef[] {
  return [
    {
      name: "list_models",
      description:
        "List all LLM models this Leanroute account can dispatch to (filtered by configured provider keys + BYOK). Returns OpenAI-shaped model objects.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: async (_args, client) => client.listModels(),
    },
    {
      name: "get_pricing",
      description:
        "Full pricing catalog: input/output $/M-tokens, cached-input discount, tier, provider, and vision flag for every model Leanroute knows about. Use this to score alternatives client-side.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: async (_args, client) => client.getPricing(),
    },
    {
      name: "cheapest_for",
      description:
        "Rank the cheapest models for a task tier. Filters by optional vision and price ceiling. Returns top_n models sorted by input price ascending. Use when the user asks 'what's the cheapest way to X'.",
      inputSchema: zodToJsonSchema(CheapestForSchema),
      handler: async (args, client) => {
        const parsed = CheapestForSchema.parse(args);
        const catalog = (await client.getPricing()) as {
          models: Array<{
            id: string;
            provider: string;
            tier: string | null;
            input_per_million_usd: number;
            output_per_million_usd: number;
            vision: boolean;
          }>;
        };
        let rows = catalog.models;
        if (parsed.task_type !== "any") {
          rows = rows.filter((m) => m.tier === parsed.task_type);
        }
        if (parsed.vision) {
          rows = rows.filter((m) => m.vision);
        }
        if (parsed.max_input_price_per_million_usd !== undefined) {
          const cap = parsed.max_input_price_per_million_usd;
          rows = rows.filter((m) => m.input_per_million_usd <= cap);
        }
        rows.sort((a, b) => a.input_per_million_usd - b.input_per_million_usd);
        return { candidates: rows.slice(0, parsed.top_n) };
      },
    },
    {
      name: "get_usage",
      description:
        "Aggregated spend + token counts for the caller's Leanroute org. Group by day/model/provider/key. Default window: last 30 days.",
      inputSchema: zodToJsonSchema(UsageSchema),
      handler: async (args, client) => {
        const parsed = UsageSchema.parse(args);
        return client.getUsage(parsed);
      },
    },
    {
      name: "get_credit_balance",
      description:
        "Current prepaid-credit balance in USD, including bonus credit. Read-only — this MCP server cannot initiate a top-up (dashboard-only for safety).",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: async (_args, client) => client.getCredit(),
    },
    {
      name: "list_keys",
      description:
        "List runtime gateway keys (gw_live_*) for the caller's org. Includes revoked keys for history.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: async (_args, client) => client.listKeys(),
    },
    {
      name: "create_runtime_key",
      description:
        "Mint a new runtime key (gw_live_*). Response contains the full key exactly once — surface it to the user immediately. Requires the admin key to have been minted by an owner or admin.",
      inputSchema: zodToJsonSchema(CreateKeySchema),
      handler: async (args, client) => {
        const parsed = CreateKeySchema.parse(args);
        return client.createRuntimeKey(parsed.name);
      },
    },
    {
      name: "revoke_runtime_key",
      description:
        "Revoke a runtime key by id. Idempotent from the caller's perspective; a missing id returns 404.",
      inputSchema: zodToJsonSchema(RevokeKeySchema),
      handler: async (args, client) => {
        const parsed = RevokeKeySchema.parse(args);
        return client.revokeRuntimeKey(parsed.id);
      },
    },
    {
      name: "route_call",
      description:
        "Dispatch an LLM completion through Leanroute. OpenAI chat-completions shape. Requires LEANROUTE_RUNTIME_KEY in env (a gw_live_* key). If you don't have one, call `create_runtime_key` first and surface the returned key to the user.",
      inputSchema: zodToJsonSchema(RouteCallSchema),
      handler: async (args, client) => {
        const { agent_name, session_id, ...payload } = RouteCallSchema.parse(args);
        return client.chatCompletion(payload, { name: agent_name, sessionId: session_id });
      },
    },
    {
      name: "list_mcp_servers",
      description:
        "MCP servers on the org's allowlist: the only ones that can be attached as mcp_servers on /v1/chat/completions. Returns name and URL (credentials and query strings removed). Requires LEANROUTE_RUNTIME_KEY.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      handler: async (_args, client) => client.listMcpServers(),
    },
    {
      name: "list_runs",
      description:
        "Agent runs (requests grouped by X-Agent-Session-Id), newest first: agent names, request count, errors, cost, models, tool-call count. Default window: last 7 days.",
      inputSchema: zodToJsonSchema(ListRunsSchema),
      handler: async (args, client) => client.listRuns(ListRunsSchema.parse(args ?? {})),
    },
    {
      name: "get_run",
      description:
        "One agent run by session id: every request (model, cost, tokens, status, tools called) and a per-tool rollup. No prompts or tool arguments.",
      inputSchema: zodToJsonSchema(GetRunSchema),
      handler: async (args, client) => client.getRun(GetRunSchema.parse(args).session_id),
    },
  ];
}

/**
 * Minimal zod → JSON-schema converter for the tool `inputSchema` field.
 * MCP expects JSON Schema; zod's own toJsonSchema isn't in the base
 * package. We only need a few primitive kinds, so hand-roll rather than
 * pulling in `zod-to-json-schema`.
 */
function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): Record<string, unknown> {
  const shape = schema.shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [key, field] of Object.entries(shape)) {
    properties[key] = zodFieldToSchema(field as z.ZodTypeAny);
    if (!(field as z.ZodTypeAny).isOptional()) required.push(key);
  }
  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  };
}

function zodFieldToSchema(field: z.ZodTypeAny): Record<string, unknown> {
  const description = field.description;
  const base = (() => {
    if (field instanceof z.ZodString) return { type: "string" };
    if (field instanceof z.ZodNumber) return { type: "number" };
    if (field instanceof z.ZodBoolean) return { type: "boolean" };
    if (field instanceof z.ZodEnum)
      return { type: "string", enum: (field as z.ZodEnum<[string, ...string[]]>).options };
    if (field instanceof z.ZodArray) {
      return {
        type: "array",
        items: zodFieldToSchema((field as z.ZodArray<z.ZodTypeAny>).element),
      };
    }
    if (field instanceof z.ZodOptional)
      return zodFieldToSchema((field as z.ZodOptional<z.ZodTypeAny>).unwrap());
    if (field instanceof z.ZodDefault)
      return zodFieldToSchema((field as z.ZodDefault<z.ZodTypeAny>).removeDefault());
    if (field instanceof z.ZodObject) return zodToJsonSchema(field as z.ZodObject<z.ZodRawShape>);
    return { type: "string" };
  })();
  return description ? { ...base, description } : base;
}
