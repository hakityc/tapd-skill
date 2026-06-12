#!/usr/bin/env node

import { existsSync } from "node:fs";
import { join } from "node:path";

import { buildBranchName } from "./branch-name.js";
import { currentJson, currentMarkdown, publicContext } from "./format.js";
import {
  assertBaseBranch,
  assertCleanWorktree,
  branchExists,
  createAndSwitchBranch,
  detectBaseCandidates,
  getCurrentBranch,
  getHeadCommit,
  getRepoRoot,
  switchBranch,
  tryRestoreBranch,
} from "./git.js";
import {
  BranchContext,
  CliError,
  defaultProjectConfig,
  WorkItemInput,
} from "./schema.js";
import {
  CONTEXT_FILE,
  PROJECT_FILE,
  readContextStore,
  readProject,
  writeContextStore,
  writeProject,
} from "./store.js";
import { parseInput } from "./tapd-url.js";

interface ParsedArgs {
  command: string;
  options: Record<string, string | boolean>;
}

const GITIGNORE_SUGGESTION = [
  ".tapd/project.json",
  ".tapd/context.json",
  ".tapd/logs/",
];

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rest] = argv;
  const options: Record<string, string | boolean> = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      throw new CliError("INVALID_ARGUMENT", `无法识别参数：${token}`);
    }
    const key = token.slice(2);
    if (key === "force") {
      options[key] = true;
      continue;
    }
    const value = rest[index + 1];
    if (!value || value.startsWith("--")) {
      throw new CliError("INVALID_ARGUMENT", `参数 --${key} 缺少值。`);
    }
    options[key] = value;
    index += 1;
  }
  return { command, options };
}

function optionString(options: ParsedArgs["options"], key: string): string {
  const value = options[key];
  return typeof value === "string" ? value.trim() : "";
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage(): string {
  return [
    "tapd-context init --user <nick> --base <branch> [--force]",
    "tapd-context start --input <context-json-or-url> [--slug <slug>]",
    "tapd-context bind --input <context-json-or-url> [--force]",
    "tapd-context current [--format json|markdown]",
    "tapd-context status",
    "tapd-context detect-base",
  ].join("\n");
}

function uniqueBranchName(repoRoot: string, desired: string): string {
  if (!branchExists(repoRoot, desired)) {
    return desired;
  }
  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const candidate = `${desired}-${suffix}`;
    if (!branchExists(repoRoot, candidate)) {
      return candidate;
    }
  }
  throw new CliError("BRANCH_CREATE_FAILED", "无法生成可用的新分支名。");
}

function makeContext(
  method: "start" | "bind",
  branch: string,
  baseBranch: string,
  sourceBranch: string,
  commit: string,
  item: WorkItemInput,
  displayName: string,
): BranchContext {
  const now = new Date().toISOString();
  return {
    branch,
    created_at: now,
    updated_at: now,
    binding: { method },
    git: {
      base_branch: baseBranch,
      source_branch: sourceBranch,
      created_from_commit: commit,
    },
    work_item: item,
    assignee: {
      display_name: item.user_nick || displayName,
    },
    status: {
      local_phase: "initialized",
      last_synced_at: null,
    },
  };
}

function init(repoRoot: string, args: ParsedArgs): void {
  const user = optionString(args.options, "user");
  const base = optionString(args.options, "base");
  if (!user || !base) {
    throw new CliError(
      "INVALID_ARGUMENT",
      "init 必须显式提供已确认的 --user 和 --base。",
      { candidates: detectBaseCandidates(repoRoot) },
    );
  }
  assertBaseBranch(repoRoot, base);

  const projectPath = join(repoRoot, PROJECT_FILE);
  if (existsSync(projectPath) && args.options.force !== true) {
    throw new CliError(
      "PROJECT_ALREADY_INITIALIZED",
      ".tapd/project.json 已存在；如确认覆盖请传 --force。",
    );
  }

  writeProject(repoRoot, defaultProjectConfig(user, base));
  printJson({
    ok: true,
    action: "init",
    project_file: PROJECT_FILE,
    base_branch: base,
    gitignore_suggestion: GITIGNORE_SUGGESTION,
  });
}

function detectBase(repoRoot: string): void {
  printJson({
    ok: true,
    action: "detect-base",
    candidates: detectBaseCandidates(repoRoot),
  });
}

function start(repoRoot: string, args: ParsedArgs): void {
  const project = readProject(repoRoot);
  const originalBranch = getCurrentBranch(repoRoot);
  const input = optionString(args.options, "input");
  if (!input) {
    throw new CliError("INVALID_ARGUMENT", "start 必须提供 --input。");
  }
  const item = parseInput(input);

  assertCleanWorktree(repoRoot);
  assertBaseBranch(repoRoot, project.git.base_branch);

  const desired = buildBranchName(
    project,
    item,
    optionString(args.options, "slug") || undefined,
    new Date(),
  );
  const newBranch = uniqueBranchName(repoRoot, desired);
  let createdFromCommit = "";

  try {
    switchBranch(repoRoot, project.git.base_branch);
    createdFromCommit = getHeadCommit(repoRoot);
    createAndSwitchBranch(repoRoot, newBranch);
  } catch (error) {
    const restore = tryRestoreBranch(repoRoot, originalBranch);
    if (!restore.restored) {
      throw new CliError(
        "RESTORE_FAILED",
        "创建分支失败，且无法自动恢复原分支。",
        {
          original_branch: originalBranch,
          attempted_branch: newBranch,
          original_error: error instanceof Error ? error.message : String(error),
          restore_error: restore.error,
          manual_recovery: [`git switch ${originalBranch}`, "git status"],
        },
      );
    }
    throw new CliError("BRANCH_CREATE_FAILED", "从 base 分支创建业务分支失败。", {
      original_branch: originalBranch,
      attempted_branch: newBranch,
      cause: error instanceof Error ? error.message : String(error),
      restored: true,
    });
  }

  let store;
  try {
    store = readContextStore(repoRoot);
  } catch (error) {
    const restore = tryRestoreBranch(repoRoot, originalBranch);
    if (!restore.restored) {
      throw new CliError(
        "RESTORE_FAILED",
        "读取上下文失败，且无法自动恢复原分支。",
        {
          original_branch: originalBranch,
          created_branch: newBranch,
          original_error: error instanceof Error ? error.message : String(error),
          restore_error: restore.error,
          manual_recovery: [`git switch ${originalBranch}`, "git status"],
        },
      );
    }
    throw error;
  }
  if (store.branches[newBranch]) {
    const restore = tryRestoreBranch(repoRoot, originalBranch);
    throw new CliError(
      restore.restored ? "CONTEXT_ALREADY_BOUND" : "RESTORE_FAILED",
      "新分支已有上下文绑定。",
      {
        branch: newBranch,
        original_branch: originalBranch,
        restored: restore.restored,
        restore_error: restore.error,
      },
    );
  }

  const context = makeContext(
    "start",
    newBranch,
    project.git.base_branch,
    project.git.base_branch,
    createdFromCommit,
    item,
    project.user.display_name,
  );
  store.branches[newBranch] = context;

  try {
    writeContextStore(repoRoot, store);
  } catch (error) {
    const restore = tryRestoreBranch(repoRoot, originalBranch);
    if (!restore.restored) {
      throw new CliError(
        "RESTORE_FAILED",
        "上下文写入失败，且无法自动恢复原分支。",
        {
          original_branch: originalBranch,
          created_branch: newBranch,
          original_error: error instanceof Error ? error.message : String(error),
          restore_error: restore.error,
          manual_recovery: [
            `git switch ${originalBranch}`,
            "git status",
            `git branch -d ${newBranch}`,
          ],
        },
      );
    }
    throw new CliError("CONTEXT_WRITE_FAILED", "上下文写入失败，已恢复原分支。", {
      original_branch: originalBranch,
      created_branch: newBranch,
      restored: true,
      manual_cleanup: `git branch -d ${newBranch}`,
    });
  }

  printJson({
    ok: true,
    action: "start",
    branch: newBranch,
    context: publicContext(context),
    based_on: {
      branch: project.git.base_branch,
      commit: createdFromCommit,
      note: "新分支基于本地 base_branch 当前 HEAD 创建；如需远端最新内容，请先手动更新 base 分支。",
    },
    gitignore_suggestion: GITIGNORE_SUGGESTION,
  });
}

function bind(repoRoot: string, args: ParsedArgs): void {
  const project = readProject(repoRoot);
  const branch = getCurrentBranch(repoRoot);
  const input = optionString(args.options, "input");
  if (!input) {
    throw new CliError("INVALID_ARGUMENT", "bind 必须提供 --input。");
  }
  const item = parseInput(input);
  const store = readContextStore(repoRoot);
  if (store.branches[branch] && args.options.force !== true) {
    throw new CliError(
      "CONTEXT_ALREADY_BOUND",
      "当前分支已有上下文绑定；如确认覆盖请传 --force。",
      {
        branch,
        existing_work_item: {
          entity_type: store.branches[branch].work_item.entity_type,
          id: store.branches[branch].work_item.id,
          title: store.branches[branch].work_item.title,
        },
      },
    );
  }

  const context = makeContext(
    "bind",
    branch,
    project.git.base_branch,
    branch,
    getHeadCommit(repoRoot),
    item,
    project.user.display_name,
  );
  store.branches[branch] = context;
  writeContextStore(repoRoot, store);
  printJson({
    ok: true,
    action: "bind",
    branch,
    context: publicContext(context),
    gitignore_suggestion: GITIGNORE_SUGGESTION,
  });
}

function current(repoRoot: string, args: ParsedArgs): void {
  const branch = getCurrentBranch(repoRoot);
  const contextPath = join(repoRoot, CONTEXT_FILE);
  if (!existsSync(contextPath)) {
    throw new CliError("CONTEXT_NOT_FOUND", "当前项目尚无 .tapd/context.json。", {
      branch,
    });
  }
  const store = readContextStore(repoRoot);
  const context = store.branches[branch];
  if (!context) {
    throw new CliError("CONTEXT_NOT_FOUND", "当前分支没有 TAPD 上下文绑定。", {
      branch,
    });
  }
  const format = optionString(args.options, "format") || "json";
  if (format === "markdown") {
    process.stdout.write(`${currentMarkdown(branch, context)}\n`);
    return;
  }
  if (format !== "json") {
    throw new CliError("INVALID_ARGUMENT", "--format 仅支持 json 或 markdown。");
  }
  printJson(currentJson(branch, context));
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "--help" || args.command === "-h" || !args.command) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  const repoRoot = getRepoRoot(process.cwd());
  switch (args.command) {
    case "init":
      init(repoRoot, args);
      break;
    case "detect-base":
      detectBase(repoRoot);
      break;
    case "start":
      start(repoRoot, args);
      break;
    case "bind":
      bind(repoRoot, args);
      break;
    case "current":
      current(repoRoot, args);
      break;
    case "status":
      current(repoRoot, {
        command: "current",
        options: { format: "markdown" },
      });
      break;
    default:
      throw new CliError("UNKNOWN_COMMAND", `未知命令：${args.command}`);
  }
}

try {
  main();
} catch (error) {
  const cliError =
    error instanceof CliError
      ? error
      : new CliError(
          "UNEXPECTED_ERROR",
          error instanceof Error ? error.message : String(error),
        );
  printJson({
    ok: false,
    error: {
      code: cliError.code,
      message: cliError.message,
      ...(cliError.details ? { details: cliError.details } : {}),
    },
  });
  process.exitCode = 1;
}
