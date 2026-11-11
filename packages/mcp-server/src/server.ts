/**
 * MCP server bootstrap. Wires the tools defined in ./tools.ts to the
 * MCP SDK's Server + stdio transport.
 *
 * We use stdio because that's what every MCP client (Claude Desktop,
 * Claude Code, Cursor, Windsurf, Cline) speaks by default. HTTP/SSE
 * transport can be added later if we want a hosted variant.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { LeanrouteClient } from "./client.js";
import { makeTools } from "./tools.js";

export interface StartOptions {
  adminKey: string;
  runtimeKey?: string;
  baseUrl?: string;
}

export async function startServer(opts: StartOptions): Promise<void> {
  const client = new LeanrouteClient(opts);
  const tools = makeTools();
  const toolByName = new Map(tools.map((t) => [t.name, t]));

  const server = new Server(
    {
      name: "leanroute",
      version: "0.1.4",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    // The SDK's inferred type for `req.params` includes `name: string`
    // and an optional `arguments` field, but the exact shape varies
    // across SDK versions. Narrow to the fields we actually read.
    const params = req.params as { name: string; arguments?: unknown };
    const tool = toolByName.get(params.name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: "text", text: `unknown_tool: ${params.name}` }],
      };
    }
    try {
      const result = await tool.handler(params.arguments ?? {}, client);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        isError: true,
        content: [{ type: "text", text: message }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
