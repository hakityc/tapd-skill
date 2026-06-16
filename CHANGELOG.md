# Changelog

## 1.3.0 - 2026-06-16

- Move default branch context storage from `.tapd/context.json` to `$GIT_DIR/tapd-context`.
- Add personal TAPD context cache under `~/.tapd-context/cache` and generated `.tapd/active-context.md`.
- Add branch-name recovery for `tapd-story|task|bug-<id>` branches.
- Add `sync`, `refresh`, `doctor`, `hook`, and `logout` CLI commands.
- Keep legacy `.tapd/context.json` as read-only migration input.

## 1.2.0 - 2026-06-16

- Add a read-only TAPD daily/standup brief workflow.
- Summarize today's tasks, bugs, comments, timesheets, risks, and next work in a concise template.
- Keep the brief independent from Git branch context.

## 1.1.1 - 2026-06-15

- Promote Bug intake to the main MCP workflow.
- Support TAPD Bug bugtrace view URLs.
- Keep all TAPD remote reads and writes behind MCP tools.
- Remove the direct OpenAPI fallback path.

## 1.1.0 - 2026-06-15

- Generate minimal `.tapd/config.json` on first use after base confirmation.
- Keep backward compatibility with `.tapd/project.json`.
- Add Story/Task prong view URL support and workspace mismatch protection.
- Resolve Task intake through its parent Story.
- Add daily development execution and finish workflows.
- Simplify TAPD MCP setup to a personal token.
- Expand CLI integration tests and add GitHub Actions validation.

## 1.0.0 - 2026-06-12

- Publish the sanitized P0 TAPD skill.
- Add branch-level context memory and the bundled `tapd-context` CLI.
