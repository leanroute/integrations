/**
 * Public exports of @leanroute/mcp-server.
 *
 * The typical consumer is a shell command (`npx @leanroute/mcp-server`)
 * launched by an MCP client such as Claude Code. Programmatic use is
 * also supported — you can construct your own server elsewhere.
 */

export { LeanrouteClient, type ClientOptions } from "./client.js";
export { makeTools, type ToolDef } from "./tools.js";
export { startServer, type StartOptions } from "./server.js";
