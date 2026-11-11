/**
 * Scaffold a new project from a template directory.
 *
 * What this does, in order:
 *   1. Verify target directory doesn't exist (or is empty). Refuses to
 *      write into a non-empty dir — you don't want a scaffolder blowing
 *      away your work.
 *   2. Recursively copy templates/<name>/ into targetDir.
 *   3. Interpolate `{{projectName}}` and `{{template}}` inside every
 *      copied file. Only touches text files (skips binary by extension).
 *   4. Rename any `_*` files back to their leading-dot form so tooling
 *      like npm doesn't try to interpret them during packaging (e.g.
 *      `_gitignore` → `.gitignore`).
 *
 * We do NOT run `git init` or `npm install` here — those are index.ts's
 * job, keeping scaffold.ts pure I/O so it's easy to test.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the templates root. This has to work in two shapes:
 *   - Published npm package: `dist/scaffold.js` sits alongside `../templates/`.
 *   - Local dev inside the monorepo: `src/scaffold.ts` is one up from
 *     `../templates/` via the same relative walk.
 */
function templatesRoot(): string {
  return path.resolve(HERE, "..", "templates");
}

export interface ScaffoldArgs {
  template: string;
  targetDir: string;
  projectName: string;
  /** Optional replacements beyond projectName/template. */
  extraVars?: Record<string, string>;
}

export async function scaffold(args: ScaffoldArgs): Promise<void> {
  const src = path.join(templatesRoot(), args.template);
  const srcExists = await pathExists(src);
  if (!srcExists) {
    throw new Error(
      `Template "${args.template}" not found at ${src}. Did you build the CLI? (pnpm --filter create-leanroute-app run build)`,
    );
  }

  await ensureEmptyDir(args.targetDir);

  const vars: Record<string, string> = {
    projectName: args.projectName,
    template: args.template,
    ...(args.extraVars ?? {}),
  };

  await copyDir(src, args.targetDir, vars);
}

/**
 * Copy a directory recursively, interpolating placeholders inside text
 * files and renaming `_*` → `.*` on the way. Symlinks are not preserved
 * — we walk with `withFileTypes` and skip anything that isn't a file or
 * directory, so we don't accidentally recreate template maintainer's
 * dev-time symlinks in a user's project.
 */
async function copyDir(src: string, dest: string, vars: Record<string, string>): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() && !entry.isDirectory()) continue;

    const srcPath = path.join(src, entry.name);
    // Rename `_gitignore` → `.gitignore`, `_env.example` → `.env.example`, etc.
    // Only rewrites the leading underscore of the top-level segment; nested
    // dirs starting with _ are untouched (unlikely in a template but explicit
    // guard keeps behavior predictable).
    const destName = entry.name.startsWith("_") ? "." + entry.name.slice(1) : entry.name;
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath, vars);
      continue;
    }

    if (isBinary(entry.name)) {
      await fs.copyFile(srcPath, destPath);
      continue;
    }

    const raw = await fs.readFile(srcPath, "utf8");
    const interpolated = interpolate(raw, vars);
    await fs.writeFile(destPath, interpolated, "utf8");
  }
}

/**
 * Simple mustache-style interpolation: `{{key}}` gets replaced with
 * `vars[key]`. Unknown keys are left as-is so a stray `{{foo}}` in a
 * template shows up in the scaffolded file (loud failure) instead of
 * silently blanking. We deliberately do NOT use a real templating
 * engine — the surface area of "one type of placeholder, no logic" is
 * exactly what we want.
 */
function interpolate(input: string, vars: Record<string, string>): string {
  return input.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return vars[key]!;
    }
    return match;
  });
}

// Extensions we should NOT try to read as UTF-8. Kept as a small allowlist
// of common binary types; the scaffolder is meant for text-heavy JS/TS
// projects, so this list only needs to grow if we ship images or fonts
// in a template.
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".pdf",
  ".zip",
  ".gz",
]);

function isBinary(name: string): boolean {
  const ext = path.extname(name).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureEmptyDir(target: string): Promise<void> {
  const exists = await pathExists(target);
  if (!exists) {
    await fs.mkdir(target, { recursive: true });
    return;
  }
  const entries = await fs.readdir(target);
  if (entries.length > 0) {
    throw new Error(
      `Target directory "${target}" already exists and is not empty. Delete it or pick a different name.`,
    );
  }
}
