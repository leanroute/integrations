/**
 * List every model your Leanroute account can dispatch to.
 *
 *   pnpm run list-models
 *
 * Returns whatever /v1/models returns (OpenAI-shaped list), filtered by
 * the provider keys configured on your Leanroute org. Model ids include
 * a provider prefix (e.g. `deepseek/deepseek-v4-flash`,
 * `anthropic/claude-sonnet-5`) so you can dispatch across providers with
 * one client.
 */

import { leanroute } from "./client.js";

async function main() {
  const res = await leanroute.models.list();
  const models = res.data.sort((a, b) => a.id.localeCompare(b.id));
  console.log(`${models.length} models reachable:\n`);
  for (const m of models) {
    console.log(`  ${m.id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
