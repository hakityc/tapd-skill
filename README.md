# TAPD Skill

一个面向 AI 编程代理的 TAPD 研发工作流 skill。它在原有需求读取、任务编排、实现计划、测试用例和估时排期流程前，增加了 Git 分支级上下文记忆。

[![skills.sh](https://skills.sh/b/hakityc/tapd-skill)](https://skills.sh/hakityc/tapd-skill/tapd)

核心组件：

- `SKILL.md`：意图识别、context resolve、MCP 能力门禁和工作流路由。
- `tapd-context`：管理 Git 分支与 TAPD 工作项的本地绑定。
- `tapd-mcp`：执行 TAPD 远端读取和写入，本仓库不包含该服务。

> 本仓库中的 workspace、工作项 ID、昵称和需求标题均为虚构示例。

## 功能

- 从 TAPD Context JSON 或标准 Story/Task URL 开始工作。
- 从确认过的本地 base 分支创建规范业务分支。
- 将工作项绑定到当前 Git 分支，并在后续会话恢复。
- 保留需求 intake、任务创建与更新、实现计划、测试用例、估时排期和评论同步流程。
- 按 workflow 探测具体 MCP 能力，不假设可选工具一定存在。
- TAPD 远端写入统一执行 dry-run、确认和可用范围内的回读。
- owner 使用分隔符 token 精确匹配，避免相似昵称误更新。

## Context Resolve

工作项解析优先级：

1. 本轮 TAPD Context JSON
2. 本轮 TAPD URL
3. 当前分支绑定
4. 旧格式复制文本
5. 询问用户

只有“继续、状态、同步、计划”等没有新工作项输入的请求，才默认恢复当前分支绑定。

## 安装

推荐通过 [Skills.sh](https://skills.sh) 安装。CLI 会自动识别 Codex、Claude Code、Cursor 等支持的代理：

```bash
npx skills add hakityc/tapd-skill --skill tapd
```

安装到用户级目录并跳过交互确认：

```bash
npx skills add hakityc/tapd-skill --skill tapd --global --yes
```

指定代理：

```bash
npx skills add hakityc/tapd-skill --skill tapd --global --agent codex --yes
npx skills add hakityc/tapd-skill --skill tapd --global --agent claude-code --yes
```

无需在 Skills.sh 单独上传压缩包。公开 GitHub 仓库中的 `SKILL.md` 是发布源，用户通过 `npx skills add` 安装后会被 Skills.sh 自动索引。

无法使用 `npx` 时，也可以手工 clone 到代理支持的 skills 目录，并确保最终目录名为 `tapd`。

## 最简配置

团队成员只需要两类配置：

1. 在本机 MCP 配置中提供个人 `TAPD_ACCESS_TOKEN`。
2. 项目仓库提交不含秘密的 `.tapd/config.json`，统一 workspace、base 分支和可选分支规则。

```json
{
  "version": 1,
  "workspace_id": "12345678",
  "base_branch": "master"
}
```

远端 TAPD 工作流使用 [`mcp-server-tapd`](https://pypi.org/project/mcp-server-tapd/)。平台配置与验证状态见 [`references/mcp-bootstrap.md`](references/mcp-bootstrap.md)。

> 当前 P0 CLI 仍读取 `.tapd/project.json`。`.tapd/config.json` 的团队共享模式是下一兼容版本的目标；完成迁移前请继续按下文执行 `tapd-context init`。

## 运行要求

用户运行：

- Git
- Node.js 18+
- Python 3，仅在自动读取当前 TAPD 用户时需要
- 可用的 `tapd-mcp`，仅远端 TAPD 工作流需要

`tapd-context` 已提交编译后的 `dist`，用户不需要安装 npm 依赖。

skill 调用 CLI 的顺序：

1. PATH 中的 `tapd-context`
2. bundled `scripts/tapd-context/dist/cli.js`
3. 两者均不可用时停止并报告

## TAPD Context JSON

推荐从 TAPD 页面复制如下结构：

```json
{
  "source": "tapd",
  "entity_type": "Story",
  "id": "1112345678000000001",
  "short_id": "1000001",
  "title": "【示例平台】【功能需求】订单审批新增风险标记开关",
  "url": "https://www.tapd.cn/tapd_fe/12345678/story/detail/1112345678000000001",
  "user_nick": "开发者A"
}
```

`id` 始终按字符串保存。URL 兼容模式缺少标题或用户时不会伪造字段，由 skill 尝试通过 MCP 补全。

## tapd-context

```bash
tapd-context detect-base
tapd-context init --user "开发者A" --base master
tapd-context start --input '<TAPD Context JSON>'
tapd-context bind --input '<TAPD Context JSON>'
tapd-context current --format json
tapd-context status
```

CLI 只写：

```text
.tapd/project.json
.tapd/context.json
```

建议手工加入项目 `.gitignore`：

```gitignore
.tapd/project.json
.tapd/context.json
.tapd/logs/
```

CLI 不会自动修改 `.gitignore`，也不会执行 `git pull`、`git stash` 或自动提交。

## 安全模型

- `start` 的 dirty worktree 检查仅排除 `.tapd/project.json`、`.tapd/context.json` 和 `.tapd/logs/**`。
- `.tapd` 下其他文件仍按普通变更处理。
- 创建分支前记录原分支，失败时尝试恢复并返回稳定错误码。
- 已有项目配置和分支绑定默认不覆盖。
- 本地 context 写入与 TAPD 远端写入采用不同确认策略。
- 未验证 OpenAPI fallback 默认只生成请求草案。
- CLI 不读取或保存 TAPD token。

完整规则见 [`references/safety-policy.md`](references/safety-policy.md)。

## P0 能力边界

已实现：

- Story/Task context 主路径
- `init/start/bind/current/status`
- 精确 dirty worktree 检查
- MCP capability matrix
- owner 精确匹配
- 统一 dry-run 语义
- 多平台 bootstrap 验证状态
- `get_current_user.py` 类型与脱敏修复

后续 P1：

- Bug 完整 intake
- 评论列表回读增强
- Story 与测试用例关联增强
- 经验证的 OpenAPI fallback 写入
- prong、bugtrace、mini-project 和独立短 ID
- 完整 eval runner

## 开发与验证

```bash
cd scripts/tapd-context
npm ci
npm test
cd ../..
python3 scripts/quick_validate.py .
```

`quick_validate.py` 检查：

- `SKILL.md` frontmatter
- 本地 reference 链接
- examples 和 JSON schemas
- evals JSON
- Python 语法与单元测试
- `src/dist` 同步
- bundled dist 可执行性
- 临时 Git 仓库集成测试

## 仓库结构

```text
.
├── SKILL.md
├── references/
├── examples/
├── evals/
├── scripts/
│   ├── get_current_user.py
│   ├── quick_validate.py
│   └── tapd-context/
└── tests/
```

## 免责声明

本项目是社区工作流工具，不代表 TAPD 官方。使用远端写入能力前，请检查 token 权限、目标 workspace 和 dry-run 内容。
