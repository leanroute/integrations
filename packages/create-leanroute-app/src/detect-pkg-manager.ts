/**
 * Detect which package manager the user invoked us with.
 *
 * npm sets `npm_config_user_agent` on every child process when you run
 * `npm create`, `pnpm create`, `yarn create`, or `bunx`. The format is
 * roughly `pnpm/9.12.0 npm/? node/v22.5.0 darwin arm64`, so we sniff the
 * first slash-separated token.
 *
 * If we cannot detect it (missing env var, unfamiliar prefix), we return
 * null and the caller falls back to prompting or to `npm` as the safe
 * default. Never guess wrong here: running `pnpm install` in a
 * yarn-oriented project confuses lockfiles.
 */

import type { PkgManager } from "./flags.js";

export function detectPkgManager(): PkgManager | null {
  const ua = process.env.npm_config_user_agent;
  if (!ua) return null;

  // The first slash-separated field is always the invoking pm's name.
  //   pnpm/9.12.0 npm/? ...
  //   yarn/1.22.19 npm/? ...
  //   npm/10.5.0 node/v20.11.1 ...
  //   bun/1.1.0 npm/? ...
  const first = ua.split(" ")[0]?.split("/")[0];
  if (!first) return null;

  const norm = first.toLowerCase();
  if (norm === "pnpm" || norm === "npm" || norm === "yarn" || norm === "bun") {
    return norm;
  }
  return null;
}

/**
 * Human-friendly display name — used in prompts/output.
 * (Just returns the pm string today, kept as a fn so we can add versioning
 * or emojis later without touching call sites.)
 */
export function pmDisplayName(pm: PkgManager): string {
  return pm;
}

/**
 * Install command for a given package manager. Returned as [cmd, args[]]
 * so the caller can `execFileSync(cmd, args, ...)` without shell quoting
 * pitfalls. All four managers accept a bare `install` with no args to
 * install from the project's package.json.
 */
export function installCommand(pm: PkgManager): [string, string[]] {
  switch (pm) {
    case "npm":
      return ["npm", ["install"]];
    case "pnpm":
      return ["pnpm", ["install"]];
    case "yarn":
      return ["yarn", ["install"]];
    case "bun":
      return ["bun", ["install"]];
  }
}
