/**
 * Minimal flag parser.
 *
 * We deliberately do NOT pull in minimist/yargs/commander. This is a
 * scaffolder; every added dep is a slower `npx` cold-start. The CLI has
 * six flags and one positional (project name), all of which parse in
 * ~20 lines.
 *
 * Grammar accepted:
 *   npx create-leanroute-app [projectName] [--flag value] [-f value] [--boolean]
 *
 * Boolean flags: `--yes`, `--skip-install`, `--skip-git`
 * Value flags:   `--template`, `--pkg`, `--deploy` (+ short aliases -t, -p, -d)
 *
 * Unknown flags are ignored (with a warning printed later by the caller),
 * so future additions do not break clients that pass legacy args. The
 * first non-flag arg is the project name.
 */

export type TemplateName = "next" | "node";
export type PkgManager = "npm" | "pnpm" | "yarn" | "bun";
export type DeployTarget = "vercel" | "fly" | "none";

export interface ParsedFlags {
  /** Positional project name. `null` if the user did not pass one. */
  projectName: string | null;
  /** `--template` / `-t` */
  template: TemplateName | null;
  /** `--pkg` / `-p` */
  pkg: PkgManager | null;
  /** `--deploy` / `-d` */
  deploy: DeployTarget | null;
  /** `--yes` / `-y` — skip all prompts, use defaults for anything missing. */
  yes: boolean;
  /** `--skip-install` — do not run the package manager install after scaffold. */
  skipInstall: boolean;
  /** `--skip-git` — do not `git init` in the new project. */
  skipGit: boolean;
  /** `--help` / `-h` */
  help: boolean;
  /** Unknown flags encountered; caller decides whether to warn or hard-error. */
  unknown: string[];
}

const VALUE_FLAGS: Record<string, keyof ParsedFlags> = {
  "--template": "template",
  "-t": "template",
  "--pkg": "pkg",
  "-p": "pkg",
  "--deploy": "deploy",
  "-d": "deploy",
};

const BOOL_FLAGS: Record<string, keyof ParsedFlags> = {
  "--yes": "yes",
  "-y": "yes",
  "--skip-install": "skipInstall",
  "--skip-git": "skipGit",
  "--help": "help",
  "-h": "help",
};

export function parseFlags(argv: string[]): ParsedFlags {
  const out: ParsedFlags = {
    projectName: null,
    template: null,
    pkg: null,
    deploy: null,
    yes: false,
    skipInstall: false,
    skipGit: false,
    help: false,
    unknown: [],
  };

  // argv here is process.argv.slice(2) — no node binary or script path.
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;

    // --flag=value form (single token). Split and re-inject the value so
    // the same code path handles both `--template=next` and `--template next`.
    const eqIdx = arg.indexOf("=");
    let flagPart = arg;
    let inlineValue: string | undefined;
    if (arg.startsWith("--") && eqIdx > 2) {
      flagPart = arg.slice(0, eqIdx);
      inlineValue = arg.slice(eqIdx + 1);
    }

    if (flagPart in BOOL_FLAGS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[BOOL_FLAGS[flagPart]!] = true;
      continue;
    }

    if (flagPart in VALUE_FLAGS) {
      const key = VALUE_FLAGS[flagPart]!;
      const next = inlineValue ?? argv[i + 1];
      if (next === undefined || next.startsWith("-")) {
        // Missing value. Caller (index.ts) will re-prompt or hard-error
        // depending on --yes. Recorded as unknown for the warning line.
        out.unknown.push(`${flagPart} (missing value)`);
        continue;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (out as any)[key] = next as string;
      if (inlineValue === undefined) i++; // consume the value token
      continue;
    }

    if (arg.startsWith("-")) {
      out.unknown.push(arg);
      continue;
    }

    // First positional wins as project name.
    if (out.projectName === null) {
      out.projectName = arg;
      continue;
    }

    // Extra positional. Silently ignore rather than hard-error so a
    // typo like `create-leanroute-app my-app extra-arg` still runs.
    out.unknown.push(arg);
  }

  // Runtime validate the enum flags.
  if (out.template !== null && !isTemplate(out.template)) {
    out.unknown.push(`--template=${out.template} (must be next|node)`);
    out.template = null;
  }
  if (out.pkg !== null && !isPkgManager(out.pkg)) {
    out.unknown.push(`--pkg=${out.pkg} (must be npm|pnpm|yarn|bun)`);
    out.pkg = null;
  }
  if (out.deploy !== null && !isDeployTarget(out.deploy)) {
    out.unknown.push(`--deploy=${out.deploy} (must be vercel|fly|none)`);
    out.deploy = null;
  }

  return out;
}

function isTemplate(v: string): v is TemplateName {
  return v === "next" || v === "node";
}
function isPkgManager(v: string): v is PkgManager {
  return v === "npm" || v === "pnpm" || v === "yarn" || v === "bun";
}
function isDeployTarget(v: string): v is DeployTarget {
  return v === "vercel" || v === "fly" || v === "none";
}
