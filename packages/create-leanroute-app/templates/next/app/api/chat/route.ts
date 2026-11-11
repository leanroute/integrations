/**
 * POST /api/chat — server-side proxy to Leanroute's OpenAI-compatible
 * /v1/chat/completions endpoint.
 *
 * Streams the response back to the browser as Server-Sent Events (SSE)
 * in the same shape OpenAI emits. Also captures the gateway metadata
 * headers (x-gateway-provider, x-gateway-cost-usd, x-gateway-cache-hit)
 * and forwards them so the client can display them alongside the
 * completion.
 *
 * Why the proxy: your LEANROUTE_API_KEY lives on the server. Never
 * ship a runtime key to the browser — even a scoped one with a spend
 * cap is a foot-gun (someone finds it in DevTools and burns your cap).
 * The proxy pattern keeps the key server-side and gives you a single
 * chokepoint to add rate limits, auth, and per-user throttling later.
 */

import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const apiKey = process.env.LEANROUTE_API_KEY;
const baseURL = process.env.LEANROUTE_BASE_URL ?? "https://api.leanroute.dev/v1";

interface ChatRequestBody {
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}

export async function POST(req: Request): Promise<Response> {
  if (!apiKey) {
    return Response.json(
      {
        error: "server_not_configured",
        message:
          "LEANROUTE_API_KEY is not set on the server. Copy .env.example to .env.local and paste your runtime key.",
      },
      { status: 500 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.model || !Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json(
      { error: "invalid_body", message: "model and messages[] are required" },
      { status: 400 },
    );
  }

  const client = new OpenAI({ apiKey, baseURL });

  // Use .withResponse() so we can pluck the x-gateway-* headers off the
  // raw upstream response and re-emit them on our SSE stream. Regular
  // .create() returns just the parsed body and loses the metadata.
  const { data: stream, response } = await client.chat.completions
    .create({
      model: body.model,
      messages: body.messages,
      stream: true,
    })
    .withResponse();

  const provider = response.headers.get("x-gateway-provider") ?? "?";
  const cacheHit = response.headers.get("x-gateway-cache-hit") ?? "false";

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // First frame: gateway metadata (JSON, prefixed so the client can
        // distinguish it from OpenAI-shaped delta chunks).
        controller.enqueue(
          encoder.encode(
            `event: meta\ndata: ${JSON.stringify({ provider, cacheHit, model: body.model })}\n\n`,
          ),
        );

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
            );
          }
          // Usage arrives on the terminal chunk when stream_options.include_usage
          // is set. The OpenAI SDK sets it automatically, but different
          // upstreams format the field slightly differently, so we defensively
          // read whatever's there.
          const usage = (chunk as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage;
          if (usage) {
            controller.enqueue(
              encoder.encode(
                `event: usage\ndata: ${JSON.stringify({
                  tokensIn: usage.prompt_tokens ?? 0,
                  tokensOut: usage.completion_tokens ?? 0,
                })}\n\n`,
              ),
            );
          }
        }

        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message: msg })}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
