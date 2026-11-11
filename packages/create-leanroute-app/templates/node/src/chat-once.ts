/**
 * One-shot chat completion. Default model is DeepSeek V4 Flash — cheap,
 * fast, flagship-tier quality. Swap the `model` string to route to any
 * of the 13 providers Leanroute supports.
 *
 *   pnpm run chat
 *
 * Every response carries `x-gateway-cost-usd` and `x-gateway-provider`
 * headers so you can see what the request cost and which upstream
 * answered. This example prints both alongside the completion text.
 */

import { leanroute } from "./client.js";

async function main() {
  const model = "deepseek/deepseek-v4-flash";
  const prompt = "In one sentence, why is DeepSeek V4 Flash a good default for a coding gateway?";

  console.log(`\n> ${prompt}\n`);

  // Use raw fetch through the SDK's `withResponse` helper so we can read
  // the x-gateway-* response headers. Regular `.create()` returns just
  // the parsed body, which loses the gateway metadata.
  const { data, response } = await leanroute.chat.completions
    .create({
      model,
      messages: [{ role: "user", content: prompt }],
    })
    .withResponse();

  const answer = data.choices[0]?.message.content ?? "(empty)";
  const provider = response.headers.get("x-gateway-provider") ?? "?";
  const cost = response.headers.get("x-gateway-cost-usd") ?? "?";
  const tokensIn = data.usage?.prompt_tokens ?? 0;
  const tokensOut = data.usage?.completion_tokens ?? 0;

  console.log(answer);
  console.log(
    `\n${dim(`[${model}] provider=${provider} cost=$${cost} in=${tokensIn} out=${tokensOut}`)}`,
  );
}

function dim(s: string): string {
  return `\x1b[2m${s}\x1b[0m`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
