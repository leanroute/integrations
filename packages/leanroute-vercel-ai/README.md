# @leanroute/vercel-ai-sdk

Vercel AI SDK provider for [Leanroute](https://leanroute.dev). Drop-in `leanroute` provider that routes across 13 LLM providers (OpenAI, Anthropic, Google, DeepSeek, Groq, xAI, Qwen, GLM, Doubao, Kimi, Sarvam, Krutrim, Meta) with cost caps, failover, and MCP support baked in at the gateway.

## Install

```bash
npm install @leanroute/vercel-ai-sdk ai @ai-sdk/openai
```

`ai` and `@ai-sdk/openai` are peer dependencies.

## Get a key

Mint a runtime key (`gw_live_*`) at [leanroute.dev/dashboard/keys](https://leanroute.dev/dashboard/keys):

```bash
export LEANROUTE_API_KEY=gw_live_...
```

## Use it

```ts
import { leanroute } from "@leanroute/vercel-ai-sdk";
import { generateText } from "ai";

const { text } = await generateText({
  model: leanroute("deepseek/deepseek-v4-flash"),
  prompt: "Explain routing arbitrage in one sentence.",
});

console.log(text);
```

`leanroute(modelId)` returns a `LanguageModelV1` and plugs into every helper the Vercel AI SDK ships: `generateText`, `streamText`, `generateObject`, `streamObject`, `useChat`, `streamUI`, and the Next.js App Router server components.

## Route across providers

`modelId` is a Leanroute canonical id: `<provider>/<model>`. Full autocomplete for the headline SKUs, arbitrary strings still work at runtime.

```ts
// Cheap-fast classification
const nano = leanroute("openai/gpt-5-nano");

// LPU-fast open-weight coding
const groq = leanroute("groq/openai/gpt-oss-120b");

// Premium reasoning
const reasoner = leanroute("deepseek/deepseek-v4-pro");

// Anthropic flagship (Leanroute translates OpenAI-style requests to Anthropic's Messages format on the way to Claude)
const claude = leanroute("anthropic/claude-sonnet-5");
```

Or use the pre-selected defaults:

```ts
import { leanroute, DEFAULT_MODELS } from "@leanroute/vercel-ai-sdk";

const model = leanroute(DEFAULT_MODELS.flagship);
```

## Streaming

Works out of the box:

```ts
import { streamText } from "ai";
import { leanroute } from "@leanroute/vercel-ai-sdk";

const { textStream } = await streamText({
  model: leanroute("deepseek/deepseek-v4-flash"),
  prompt: "Write a haiku about a compiler bug.",
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

## Structured output

```ts
import { generateObject } from "ai";
import { leanroute } from "@leanroute/vercel-ai-sdk";
import { z } from "zod";

const { object } = await generateObject({
  model: leanroute("anthropic/claude-sonnet-5"),
  schema: z.object({
    city: z.string(),
    population: z.number(),
    country: z.string(),
  }),
  prompt: "Give me facts about Singapore.",
});

console.log(object);
```

## Tool calling

```ts
import { generateText, tool } from "ai";
import { leanroute } from "@leanroute/vercel-ai-sdk";
import { z } from "zod";

const { text, toolCalls } = await generateText({
  model: leanroute("anthropic/claude-sonnet-5"),
  tools: {
    getWeather: tool({
      description: "Fetch weather for a city",
      parameters: z.object({ city: z.string() }),
      execute: async ({ city }) => ({ city, temp: 30, condition: "sunny" }),
    }),
  },
  prompt: "What's the weather in Singapore?",
});
```

Not every model supports tools. OpenAI GPT-5 line, Anthropic Claude, DeepSeek, and Groq gpt-oss all do. Some Chinese-provider models return tool calls in a non-standard shape; the gateway translates when it can but does not guarantee 1:1 fidelity across every SKU.

## Next.js App Router

Standard `useChat` / `streamText` pattern. In your API route:

```ts
// app/api/chat/route.ts
import { streamText } from "ai";
import { leanroute } from "@leanroute/vercel-ai-sdk";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: leanroute("deepseek/deepseek-v4-flash"),
    messages,
  });
  return result.toDataStreamResponse();
}
```

In your client component:

```tsx
"use client";
import { useChat } from "ai/react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          <b>{m.role}:</b> {m.content}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

## Agent runs

Name your agent and give each run an id, and Leanroute groups the calls into runs on the [Agent runs](https://leanroute.dev/docs/agents) page: cost per run, models used and every tool called.

```ts
import { createLeanroute, agentHeaders, newRunId } from "@leanroute/vercel-ai-sdk";
import { generateText } from "ai";

const leanroute = createLeanroute({ agent: { name: "support-bot" } });

const runId = newRunId(); // one per run, reused for every call in it
const { text } = await generateText({
  model: leanroute("deepseek/deepseek-v4-1-flash"),
  prompt,
  headers: agentHeaders({ sessionId: runId }),
});
```

`agent.name` is sent as `X-Agent-Name` (without it, the API key's name is used) and the session id as `X-Agent-Session-Id`. Every request also carries `X-Leanroute-Client: @leanroute/vercel-ai-sdk/<version>`.

## Gateway options

`gatewayOptions.routing: "explicit"` sends `x-gateway-routing: explicit`, which disables cheaper-model swaps and failover for that provider instance:

```ts
const pinned = createLeanroute({ gatewayOptions: { routing: "explicit" } });
```

`region`, `fallbackModel` and `tag` are deprecated: the gateway never read those headers, and since 0.2.0 they are no longer sent.

See [leanroute.dev/docs/headers](https://leanroute.dev/docs/headers) for the full header reference.

## Verifying routing works

The gateway stamps `x-gateway-provider` on every response, telling you which upstream actually answered. The Vercel AI SDK doesn't surface response headers on `generateText`, but the [Leanroute dashboard](https://leanroute.dev/dashboard/usage) logs every request against the answering upstream — the auditable source of truth.

Note: if you ask a model "which model are you?" almost every LLM will confidently say ChatGPT / GPT-4 / OpenAI, even DeepSeek and Claude. That's a training-data artefact, not a routing bug. Trust the dashboard, not the model.

## License

Apache-2.0. See [LICENSE](./LICENSE).
