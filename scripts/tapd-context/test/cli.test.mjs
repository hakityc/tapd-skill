import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function repo() {
  const cwd = mkdtempSync(join(tmpdir(), "tapd-context-"));
  git(cwd, "init", "-b", "master");
  git(cwd, "config", "user.email", "tapd-context@example.test");
  git(cwd, "config", "user.name", "TAPD Context Test");
  writeFileSync(join(cwd, "README.md"), "test\n");
  git(cwd, "add", "README.md");
  git(cwd, "commit", "-m", "initial");
  return cwd;
}

function run(cwd, ...args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8",
  });
  const output = result.stdout.trim();
  return {
    ...result,
    json: output.startsWith("{") ? JSON.parse(output) : undefined,
  };
}

function input(overrides = {}) {
  return JSON.stringify({
    source: "tapd",
    entity_type: "Story",
    id: "1112345678000000001",
    short_id: "1302826",
    title: "order-approval-risk-flag",
    url: "https://www.tapd.cn/tapd_fe/12345678/story/detail/1112345678000000001",
    user_nick: "开发者A",
    ...overrides,
  });
}

test("init, start, current and status form the P0 happy path", () => {
  const cwd = repo();
  const initialized = run(cwd, "init", "--user", "开发者A", "--base", "master");
  assert.equal(initialized.status, 0);
  assert.equal(initialized.json.ok, true);

  const started = run(cwd, "start", "--input", input());
  assert.equal(started.status, 0);
  assert.match(started.json.branch, /^feat\/\d{6}\/order-approval-risk-flag$/);
  assert.equal(started.json.context.binding.method, "start");
  assert.equal(started.json.context.status.local_phase, "initialized");
  assert.equal(started.json.context.status.progress, undefined);
  assert.match(started.json.based_on.note, /本地 base_branch 当前 HEAD/);

  const current = run(cwd, "current", "--format", "json");
  assert.equal(current.status, 0);
  assert.equal(current.json.context.work_item.id, "1112345678000000001");
  assert.equal(current.stdout.includes("raw"), false);

  const status = run(cwd, "status");
  assert.equal(status.status, 0);
  assert.match(status.stdout, /当前分支：feat\//);
  assert.equal(status.stdout.includes("raw"), false);
});

test("dirty check ignores only generated local state paths", () => {
  const cwd = repo();
  assert.equal(run(cwd, "init", "--user", "开发者A", "--base", "master").status, 0);

  mkdirSync(join(cwd, ".tapd", "logs"), { recursive: true });
  writeFileSync(join(cwd, ".tapd", "logs", "run.log"), "local log\n");
  assert.equal(run(cwd, "start", "--input", input()).status, 0);

  git(cwd, "switch", "master");
  writeFileSync(join(cwd, ".tapd", "README.md"), "must remain visible\n");
  const blocked = run(cwd, "start", "--input", input({ id: "2", short_id: "2" }));
  assert.equal(blocked.status, 1);
  assert.equal(blocked.json.error.code, "WORKTREE_NOT_CLEAN");
  assert.match(JSON.stringify(blocked.json.error.details), /\.tapd\/README\.md/);
});

test("bind refuses overwrite unless force is explicit", () => {
  const cwd = repo();
  run(cwd, "init", "--user", "开发者A", "--base", "master");
  const first = run(cwd, "bind", "--input", input());
  assert.equal(first.status, 0);
  assert.equal(first.json.context.binding.method, "bind");
  assert.equal(first.json.context.status.local_phase, "initialized");

  const replacement = input({
    id: "99",
    url: "https://www.tapd.cn/tapd_fe/12345678/story/detail/99",
  });
  const conflict = run(cwd, "bind", "--input", replacement);
  assert.equal(conflict.status, 1);
  assert.equal(conflict.json.error.code, "CONTEXT_ALREADY_BOUND");

  const forced = run(cwd, "bind", "--input", replacement, "--force");
  assert.equal(forced.status, 0);
  assert.equal(forced.json.context.work_item.id, "99");
});

test("branch collisions append numeric suffixes", () => {
  const cwd = repo();
  run(cwd, "init", "--user", "开发者A", "--base", "master");
  const first = run(cwd, "start", "--input", input());
  assert.equal(first.status, 0);
  git(cwd, "switch", "master");
  const second = run(cwd, "start", "--input", input());
  assert.equal(second.status, 0);
  assert.equal(second.json.branch, `${first.json.branch}-2`);
});

test("current returns stable errors for missing, invalid and detached context", () => {
  const cwd = repo();
  const missing = run(cwd, "current");
  assert.equal(missing.json.error.code, "CONTEXT_NOT_FOUND");

  mkdirSync(join(cwd, ".tapd"), { recursive: true });
  writeFileSync(join(cwd, ".tapd", "context.json"), "{bad");
  const invalid = run(cwd, "current");
  assert.equal(invalid.json.error.code, "INVALID_CONTEXT_FILE");

  git(cwd, "checkout", "--detach");
  const detached = run(cwd, "current");
  assert.equal(detached.json.error.code, "DETACHED_HEAD");
});

test("start reports project initialization and standard URL compatibility", () => {
  const cwd = repo();
  const uninitialized = run(cwd, "start", "--input", input());
  assert.equal(uninitialized.json.error.code, "PROJECT_NOT_INITIALIZED");

  run(cwd, "init", "--user", "开发者A", "--base", "master");
  const started = run(
    cwd,
    "start",
    "--input",
    "https://tapd.example.test/tapd_fe/12345678/task/detail/1112345678000000002",
  );
  assert.equal(started.status, 0);
  assert.equal(started.json.context.work_item.entity_type, "Task");
  assert.equal(started.json.context.work_item.title, undefined);
  assert.equal(started.json.context.assignee.display_name, "开发者A");
});

test("detect-base returns candidates without writing project config", () => {
  const cwd = repo();
  const detected = run(cwd, "detect-base");
  assert.deepEqual(detected.json.candidates, ["master"]);
  assert.throws(() => readFileSync(join(cwd, ".tapd", "project.json")));
});

test("start restores original branch when branch creation fails", () => {
  const cwd = repo();
  run(cwd, "init", "--user", "开发者A", "--base", "master");
  const projectPath = join(cwd, ".tapd", "project.json");
  const project = JSON.parse(readFileSync(projectPath, "utf8"));
  project.branch.name_template = "invalid..{slug}";
  writeFileSync(projectPath, `${JSON.stringify(project, null, 2)}\n`);

  const failed = run(cwd, "start", "--input", input());
  assert.equal(failed.status, 1);
  assert.equal(failed.json.error.code, "BRANCH_CREATE_FAILED");
  assert.equal(failed.json.error.details.restored, true);
  assert.equal(git(cwd, "branch", "--show-current"), "master");
});
