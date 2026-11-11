/**
 * Shared OpenAI SDK client pointed at Leanroute.
 *
 * All three example scripts import from here so the endpoint + key
 * configuration lives in one place. If you change the base URL or key,
 * you change it here.
 *
 * Leanroute speaks the OpenAI wire format on /v1, so the vanilla `openai`
 * SDK works with zero adapters. You just override `baseURL`.
 */

import OpenAI from "openai";

const apiKey = process.env.LEANROUTE_API_KEY;
if (!apiKey) {
  throw new Error(
    "LEANROUTE_API_KEY is not set. Copy .env.example to .env and paste your runtime key.",
  );
}

export const leanroute = new OpenAI({
  apiKey,
  baseURL: process.env.LEANROUTE_BASE_URL ?? "https://api.leanroute.dev/v1",
});
