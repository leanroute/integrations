# @leanroute/langchain

LangChain integration for [Leanroute](https://leanroute.dev). Drop-in `ChatLeanroute` model that routes across 13 LLM providers (OpenAI, Anthropic, Google, DeepSeek, Groq, xAI, Qwen, GLM, Doubao, Kimi, Sarvam, Krutrim, Meta) with cost caps, failover, and MCP support baked in at the gateway.

## Install

```bash
npm install @leanroute/langchain @langchain/core @langchain/openai
```

`@langchain/core` and `@langchain/openai` are peer dependencies. Any 0.3.x version works.

## Get a key

Mint a runtime key (`gw_live_*`) at [leanroute.dev/dashboard/keys](https://leanroute.dev/dashboard/keys) and export it:

```bash
export LEANROUTE_API_KEY=gw_live_...
```

## Use it

```ts
import { ChatLeanroute } from "@leanroute/langchain";

const llm = new ChatLeanroute({
  model: "deepseek/deepseek-v4-flash",
  temperature: 0,
});

const res = await llm.invoke("Explain routing arbitrage in one sentence.");
console.log(res.content);
```

The returned value is a `ChatOpenAI` instance under the hood, so it plugs directly into every LangChain runnable, agent, chain, and tool-calling flow that accepts a `BaseChatModel`.

## Route across providers

`model` is a Leanroute canonical id: `<provider>/<model>`. Full autocomplete for the headline SKUs, arbitrary strings still work at runtime.

```ts
// Cheap-fast for a classification pass
const fast = new ChatLeanroute({ model: "openai/gpt-5-nano" });

// Groq for LPU-fast open-weight coding
const coder = new ChatLeanroute({ model: "groq/openai/gpt-oss-120b" });

// Premium reasoning
const reasoner = new ChatLeanroute({ model: "deepseek/deepseek-v4-pro" });

// Anthropic flagship (works because Leanroute translates between OpenAI
// and Anthropic wire formats on the way to Claude)
const claude = new ChatLeanroute({ model: "anthropic/claude-sonnet-5" });
```

If you do not want to hard-code an id, `DEFAULT_MODELS` exposes stable per-tier defaults:

```ts
import { ChatLeanroute, DEFAULT_MODELS } from "@leanroute/langchain";

const llm = new ChatLeanroute({ model: DEFAULT_MODELS.flagship });
```

## Agent runs

Name your agent and give each run an id, and Leanroute groups the calls into runs on the [Agent runs](https://leanroute.dev/docs/agents) page: cost per run, models used and every tool called. Headers are fixed per instance, so create one model per run (it holds no connection, so this is cheap):

```ts
import { ChatLeanroute, newRunId } from "@leanroute/langchain";

async function runAgent(task: string) {
  const llm = new ChatLeanroute({
    model: "deepseek/deepseek-v4-1-flash",
    agent: { name: "research-agent", sessionId: newRunId() },
  });
  // ...build your graph or chain with `llm` and run it for this task
}
```

`agent.name` is sent as `X-Agent-Name` (without it, the API key's name is used) and `agent.sessionId` as `X-Agent-Session-Id`. Every request also carries `X-Leanroute-Client: @leanroute/langchain/<version>`.

## Gateway options

`gatewayOptions.routing: "explicit"` sends `x-gateway-routing: explicit`, which disables cheaper-model swaps and failover for that model instance:

```ts
const llm = new ChatLeanroute({
  model: "deepseek/deepseek-v4-1-flash",
  gatewayOptions: { routing: "explicit" },
});
```

`region`, `fallbackModel` and `tag` are deprecated: the gateway never read those headers, and since 0.2.0 they are no longer sent.

Details on each option are documented at [leanroute.dev/docs/headers](https://leanroute.dev/docs/headers).

## Streaming

Works out of the box because `ChatOpenAI` supports it natively.

```ts
const llm = new ChatLeanroute({ model: "deepseek/deepseek-v4-flash", streaming: true });

for await (const chunk of await llm.stream("Write a haiku about a compiler bug.")) {
  process.stdout.write(chunk.content as string);
}
```

## Tool calling

`ChatLeanroute` inherits `ChatOpenAI`'s tool-calling support. Bind tools the usual LangChain way:

```ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const weather = tool(async ({ city }) => `The weather in ${city} is sunny.`, {
  name: "get_weather",
  description: "Fetch weather for a city.",
  schema: z.object({ city: z.string() }),
});

const llm = new ChatLeanroute({ model: "anthropic/claude-sonnet-5" });
const bound = llm.bindTools([weather]);
const res = await bound.invoke("What is the weather in Singapore?");
console.log(res.tool_calls);
```

Not every model supports tool calling. Anthropic, OpenAI GPT-5 line, DeepSeek, and Groq gpt-oss all do. Some Chinese-provider models return tool calls in a non-standard shape; the gateway translates when possible but does not guarantee 1:1 fidelity across every SKU.

## LangChain Expression Language (LCEL)

`ChatLeanroute` composes with prompts, output parsers, and every other runnable in the ecosystem.

```ts
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

const prompt = ChatPromptTemplate.fromTemplate("Summarize this in one sentence: {input}");
const chain = prompt
  .pipe(new ChatLeanroute({ model: "deepseek/deepseek-v4-flash" }))
  .pipe(new StringOutputParser());

const summary = await chain.invoke({ input: longText });
```

## Verifying routing works

Every response includes an `x-gateway-provider` response header identifying which upstream actually answered. LangChain does not surface response headers on `.invoke()`, but you can read them from the underlying OpenAI client if you need to prove routing worked:

```ts
const llm = new ChatLeanroute({ model: "deepseek/deepseek-v4-flash" });
const client = (llm as unknown as { client: { chat: { completions: { create: Function } } } })
  .client;
const raw = await client.chat.completions
  .create(
    { model: "deepseek/deepseek-v4-flash", messages: [{ role: "user", content: "hi" }] },
    { headers: {} },
  )
  .asResponse();
console.log(raw.headers.get("x-gateway-provider"));
```

Easier: check the [Leanroute dashboard](https://leanroute.dev/dashboard/usage), which logs every request against the upstream that answered.

Note: if you ask a model "which model are you?" almost every LLM will confidently say ChatGPT / GPT-4 / OpenAI, even DeepSeek and Claude. That is a training-data artefact, not a routing bug. Rely on the gateway metadata for ground truth.

## License

Apache-2.0. See [LICENSE](./LICENSE).
