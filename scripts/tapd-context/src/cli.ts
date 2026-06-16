#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildBranchName } from "./branch-name.js";
import {
  candidatePublicContext,
  currentCandidateJson,
  currentCandidateMarkdown,
  renderActiveContext,
} from "./format.js";
import {
  assertBaseBranch,
  assertCleanWorktree,
  branchExists,
  createAndSwitchBranch,
  detectBaseCandidates,
  getCurrentBranch,
  getGitCommonDir,
  getGitDir,
  getGitPath,
  getHeadCommit,
  getRepoRoot,
  isPathIgnored,
  switchBranch,
  tryRestoreBranch,
} from "./git.js";
import { candidateFromExplicitInput, persistCandidate, resolveCurrent } from "./resolver.js";
import {
  CliError,
  defaultProjectConfig,
  ProjectConfig,
  WorkItemInput,
} from "./schema.js";
import {
  ACTIVE_CONTEXT_FILE,
  CONFIG_FILE,
  getCredentialsStatus,
  LEGACY_PROJECT_FILE,
  readContextStore,
  readGitBranchBinding,
  readProject,
  logoutCredentials,
  writeActiveContext,
  writeProject,
} from "./store.js";
import { parseInput } from "./tapd-url.js";

interface ParsedArgs {
  command: string;
  positionals: string[];
  options: Record<string, string | boolean>;
}

const GITIGNORE_SUGGESTION = [
  ".tapd/config.json",
  ".tapd/project.json",
  ".tapd/context.json",
  ".tapd/active-context.md",
  ".tapd/logs/",
];

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rest] = argv;
  const options: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    if (["force", "current-branch", "silent", "on-checkout"].includes(key)) {
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
  return { command, positionals, options };
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
    "tapd-context init --base <branch> [--workspace <id>] [--user <nick>] [--force]",
    "tapd-context configure [--user <nick>] [--base <branch>] [--workspace <id>]",
    "tapd-context start --input <context-json-or-url> [--slug <slug>]",
    "tapd-context bind --input <context-json-or-url> [--force]",
    "tapd-context current [--format json|markdown]",
    "tapd-context status",
    "tapd-context sync --current-branch [--silent]",
    "tapd-context refresh",
    "tapd-context doctor",
    "tapd-context hook install|uninstall|status",
    "tapd-context logout",
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

function init(repoRoot: string, args: ParsedArgs): void {
  const user = optionString(args.options, "user");
  const base = optionString(args.options, "base");
  const workspace = optionString(args.options, "workspace");
  if (!base) {
    throw new CliError(
      "INVALID_ARGUMENT",
      "init 必须显式提供已确认的 --base；--workspace 和 --user 可选。",
      { candidates: detectBaseCandidates(repoRoot) },
    );
  }
  assertBaseBranch(repoRoot, base);

  const configPath = join(repoRoot, CONFIG_FILE);
  const legacyPath = join(repoRoot, LEGACY_PROJECT_FILE);
  if (
    (existsSync(configPath) || existsSync(legacyPath)) &&
    args.options.force !== true
  ) {
    throw new CliError(
      "PROJECT_ALREADY_INITIALIZED",
      "TAPD 项目配置已存在；如确认迁移或覆盖请传 --force。",
    );
  }

  writeProject(repoRoot, defaultProjectConfig(base, workspace, user));
  printJson({
    ok: true,
    action: "init",
    config_file: CONFIG_FILE,
    base_branch: base,
    ...(workspace ? { workspace_id: workspace } : {}),
    ...(user ? { user_nick: user } : {}),
    gitignore_suggestion: GITIGNORE_SUGGESTION,
  });
}

function configure(repoRoot: string, args: ParsedArgs): void {
  const project = readProject(repoRoot);
  const user = optionString(args.options, "user");
  const base = optionString(args.options, "base");
  const workspace = optionString(args.options, "workspace");
  if (!user && !base && !workspace) {
    throw new CliError(
      "INVALID_ARGUMENT",
      "configure 至少需要 --user、--base 或 --workspace 中的一项。",
    );
  }
  if (base) {
    assertBaseBranch(repoRoot, base);
    project.base_branch = base;
  }
  if (workspace) {
    project.workspace_id = workspace;
  }
  if (user) {
    project.user_nick = user;
  }
  writeProject(repoRoot, project);
  printJson({
    ok: true,
    action: "configure",
    config_file: CONFIG_FILE,
    base_branch: project.base_branch,
    ...(project.workspace_id ? { workspace_id: project.workspace_id } : {}),
    ...(project.user_nick ? { user_nick: project.user_nick } : {}),
    migrated_from_legacy: existsSync(join(repoRoot, LEGACY_PROJECT_FILE)),
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

function applyProjectWorkspace(project: ProjectConfig, item: WorkItemInput): void {
  if (project.workspace_id && item.workspace_id) {
    if (project.workspace_id !== item.workspace_id) {
      throw new CliError(
        "WORKSPACE_MISMATCH",
        "输入工作项与项目配置属于不同 TAPD workspace。",
        {
          configured_workspace_id: project.workspace_id,
          input_workspace_id: item.workspace_id,
        },
      );
    }
    return;
  }
  if (!item.workspace_id && project.workspace_id) {
    item.workspace_id = project.workspace_id;
  }
}

function explicitSource(input: string): "explicit-url" | "explicit-json" {
  return /^https?:\/\//i.test(input.trim()) ? "explicit-url" : "explicit-json";
}

function persistAndRenderCurrent(
  repoRoot: string,
  candidate: ReturnType<typeof candidateFromExplicitInput>,
  method: "start" | "bind",
): void {
  persistCandidate(repoRoot, candidate, method);
  writeActiveContext(repoRoot, renderActiveContext(candidate));
}

function start(repoRoot: string, args: ParsedArgs): void {
  const originalBranch = getCurrentBranch(repoRoot);
  const input = optionString(args.options, "input");
  if (!input) {
    throw new CliError("INVALID_ARGUMENT", "start 必须提供 --input。");
  }
  const item = parseInput(input);
  let project: ProjectConfig;
  try {
    project = readProject(repoRoot);
  } catch (error) {
    if (error instanceof CliError && error.code === "PROJECT_NOT_INITIALIZED") {
      throw new CliError(error.code, error.message, {
        candidates: detectBaseCandidates(repoRoot),
        ...(item.workspace_id ? { workspace_id: item.workspace_id } : {}),
      });
    }
    throw error;
  }
  applyProjectWorkspace(project, item);

  assertCleanWorktree(repoRoot);
  assertBaseBranch(repoRoot, project.base_branch);

  const desired = buildBranchName(
    project,
    item,
    optionString(args.options, "slug") || undefined,
    new Date(),
  );
  const newBranch = uniqueBranchName(repoRoot, desired);
  let createdFromCommit = "";

  try {
    switchBranch(repoRoot, project.base_branch);
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

  const candidate = candidateFromExplicitInput(
    newBranch,
    item,
    explicitSource(input),
    "start",
    project.base_branch,
    project.base_branch,
    createdFromCommit,
  );

  try {
    persistAndRenderCurrent(repoRoot, candidate, "start");
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
    context: candidatePublicContext(candidate),
    based_on: {
      branch: project.base_branch,
      commit: createdFromCommit,
      note: "新分支基于本地 base_branch 当前 HEAD 创建；如需远端最新内容，请先手动更新 base 分支。",
    },
    storage: {
      binding: "$GIT_DIR/tapd-context",
      cache: "~/.tapd-context/cache",
      active_context: ACTIVE_CONTEXT_FILE,
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
  applyProjectWorkspace(project, item);
  const existing = readGitBranchBinding(repoRoot, branch);
  const legacy = existing ? undefined : readContextStore(repoRoot).branches[branch];
  if ((existing || legacy) && args.options.force !== true) {
    throw new CliError(
      "CONTEXT_ALREADY_BOUND",
      "当前分支已有上下文绑定；如确认覆盖请传 --force。",
      {
        branch,
        existing_work_item: {
          entity_type: existing?.entity_type || legacy?.work_item.entity_type,
          id: existing?.id || legacy?.work_item.id,
          title: legacy?.work_item.title,
        },
        source: existing ? "$GIT_DIR/tapd-context" : ".tapd/context.json",
      },
    );
  }

  const candidate = candidateFromExplicitInput(
    branch,
    item,
    explicitSource(input),
    "bind",
    project.base_branch,
    branch,
    getHeadCommit(repoRoot),
  );
  persistAndRenderCurrent(repoRoot, candidate, "bind");
  printJson({
    ok: true,
    action: "bind",
    branch,
    context: candidatePublicContext(candidate),
    storage: {
      binding: "$GIT_DIR/tapd-context",
      cache: "~/.tapd-context/cache",
      active_context: ACTIVE_CONTEXT_FILE,
    },
    gitignore_suggestion: GITIGNORE_SUGGESTION,
  });
}

function current(repoRoot: string, args: ParsedArgs): void {
  const resolved = resolveCurrent(repoRoot);
  writeActiveContext(repoRoot, renderActiveContext(resolved.candidate));
  const format = optionString(args.options, "format") || "json";
  if (format === "markdown") {
    process.stdout.write(`${currentCandidateMarkdown(resolved.candidate)}\n`);
    return;
  }
  if (format !== "json") {
    throw new CliError("INVALID_ARGUMENT", "--format 仅支持 json 或 markdown。");
  }
  printJson(
    currentCandidateJson(
      resolved.branch,
      resolved.candidate,
      resolved.migrated_legacy,
    ),
  );
}

function sync(repoRoot: string, args: ParsedArgs): void {
  if (args.options["current-branch"] !== true && args.command === "sync") {
    throw new CliError("INVALID_ARGUMENT", "sync 第一版仅支持 --current-branch。");
  }
  const resolved = resolveCurrent(repoRoot);
  writeActiveContext(repoRoot, renderActiveContext(resolved.candidate));
  if (args.options.silent === true) {
    return;
  }
  printJson({
    ...currentCandidateJson(
      resolved.branch,
      resolved.candidate,
      resolved.migrated_legacy,
    ),
    action: args.command === "refresh" ? "refresh" : "sync",
    active_context: ACTIVE_CONTEXT_FILE,
    offline_fallback: resolved.candidate.confidence < 90,
  });
}

function doctor(repoRoot: string): void {
  const credentials = getCredentialsStatus();
  let currentResult: Record<string, unknown>;
  try {
    const resolved = resolveCurrent(repoRoot);
    currentResult = {
      ok: true,
      branch: resolved.branch,
      source: resolved.candidate.source,
      confidence: resolved.candidate.confidence,
      context_id: resolved.candidate.contextId,
    };
  } catch (error) {
    const cliError =
      error instanceof CliError
        ? error
        : new CliError("UNEXPECTED_ERROR", String(error));
    currentResult = {
      ok: false,
      error: {
        code: cliError.code,
        message: cliError.message,
      },
    };
  }
  printJson({
    ok: true,
    action: "doctor",
    git: {
      repo_root: repoRoot,
      git_dir: getGitDir(repoRoot),
      git_common_dir: getGitCommonDir(repoRoot),
    },
    project_config: {
      path: CONFIG_FILE,
      exists: existsSync(join(repoRoot, CONFIG_FILE)),
    },
    active_context: {
      ...activeContextStatus(repoRoot),
      recommendation: "请确保 .tapd/active-context.md 已加入 .gitignore。",
    },
    credentials,
    hook: hookStatus(repoRoot),
    current: currentResult,
  });
}

function activeContextStatus(repoRoot: string): Record<string, unknown> {
  const path = join(repoRoot, ACTIVE_CONTEXT_FILE);
  const exists = existsSync(path);
  const status: Record<string, unknown> = {
    path: ACTIVE_CONTEXT_FILE,
    exists,
    gitignored: isPathIgnored(repoRoot, ACTIVE_CONTEXT_FILE),
  };
  if (!exists) {
    return status;
  }
  const content = readFileSync(path, "utf8");
  const branch = content.match(/^branch:\s*(.+)$/m)?.[1]?.trim();
  if (branch) {
    status.metadata_branch = branch;
    try {
      const currentBranch = getCurrentBranch(repoRoot);
      status.current_branch = currentBranch;
      status.stale = currentBranch !== branch;
    } catch {
      status.stale = true;
    }
  }
  return status;
}

const HOOK_BEGIN = "# tapd-context managed block begin";
const HOOK_END = "# tapd-context managed block end";
const HOOK_BLOCK = `${HOOK_BEGIN}
tapd-context sync --silent --current-branch --on-checkout || true
${HOOK_END}`;

function hookPath(repoRoot: string): string {
  return getGitPath(repoRoot, "hooks/post-checkout");
}

function hookStatus(repoRoot: string): Record<string, unknown> {
  const path = hookPath(repoRoot);
  if (!existsSync(path)) {
    return {
      path,
      installed: false,
      managed_block: false,
    };
  }
  const content = readFileSync(path, "utf8");
  return {
    path,
    installed: content.includes(HOOK_BEGIN) && content.includes(HOOK_END),
    managed_block: content.includes(HOOK_BEGIN) && content.includes(HOOK_END),
  };
}

function installHook(repoRoot: string): void {
  const path = hookPath(repoRoot);
  mkdirSync(dirname(path), { recursive: true });
  const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (existing.includes(HOOK_BEGIN)) {
    printJson({ ok: true, action: "hook install", hook: hookStatus(repoRoot) });
    return;
  }
  const prefix = existing.trim()
    ? existing.trimEnd()
    : "#!/bin/sh";
  writeFileSync(path, `${prefix}\n\n${HOOK_BLOCK}\n`, { mode: 0o755 });
  printJson({
    ok: true,
    action: "hook install",
    hook: hookStatus(repoRoot),
    note: "hook 失败不会阻塞 git checkout；如已有复杂 hook，请人工确认 managed block 位置。",
  });
}

function uninstallHook(repoRoot: string): void {
  const path = hookPath(repoRoot);
  if (!existsSync(path)) {
    printJson({ ok: true, action: "hook uninstall", hook: hookStatus(repoRoot) });
    return;
  }
  const content = readFileSync(path, "utf8");
  const pattern = new RegExp(`\\n?${HOOK_BEGIN}[\\s\\S]*?${HOOK_END}\\n?`, "m");
  writeFileSync(path, content.replace(pattern, "\n").trimEnd() + "\n", {
    mode: 0o755,
  });
  printJson({ ok: true, action: "hook uninstall", hook: hookStatus(repoRoot) });
}

function hook(repoRoot: string, args: ParsedArgs): void {
  const subcommand = args.positionals[0] || "status";
  if (subcommand === "install") {
    installHook(repoRoot);
    return;
  }
  if (subcommand === "uninstall") {
    uninstallHook(repoRoot);
    return;
  }
  if (subcommand === "status") {
    printJson({ ok: true, action: "hook status", hook: hookStatus(repoRoot) });
    return;
  }
  throw new CliError("INVALID_ARGUMENT", "hook 仅支持 install、uninstall 或 status。");
}

function logout(): void {
  const removed = logoutCredentials();
  printJson({
    ok: true,
    action: "logout",
    removed_credentials: removed,
  });
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "--help" || args.command === "-h" || !args.command) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (args.command === "logout") {
    logout();
    return;
  }

  const repoRoot = getRepoRoot(process.cwd());
  switch (args.command) {
    case "init":
      init(repoRoot, args);
      break;
    case "configure":
      configure(repoRoot, args);
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
        positionals: [],
        options: { format: "markdown" },
      });
      break;
    case "sync":
      sync(repoRoot, args);
      break;
    case "refresh":
      sync(repoRoot, { ...args, options: { ...args.options, "current-branch": true } });
      break;
    case "doctor":
      doctor(repoRoot);
      break;
    case "hook":
      hook(repoRoot, args);
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
