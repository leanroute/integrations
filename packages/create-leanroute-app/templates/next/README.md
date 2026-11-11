# {{projectName}}

A Next.js chat app powered by [Leanroute](https://leanroute.dev). Streaming responses, model picker across 5 headline SKUs, and per-message cost metadata (which provider answered, cache hit status, token counts).

## Get started

```bash
cp .env.example .env.local
# paste your Leanroute runtime key into .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You need a runtime key (starts with `gw_live_`) from [leanroute.dev/dashboard/keys](https://leanroute.dev/dashboard/keys).

## What's here

```
app/
  layout.tsx           — Next App Router root layout
  page.tsx             — Chat UI with model picker + streaming
  globals.css          — Minimal dark-first CSS. Rip out and replace.
  api/chat/route.ts    — Server-side SSE proxy to Leanroute /v1/chat/completions
lib/
  models.ts            — Headline model list shown in the picker
```

The key never leaves the server. The browser talks to `/api/chat`, which proxies to `https://api.leanroute.dev/v1/chat/completions` with the key in the Authorization header. This is the pattern you want for every serious client: never ship API keys to the browser.

## Model picker

Five headline SKUs by default:

| Model                            | Input $/M | Output $/M | Notes                          |
| -------------------------------- | --------- | ---------- | ------------------------------ |
| `deepseek/deepseek-v4-flash`     | 0.22      | 0.66       | Default. Cheap flagship.       |
| `groq/openai/gpt-oss-120b`       | 0.15      | 0.60       | LPU-fast.                      |
| `anthropic/claude-sonnet-5`      | 2.00      | 10.00      | Anthropic flagship.            |
| `openai/gpt-5-mini`              | 0.25      | 2.00       | OpenAI mid-tier.               |
| `google/gemini-3.7-flash`        | 0.75      | 3.75       | Intro pricing through Dec 31.  |

Full model list (50+ SKUs across 13 providers) is available at [`/v1/models`](https://api.leanroute.dev/v1/models). Edit `lib/models.ts` to change what shows up in the picker.

## Deploy

### Vercel (default)

`vercel.json` is included. Push to a GitHub repo, import at [vercel.com/new](https://vercel.com/new), set `LEANROUTE_API_KEY` in the environment settings. Ships in ~2 minutes.

### Fly.io

Add a `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

Then:

```bash
fly launch --dockerfile Dockerfile --no-deploy
fly secrets set LEANROUTE_API_KEY=gw_live_...
fly deploy
```

### Anywhere else (Netlify, Cloudflare Pages, Railway, Render, your own Docker host)

The app is a standard Next.js 14 App Router build. Anything that serves Node.js and lets you set an env var will host it. Set `LEANROUTE_API_KEY` in the platform's secrets manager and point the platform at `npm run build` / `npm run start`.

## Verifying routing works

If you ask the chat "which model are you?" every model will confidently say ChatGPT / GPT-4 / OpenAI, even DeepSeek and Claude. That is not a routing bug. Most models were trained on scrapes of the internet that include billions of ChatGPT conversations, so they learned the pattern that when asked, the answer is ChatGPT. Model self-report is the least reliable way to check what actually answered.

Reliable ways to prove the routing works:

- **Look at the metadata line under each response.** The chat UI already prints it:
  ```
  deepseek/deepseek-v4-flash · provider=deepseek · in=42 out=87
  ```
  The `provider=` value comes from the `x-gateway-provider` response header, stamped by the gateway based on which upstream actually served the request. That is ground truth.
- **Compare token counts across models on the same prompt.** Each provider uses a different tokenizer. Send "Hello world" to three models and the `in=` counts will differ. If they are identical, something is stubbed.
- **Ask questions models actually differ on.** Skip identity questions. Try "what is your knowledge cutoff?" or "write a haiku about a compiler bug." Style and cutoff dates vary meaningfully across providers.
- **Check the Leanroute dashboard.** Every request is logged against the upstream that answered. The `/dashboard` usage view is the auditable source of truth.

## Extending it

- **Auth**: drop in [Better Auth](https://www.better-auth.com), [Auth.js](https://authjs.dev/), or [Clerk](https://clerk.com) and gate `/api/chat` on a session cookie.
- **Per-user rate limits**: wrap `/api/chat` in a token-bucket check (Upstash Redis works well) before proxying.
- **Save conversations**: swap the in-memory `messages` state for a database call (Postgres + Drizzle, Turso + Prisma, whatever).
- **Agent tools**: install [`@leanroute/mcp-server`](https://www.npmjs.com/package/@leanroute/mcp-server) alongside this app and give Claude Code or Cursor access to your Leanroute account.

## Docs

- [Leanroute docs](https://leanroute.dev/docs)
- [OpenAPI spec](https://leanroute.dev/openapi.json)
- [Full model catalog](https://leanroute.dev/docs/models)
