#!/usr/bin/env node
/**
 * create-leanroute-app — CLI entry point.
 *
 * Runs in three modes based on how the user invoked us:
 *
 *   1. Interactive (default). No flags, or partial flags.
 *      Missing values are collected via @clack/prompts. Example:
 *        $ npx create-leanroute-app
 *
 *   2. Flag-driven. All required values passed as flags.
 *      No prompts, straight to scaffold. Example:
 *        $ npx create-leanroute-app my-app --template next --pkg pnpm
 *
 *   3. Non-interactive (`--yes`). Skip every prompt; use defaults for
 *      any missing value. Designed for CI and agents. Example:
 *        $ npx create-leanroute-app my-app --yes
 *
 * Exit codes:
 *   0  success
 *   1  scaffold failed (I/O error, dep install crashed, etc.)
 *   2  user cancelled (Ctrl-C during a prompt)
 *   64 bad usage (unknown flag with --yes, or invalid enum value)
 */

import path from "node:path";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import color from "picocolors";
import { intro, outro, note, log, spinner } from "@clack/prompts";
import {
  parseFlags,
  type ParsedFlags,
  type TemplateName,
  type PkgManager,
  type DeployTarget,
} from "./flags.js";
import {
  askProjectName,
  askTemplate,
  askPkgManager,
  askDeployTarget,
  PromptCancelled,
} from "./prompts.js";
import { detectPkgManager, installCommand } from "./detect-pkg-manager.js";
import { scaffold } from "./scaffold.js";

const HELP = `
${color.bold("create-leanroute-app")} — scaffold a Leanroute-powered app

${color.bold("Usage")}
  npx create-leanroute-app [projectName] [options]

${color.bold("Options")}
  -t, --template <name>   next | node                (default: next)
  -p, --pkg <name>        npm | pnpm | yarn | bun    (default: auto-detected)
  -d, --deploy <target>   vercel | fly | none        (default: vercel)
  -y, --yes               Skip prompts; use defaults for anything missing
      --skip-install      Don't run <pkg> install after scaffold
      --skip-git          Don't init a git repo in the new project
  -h, --help              Show this help

${color.bold("Examples")}
  ${color.dim("# Interactive")}
  npx create-leanroute-app

  ${color.dim("# Fully specified (agent-friendly)")}
  npx create-leanroute-app my-app --template next --pkg pnpm --deploy vercel

  ${color.dim("# Defaults, no prompts (CI-friendly)")}
  npx create-leanroute-app my-app --yes
`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const flags = parseFlags(argv);

  if (flags.help) {
    process.stdout.write(HELP);
    return;
  }

  // Warn on unknown flags. Under --yes we hard-fail (agents/CI should
  // not have typos silently ignored); interactively we just print a
  // warning so a human can still complete the flow.
  if (flags.unknown.length > 0) {
    for (const u of flags.unknown) {
      log.warn(`Unknown or invalid: ${color.yellow(u)}`);
    }
    if (flags.yes) {
      log.error("Refusing to proceed with --yes and unknown flags.");
      process.exit(64);
    }
  }

  intro(color.cyan(color.bold("create-leanroute-app")));

  try {
    const answers = await gatherAnswers(flags);
    await runScaffold(answers);
    printNextSteps(answers);
    outro(color.green("Done. Happy shipping."));
  } catch (err) {
    if (err instanceof PromptCancelled) {
      process.exit(2);
    }
    const msg = err instanceof Error ? err.message : String(err);
    log.error(msg);
    outro(color.red("Scaffold failed."));
    process.exit(1);
  }
}

interface Answers {
  projectName: string;
  template: TemplateName;
  pkg: PkgManager;
  deploy: DeployTarget;
  skipInstall: boolean;
  skipGit: boolean;
  targetDir: string;
}

async function gatherAnswers(flags: ParsedFlags): Promise<Answers> {
  const detected = detectPkgManager();

  const projectName =
    flags.projectName ?? (flags.yes ? "my-leanroute-app" : await askProjectName());

  const template: TemplateName = flags.template ?? (flags.yes ? "next" : await askTemplate());

  const pkg: PkgManager =
    flags.pkg ?? (flags.yes ? (detected ?? "npm") : await askPkgManager(detected ?? "npm"));

  // Deploy target is only meaningful for the `next` template. For `node`
  // we short-circuit to "none" whether or not the user set --deploy.
  const deploy: DeployTarget =
    template === "node"
      ? "none"
      : (flags.deploy ?? (flags.yes ? "vercel" : await askDeployTarget()));

  const targetDir = path.resolve(process.cwd(), projectName);

  return {
    projectName,
    template,
    pkg,
    deploy,
    skipInstall: flags.skipInstall,
    skipGit: flags.skipGit,
    targetDir,
  };
}

async function runScaffold(answers: Answers): Promise<void> {
  const s = spinner();
  s.start(`Scaffolding ${color.cyan(answers.projectName)}...`);
  await scaffold({
    template: answers.template,
    targetDir: answers.targetDir,
    projectName: answers.projectName,
    extraVars: { deploy: answers.deploy },
  });
  // If the user picked deploy=none on the next template, remove the
  // vercel.json we always copy from templates/next. Keeps the tree
  // clean without a second template variant.
  if (answers.template === "next" && answers.deploy !== "vercel") {
    const vercelJson = path.join(answers.targetDir, "vercel.json");
    await fs.rm(vercelJson, { force: true });
  }
  s.stop("Files copied.");

  if (!answers.skipGit) {
    initGit(answers.targetDir);
  }

  if (!answers.skipInstall) {
    installDeps(answers.targetDir, answers.pkg);
  }
}

function initGit(cwd: string): void {
  const res = spawnSync("git", ["init"], { cwd, stdio: "ignore" });
  if (res.status !== 0) {
    // Non-fatal: user might not have git. Just log and move on.
    log.warn("Could not `git init` — install git to enable, or use --skip-git to silence.");
    return;
  }
  spawnSync("git", ["add", "-A"], { cwd, stdio: "ignore" });
  // Deliberately DON'T `git commit` here. Some environments won't have
  // user.name/user.email configured and the commit will fail. Files are
  // staged; the user can commit when they're ready.
}

function installDeps(cwd: string, pkg: PkgManager): void {
  const [cmd, args] = installCommand(pkg);
  const s = spinner();
  s.start(`Installing dependencies with ${color.cyan(pkg)}...`);
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: "ignore",
    shell: process.platform === "win32", // npm/pnpm on Windows are .cmd shims
  });
  if (res.status !== 0) {
    s.stop(color.yellow(`${pkg} install exited with code ${res.status}. You can retry manually.`));
    return;
  }
  s.stop("Dependencies installed.");
}

function printNextSteps(answers: Answers): void {
  const rel = path.relative(process.cwd(), answers.targetDir) || answers.projectName;
  const devCmd =
    answers.template === "next" ? `${answers.pkg} run dev` : `${answers.pkg} run start`;
  const lines = [
    `${color.bold("1.")} cd ${color.cyan(rel)}`,
    `${color.bold("2.")} Copy ${color.cyan(".env.example")} to ${color.cyan(answers.template === "next" ? ".env.local" : ".env")} and paste your Leanroute key`,
    `${color.bold("3.")} ${color.cyan(devCmd)}`,
    "",
    `Get a key at ${color.underline("https://leanroute.dev/dashboard/keys")}`,
  ];
  note(lines.join("\n"), "Next steps");
}

main();
