/**
 * Public entry for `@leanroute/vercel-ai-sdk`.
 *
 * Stable surface: `leanroute` (default provider), `createLeanroute`
 * (factory), the model id union, and the gateway options type. Anything
 * not exported here is internal.
 */

export { createLeanroute, leanroute } from "./provider.js";
export type { CreateLeanrouteOptions } from "./provider.js";
export type { LeanrouteModelId } from "./models.js";
export { DEFAULT_MODELS } from "./models.js";
export type { GatewayHeaderOptions } from "./gateway-headers.js";
export { agentHeaders, newRunId, CLIENT_ID } from "./agent.js";
export type { AgentOptions } from "./agent.js";
