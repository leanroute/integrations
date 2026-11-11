# @leanroute/mcp-server

Model Context Protocol server for [Leanroute](https://leanroute.dev) — an agent-native AI gateway that lets your agent hit 14 providers (OpenAI, Anthropic, Google, xAI, DeepSeek, Groq, Meta, and more) through one API with prompt caching, semantic caching, failover, and per-key spend caps.

This package lets **agents** — Claude Code, Cursor, Windsurf, Cline, Claude Desktop — discover Leanroute as a tool source and use it directly.

## What tools does it expose?

| Tool                 | What it does                                                   |
| -------------------- | -------------------------------------------------------------- |
| `list_models`        | List models this account can dispatch to                       |
| `get_pricing`        | Full pricing catalog (input/output $/M, cached-input discount) |
| `cheapest_for`       | Rank cheapest models for a task tier                           |
| `route_call`         | Dispatch an LLM completion (OpenAI chat-completions shape)     |
| `get_usage`          | Aggregated spend, grouped by day/model/provider/key            |
| `get_credit_balance` | Current prepaid balance in USD                                 |
| `list_keys`          | List runtime gateway keys                                      |
| `create_runtime_key` | Mint a new runtime key                                         |
| `revoke_runtime_key` | Revoke a runtime key                                           |
| `list_mcp_servers`   | MCP servers on your org's allowlist (needs a runtime key)      |
| `list_runs`          | Agent runs: cost, models and tool calls per run                |
| `get_run`            | One agent run, request by request                              |

`route_call` also takes optional `agent_name` and `session_id`, sent as `X-Agent-Name` and `X-Agent-Session-Id`, so its calls show up as [agent runs](https://leanroute.dev/docs/agents).

The server **cannot** top up credit, upload BYOK provider keys, or mint admin keys. Those actions stay behind the [dashboard](https://leanroute.dev/dashboard) for safety.

## Install

You don't have to install — just point your MCP client at `npx @leanroute/mcp-server`.

## Configure

### 1. Mint an admin key

At https://leanroute.dev/dashboard/admin-keys, click **New admin key** and copy the `gw_admin_*` value.

### 2. Optionally mint a runtime key

If you want the agent to use the `route_call` tool (actually dispatch LLM completions through Leanroute), also mint a `gw_live_*` runtime key at https://leanroute.dev/dashboard/keys. Skip this if the agent only needs to check pricing/usage.

### 3. Wire it up in your MCP client

**Claude Code / Claude Desktop** (`~/.config/claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "leanroute": {
      "command": "npx",
      "args": ["-y", "@leanroute/mcp-server"],
      "env": {
        "LEANROUTE_ADMIN_KEY": "gw_admin_xxx",
        "LEANROUTE_RUNTIME_KEY": "gw_live_xxx"
      }
    }
  }
}
```

**Cursor** — same shape under `.cursor/mcp.json` in your project or `~/.cursor/mcp.json` globally.

**Windsurf / Cline** — check the tool's MCP configuration docs; the command + env format is the standard.

## Environment variables

| Var                     | Required | Default                     | Notes                                      |
| ----------------------- | -------- | --------------------------- | ------------------------------------------ |
| `LEANROUTE_ADMIN_KEY`   | yes      | —                           | `gw_admin_*` from /dashboard/admin-keys    |
| `LEANROUTE_RUNTIME_KEY` | no       | —                           | `gw_live_*` — only needed for `route_call` |
| `LEANROUTE_BASE_URL`    | no       | `https://api.leanroute.dev` | Override for self-hosted instances         |

## Security model

- Admin keys **cannot** dispatch LLM traffic. If a runtime key leaks, the attacker cannot enumerate/mutate account state.
- Runtime keys **cannot** hit `/platform/v1/*`. If an admin key leaks, the attacker cannot drain your LLM budget.
- **Neither** key class can top up credit or upload provider keys. Those require a browser session.

## License

Apache-2.0
