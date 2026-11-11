# Leanroute integrations

Open-source SDKs, framework integrations and the MCP server for **[Leanroute](https://leanroute.dev)**, the agent-native AI gateway: one OpenAI-compatible API for 100+ models across 14 providers, with cost per agent run, MCP tools on any model, spend caps and guardrails.

| Package                                                      | What it is                                                               | Install                                | Docs                                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------- | -------------------------------------------------------------- |
| [`langchain-leanroute`](packages/langchain-leanroute-python) | `ChatLeanroute` for LangChain and LangGraph (Python)                     | `pip install langchain-leanroute`      | [Guide](https://leanroute.dev/docs/integrations/langchain)     |
| [`@leanroute/langchain`](packages/leanroute-langchain)       | `ChatLeanroute` for LangChain.js                                         | `npm install @leanroute/langchain`     | [Guide](https://leanroute.dev/docs/integrations/langchain)     |
| [`@leanroute/vercel-ai-sdk`](packages/leanroute-vercel-ai)   | Leanroute provider for the Vercel AI SDK                                 | `npm install @leanroute/vercel-ai-sdk` | [Guide](https://leanroute.dev/docs/integrations/vercel-ai-sdk) |
| [`@leanroute/mcp-server`](packages/mcp-server)               | MCP server: manage Leanroute from Claude Code, Cursor, Windsurf or Cline | `npx @leanroute/mcp-server`            | [Guide](https://leanroute.dev/docs/mcp-server)                 |
| [`create-leanroute-app`](packages/create-leanroute-app)      | Starter app: Next.js chat or Node CLI                                    | `npx create-leanroute-app`             | [README](packages/create-leanroute-app)                        |

## Quick start

1. Create a key at [leanroute.dev/dashboard/keys](https://leanroute.dev/dashboard/keys). New accounts get 100 free requests on low-cost models, no card needed.
2. `export LEANROUTE_API_KEY=gw_live_...`
3. Pick a package above. For example, with Python:

```python
from langchain_leanroute import ChatLeanroute, new_run_id

llm = ChatLeanroute(
    model="deepseek/deepseek-v4-1-flash",
    agent_name="research-agent",
    session_id=new_run_id(),  # groups calls into one agent run
)
print(llm.invoke("Explain retrieval-augmented generation in one sentence.").content)
```

Every package works with any model id in the `provider/model` form, for example `anthropic/claude-sonnet-5` or `openai/gpt-5.6-terra`. Full list: [leanroute.dev/models](https://leanroute.dev/models).

## Agent runs

All packages can tag requests with an agent name and a run id, so the [Agent runs](https://leanroute.dev/docs/agents) page shows cost, models and tools called per run. See [how to track AI agent costs per run](https://leanroute.dev/blog/track-ai-agent-costs-per-run).

## About this repo

This repository is published from Leanroute's main codebase; changes land here automatically. Issues and feature requests are welcome. For pull requests, please open an issue first so we can apply the change upstream.

Gateway status: [leanroute.dev](https://leanroute.dev). Support: support@leanroute.dev

## License

Apache-2.0. See [LICENSE](LICENSE).
