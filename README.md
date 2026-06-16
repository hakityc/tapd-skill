# TAPD Skill

A TAPD development workflow skill for AI coding agents. It reads TAPD Story, Task, and Bug items, binds them to Git branch context, and helps with requirement intake, task planning, coding, testing, wrap-up, and concise daily briefs.

[![skills.sh](https://skills.sh/b/hakityc/tapd-skill)](https://skills.sh/hakityc/tapd-skill/tapd)

<!-- README-I18N:START -->

**English** | [简体中文](./README.zh-CN.md)

<!-- README-I18N:END -->

> The workspace IDs, work item IDs, nicknames, and requirement titles in this repository are fictional examples.

## What It Does

- Reads requirements, tasks, bugs, and prototype information after you paste a Story/Task/Bug link.
- Generates local `.tapd/config.json` in a business repository on first use, then creates a development branch.
- Restores TAPD context from the current branch in later sessions so you can continue planning, coding, testing, or wrapping up.
- Resolves a Task back to its parent Story; summarizes Bug reproduction steps, impact, related requirements, and regression scope.
- Uses dry-run before creating or updating tasks, test cases, comments, or timesheets, then reads back results when MCP capabilities allow it.
- Generates concise daily/standup briefs: done today, in progress, risks, next work, and data stats.

## Install

```bash
npx skills add hakityc/tapd-skill --skill tapd --global --agent codex --yes
```

Other agents can install it too:

```bash
npx skills add hakityc/tapd-skill --skill tapd --global --agent claude-code --yes
```

## Minimal Setup

Team members only need to configure a TAPD MCP token. The skill itself does not store tokens.

Use [`mcp-server-tapd`](https://pypi.org/project/mcp-server-tapd/) if possible. The current compatibility baseline is `mcp-server-tapd==8.0.78`. See [`references/mcp-bootstrap.md`](references/mcp-bootstrap.md) for platform setup details.

When you paste a TAPD link in a business repository for the first time, the skill will:

1. Detect Git base branch candidates.
2. Ask you to confirm the base branch.
3. Generate `.tapd/config.json`.
4. Create a development branch and bind the current work item.

The generated local config looks like this:

```json
{
  "version": 1,
  "base_branch": "master",
  "workspace_id": "12345678"
}
```

## Common Usage

```text
/tapd 开始做 https://www.tapd.cn/12345678/prong/stories/view/1112345678000000001
/tapd 继续开发
/tapd 这个需求做完了，帮我收尾
/tapd 生成今天的站会简报，workspace_id=12345678，当前用户=开发者A
```

Supported common link forms:

```text
/tapd_fe/<workspace_id>/story/detail/<story_id>
/tapd_fe/<workspace_id>/task/detail/<task_id>
/tapd_fe/<workspace_id>/bug/detail/<bug_id>
/<workspace_id>/prong/stories/view/<story_id>
/<workspace_id>/prong/tasks/view/<task_id>
/<workspace_id>/bugtrace/bugs/view/<bug_id>
```

## Local Files

The skill only writes local state in the business repository:

```text
.tapd/config.json
.tapd/context.json
.tapd/logs/
```

Recommended project `.gitignore` entries:

```gitignore
.tapd/config.json
.tapd/project.json
.tapd/context.json
.tapd/logs/
```

The CLI never edits `.gitignore` automatically.

## Safety Boundaries

- Does not run `git pull` or `git stash`, and does not auto-commit `.tapd`.
- Does not automatically transition TAPD statuses.
- Reads and writes TAPD remotely only through MCP; it does not call OpenAPI directly.
- Uses dry-run plus user confirmation before remote writes.
- Matches owners exactly to avoid writing to similar nicknames.
- Dirty worktree checks only exclude `.tapd/config.json`, `.tapd/project.json`, `.tapd/context.json`, and `.tapd/logs/**`.

## Runtime Requirements

For users:

- Git
- Node.js 18+
- TAPD MCP: uv, Python 3.13+, `mcp-server-tapd`

`tapd-context` ships with bundled `dist`, so users do not need npm dependencies.

## Development Validation

```bash
cd scripts/tapd-context
npm ci
npm test
cd ../..
python3 scripts/quick_validate.py .
```

## Note

This is a community workflow tool and is not affiliated with TAPD. Before using write capabilities, confirm token permissions, the target workspace, and the dry-run content.
