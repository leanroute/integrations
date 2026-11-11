/**
 * Interactive prompts, wrapping @clack/prompts.
 *
 * Every function here returns the resolved value OR throws a special
 * `PromptCancelled` if the user hit Ctrl-C. index.ts catches it and
 * exits with a friendly "cancelled" message instead of a raw stacktrace.
 *
 * We wrap @clack rather than call it directly because:
 *   1. Its `isCancel(sym)` sentinel is easy to forget on every call.
 *   2. Wrapping lets us mock these functions in tests later without
 *      touching @clack's internals.
 *   3. Keeps our own defaults in one place instead of scattered across
 *      call sites in index.ts.
 */

import { text, select, isCancel, cancel } from "@clack/prompts";
import type { TemplateName, PkgManager, DeployTarget } from "./flags.js";

export class PromptCancelled extends Error {
  constructor() {
    super("prompt_cancelled");
    this.name = "PromptCancelled";
  }
}

function bailIfCancelled<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Cancelled. Nothing was created.");
    throw new PromptCancelled();
  }
  return value as T;
}

// Basic project-name validator. Matches npm's package-name rules loosely
// enough to catch obvious mistakes while staying friendly. If npm rejects
// the name later, `npm install` will produce a clear error — no need to
// re-implement all of validate-npm-package-name here.
function validateProjectName(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "Project name cannot be empty.";
  if (trimmed.length > 214) return "Project name is too long (max 214 chars).";
  if (/[A-Z]/.test(trimmed)) return "Project name must be lowercase.";
  if (/[^a-z0-9_.-]/.test(trimmed)) {
    return "Project name may only contain lowercase letters, digits, -, _, and .";
  }
  if (trimmed.startsWith(".") || trimmed.startsWith("_")) {
    return "Project name cannot start with . or _";
  }
  return undefined;
}

export async function askProjectName(defaultValue = "my-leanroute-app"): Promise<string> {
  const raw = await text({
    message: "What's your project name?",
    placeholder: defaultValue,
    defaultValue,
    validate: validateProjectName,
  });
  return bailIfCancelled(raw);
}

export async function askTemplate(defaultValue: TemplateName = "next"): Promise<TemplateName> {
  const raw = await select({
    message: "Which template?",
    initialValue: defaultValue,
    options: [
      {
        value: "next" as const,
        label: "Next.js chat app",
        hint: "streaming, model picker, cost display, deploys to Vercel",
      },
      {
        value: "node" as const,
        label: "Node.js CLI starter",
        hint: "OpenAI SDK pre-configured, three example scripts",
      },
    ],
  });
  return bailIfCancelled(raw);
}

export async function askPkgManager(defaultValue: PkgManager = "npm"): Promise<PkgManager> {
  const raw = await select({
    message: "Which package manager?",
    initialValue: defaultValue,
    options: [
      { value: "npm" as const, label: "npm" },
      { value: "pnpm" as const, label: "pnpm" },
      { value: "yarn" as const, label: "yarn" },
      { value: "bun" as const, label: "bun" },
    ],
  });
  return bailIfCancelled(raw);
}

export async function askDeployTarget(
  defaultValue: DeployTarget = "vercel",
): Promise<DeployTarget> {
  const raw = await select({
    message: "Deploy target? (only used by the Next.js template)",
    initialValue: defaultValue,
    options: [
      {
        value: "vercel" as const,
        label: "Vercel",
        hint: "one-click deploy, vercel.json included",
      },
      { value: "fly" as const, label: "Fly.io", hint: "Dockerfile + fly.toml" },
      { value: "none" as const, label: "None", hint: "README explains options" },
    ],
  });
  return bailIfCancelled(raw);
}
