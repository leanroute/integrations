"use client";

/**
 * Chat playground. Streaming, model picker, cost display.
 *
 * State model is deliberately simple: a single `messages[]` array grows
 * as the user sends and the assistant responds. Streaming appends to
 * the last assistant message as SSE frames arrive. Gateway metadata
 * (provider, cache-hit, usage) is captured off the SSE `meta` and
 * `usage` events and shown under each response.
 *
 * Rip and replace with your own chat UI — the point of this file is
 * to show the wire pattern for talking to /api/chat, not to be a
 * production-grade chat app.
 */

import { useEffect, useRef, useState } from "react";
import { MODELS, DEFAULT_MODEL, type ModelOption } from "@/lib/models";

interface Msg {
  role: "user" | "assistant";
  content: string;
  meta?: { provider?: string; cacheHit?: string; tokensIn?: number; tokensOut?: number; model?: string };
}

export default function Home() {
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const prompt = input.trim();
    if (!prompt || streaming) return;
    setError(null);
    setInput("");

    const nextMessages: Msg[] = [
      ...messages,
      { role: "user", content: prompt },
      { role: "assistant", content: "" },
    ];
    setMessages(nextMessages);
    setStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: nextMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.text();
        setError(`Request failed: ${res.status}. ${body.slice(0, 200)}`);
        setStreaming(false);
        return;
      }

      // Naive SSE parser. Fine for the starter — trades handling of
      // multi-line data payloads for readability. If you send messages
      // large enough to have embedded newlines in the delta, upgrade
      // to a stateful parser or the `eventsource-parser` package.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let lastMeta: Msg["meta"] = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const lines = frame.split("\n");
          let event = "message";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr += line.slice(6);
          }
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (event === "message" || event === "") {
              const delta: string = data.delta ?? "";
              if (delta) {
                setMessages((prev) => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === "assistant") {
                    copy[copy.length - 1] = { ...last, content: last.content + delta };
                  }
                  return copy;
                });
              }
            } else if (event === "meta") {
              lastMeta = { ...lastMeta, provider: data.provider, cacheHit: data.cacheHit, model: data.model };
            } else if (event === "usage") {
              lastMeta = { ...lastMeta, tokensIn: data.tokensIn, tokensOut: data.tokensOut };
            } else if (event === "error") {
              setError(data.message ?? "Streaming error.");
            }
          } catch {
            // Malformed frame — ignore and keep going.
          }
        }
      }

      // Stamp the accumulated metadata onto the last assistant message.
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = { ...last, meta: lastMeta };
        }
        return copy;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStreaming(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>{"{{projectName}}"}</h1>
        <span className="brand">Leanroute</span>
      </header>

      <div className="model-picker">
        {MODELS.map((m: ModelOption) => (
          <button
            key={m.id}
            className={`model-chip ${m.id === model ? "active" : ""}`}
            onClick={() => setModel(m.id)}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty">
            Pick a model above and ask a question. Streaming answers appear here with cost + provider metadata.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
            {m.role === "assistant" && m.meta && (m.meta.provider || m.meta.tokensIn) && (
              <div className="meta">
                {m.meta.model ?? model} · provider={m.meta.provider ?? "?"} · in={m.meta.tokensIn ?? 0} out={m.meta.tokensOut ?? 0}
                {m.meta.cacheHit === "true" && " · cache-hit"}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="compose">
        <div className="compose-inner">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask anything. Enter to send, Shift+Enter for a newline."
            disabled={streaming}
            rows={2}
          />
          <button onClick={send} disabled={streaming || input.trim().length === 0}>
            {streaming ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
