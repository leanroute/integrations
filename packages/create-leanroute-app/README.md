# create-leanroute-app

Scaffold a new [Leanroute](https://leanroute.dev)-powered app in seconds.

```bash
npx create-leanroute-app my-app
```

Two templates:

- **`next`** (default) — Next.js chat app with streaming, model picker, and cost display. Deployable to Vercel out of the box.
- **`node`** — Bare Node.js + TypeScript starter with the OpenAI SDK pre-configured against Leanroute. Includes example scripts for listing models, running a one-shot chat, and checking usage.

## Usage

### Interactive (recommended for humans)

```bash
npx create-leanroute-app
```

The CLI will prompt for the project name, template, package manager, and deploy target.

### Flag-driven (agent-friendly, CI-friendly)

```bash
npx create-leanroute-app my-app --template next --pkg pnpm --deploy vercel
```

### Skip all prompts, use defaults

```bash
npx create-leanroute-app my-app --yes
```

Defaults: `--template next`, package manager auto-detected from the invoker (falls back to `npm`), `--deploy vercel`.

## Flags

| Flag               | Values                       | Default                        |
| ------------------ | ---------------------------- | ------------------------------ |
| `--template`, `-t` | `next`, `node`               | `next`                         |
| `--pkg`, `-p`      | `npm`, `pnpm`, `yarn`, `bun` | auto-detected                  |
| `--deploy`, `-d`   | `vercel`, `fly`, `none`      | `vercel` (only used by `next`) |
| `--yes`, `-y`      | (flag)                       | prompt                         |
| `--skip-install`   | (flag)                       | install                        |
| `--skip-git`       | (flag)                       | init git                       |

## What you get

Both templates arrive pre-wired for Leanroute's OpenAI-compatible endpoint (`https://api.leanroute.dev/v1`). You just need to:

1. Sign up at [leanroute.dev](https://leanroute.dev)
2. Mint a runtime key (`gw_live_...`) from the dashboard
3. Drop it in `.env.local` (Next.js) or `.env` (Node)

The scaffolded README in each template walks through the rest.

## License

Apache-2.0. See [LICENSE](./LICENSE).
