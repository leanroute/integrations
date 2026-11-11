#!/usr/bin/env node
/**
 * Executable entrypoint — `npx @leanroute/mcp-server` and
 * `leanroute-mcp` both land here.
 *
 * Reads credentials from environment variables:
 *   LEANROUTE_ADMIN_KEY   (required)  gw_admin_*
 *   LEANROUTE_RUNTIME_KEY (optional)  gw_live_* — needed for `route_call`
 *   LEANROUTE_BASE_URL    (optional)  default https://api.leanroute.dev
 *
 * If LEANROUTE_ADMIN_KEY is missing we exit with a friendly message
 * pointing at /dashboard/admin-keys, rather than letting the MCP
 * handshake succeed and every tool call fail with a cryptic error.
 */

import { startServer } from "./server.js";

function main(): void {
  const adminKey = process.env.LEANROUTE_ADMIN_KEY;
  if (!adminKey) {
    process.stderr.write(
      "leanroute-mcp: LEANROUTE_ADMIN_KEY is not set.\n" +
        "  Mint one at https://leanroute.dev/dashboard/admin-keys and add it to your MCP\n" +
        "  client's env config. See https://leanroute.dev/docs/mcp-server for details.\n",
    );
    process.exit(1);
  }
  const runtimeKey = process.env.LEANROUTE_RUNTIME_KEY;
  const baseUrl = process.env.LEANROUTE_BASE_URL;

  startServer({ adminKey, runtimeKey, baseUrl }).catch((err) => {
    process.stderr.write(
      `leanroute-mcp: fatal — ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  });
}

main();
