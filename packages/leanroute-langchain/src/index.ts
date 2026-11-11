/**
 * Public entry point for `@leanroute/langchain`.
 *
 * Everything exported here is stable API. Anything not exported here is
 * internal and can change without a major version bump. Keep this file
 * flat and additive.
 */

export { ChatLeanroute } from "./chat.js";
export type { ChatLeanrouteFields, ChatLeanrouteInstance } from "./chat.js";
export type { LeanrouteModelId } from "./models.js";
export { DEFAULT_MODELS } from "./models.js";
export type { GatewayHeaderOptions } from "./gateway-headers.js";
export { agentHeaders, newRunId, CLIENT_ID } from "./agent.js";
export type { AgentOptions } from "./agent.js";
