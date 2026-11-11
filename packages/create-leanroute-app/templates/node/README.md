# {{projectName}}

A Node.js + TypeScript starter for [Leanroute](https://leanroute.dev). The OpenAI SDK is pre-configured to route through Leanroute's OpenAI-compatible endpoint, so you can dispatch across 13 LLM providers with one client.

## Get started

```bash
cp .env.example .env
# paste your Leanroute runtime key into .env
npm install
npm run chat
```

You need a Leanroute runtime key (starts with `gw_live_`). Mint one at [leanroute.dev/dashboard/keys](https://leanroute.dev/dashboard/keys).

## What's in the box

Three example scripts, all pointed at the same `openai` SDK client.

### `npm run list-models`

Prints every model your account can dispatch to, sorted alphabetically. Model ids are provider-prefixed (`deepseek/deepseek-v4-flash`, `anthropic/claude-sonnet-5`, `google/gemini-3.7-flash`, etc).

### `npm run chat`

One-shot chat completion. Default model is `deepseek/deepseek-v4-flash` (cheap, fast, flagship-tier). Prints the answer plus the gateway metadata (which provider actually answered, cost in USD, token counts).

Change the `model` string in `src/chat-once.ts` to route to any of the 13 providers.

### `npm run usage`

Queries `/platform/v1/usage` and prints your last 24 hours broken down by model. This uses an **admin** key (`gw_admin_*`), not a runtime key. Admin keys are minted separately at [leanroute.dev/dashboard/admin-keys](https://leanroute.dev/dashboard/admin-keys).

Two key classes:

- **Runtime key** (`gw_live_*`) — dispatches LLM traffic on `/v1/*`. What Claude Code, your app, and the SDK use.
- **Admin key** (`gw_admin_*`) — manages your account on `/platform/v1/*`. Lists keys, checks usage, monitors credit. Cannot dispatch LLM traffic.

Neither class can top up credit or upload BYOK provider keys. Those stay behind the dashboard.

## Files

```
src/
  client.ts       — shared openai SDK instance pointed at Leanroute
  list-models.ts  — GET /v1/models
  chat-once.ts    — POST /v1/chat/completions
  check-usage.ts  — GET /platform/v1/usage
```

## Verifying routing works

If you ask any model "which model are you?" it will confidently say ChatGPT / GPT-4 / OpenAI, even DeepSeek and Claude. That is not a routing bug. Most models were trained on scrapes of the internet that include billions of ChatGPT conversations, so they learned the pattern that when asked, the answer is ChatGPT. Model self-report is the least reliable way to check what actually answered.

Reliable ways to prove the routing works:

- **`chat-once.ts` already prints the ground-truth provider.** Every response includes a line like:
  ```
  [deepseek/deepseek-v4-flash] provider=deepseek cost=$0.000042 in=42 out=87
  ```
  The `provider=` value comes from the `x-gateway-provider` response header, stamped by the gateway based on which upstream actually served the request.
- **Swap the model string and re-run.** Change `deepseek/deepseek-v4-flash` to `anthropic/claude-sonnet-5` in `chat-once.ts` and run it again. `provider=` will flip to `anthropic`, and the token counts will change because each provider tokenizes differently.
- **`npm run usage`** hits `/platform/v1/usage` grouped by model, so you can see over any window exactly which upstream billed you what.

## Next steps

- Swap the default model in `chat-once.ts` to see different providers answer
- Add streaming: `stream: true` in the SDK options, iterate the async iterable
- Wire it into an agent framework (`@leanroute/langchain` and `@leanroute/llama-index` coming soon)
- Cap your spend per key at [leanroute.dev/dashboard/keys](https://leanroute.dev/dashboard/keys) — daily and monthly USD limits enforced at request time

## Docs

- [Leanroute docs](https://leanroute.dev/docs)
- [OpenAPI spec](https://leanroute.dev/openapi.json)
- [MCP server](https://www.npmjs.com/package/@leanroute/mcp-server) (if you want agents to route on their own)
