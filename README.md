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
- 支持 TAPD 页面常见的 Story/Task prong view 链接。
- 从确认过的本地 base 分支创建规范业务分支。
- 将工作项绑定到当前 Git 分支，并在后续会话恢复。
- Task 入口先解析父 Story，再对照同 Story tasks。
- 支持从计划进入写代码、测试、继续开发和开发收尾。
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

团队成员只需要两步：

1. 在本机 MCP 配置中提供个人 `TAPD_ACCESS_TOKEN`。
2. 在已有业务仓库中首次粘贴 TAPD 链接。Skill 探测 base，展示候选并确认后自动生成本地 `.tapd/config.json`。

```json
{
  "version": 1,
  "base_branch": "master",
  "workspace_id": "12345678"
}
```

不需要额外 clone Skill 或手工执行初始化命令。`.tapd/config.json` 不保存 token；个人昵称仅在 owner 精确匹配等写入场景需要，可询问一次后保存。

远端 TAPD 工作流使用 [`mcp-server-tapd`](https://pypi.org/project/mcp-server-tapd/)。当前兼容基线为 `mcp-server-tapd==8.0.78`，MCP 配置只要求 token。平台配置与验证状态见 [`references/mcp-bootstrap.md`](references/mcp-bootstrap.md)。

典型使用：

```text
安装 Skill
→ 配置 TAPD MCP token
→ 在现有业务仓库粘贴 Story/Task 链接
→ 确认 base
→ Skill 自动生成 config、创建分支、读取需求并开始开发
```

## 运行要求

用户运行：

- Git
- Node.js 18+
- 远端 TAPD 工作流：uv、Python 3.13+、可用的 `tapd-mcp`
- Python 3，仅在宿主环境直接运行辅助脚本时需要

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
tapd-context init --base master --workspace 12345678
tapd-context configure --user "开发者A"
tapd-context start --input '<TAPD Context JSON>'
tapd-context bind --input '<TAPD Context JSON>'
tapd-context current --format json
tapd-context status
```

CLI 新版本只写：

```text
.tapd/config.json
.tapd/context.json
```

`.tapd/project.json` 只作为旧版本兼容输入，新版本不会主动生成它。

建议手工加入项目 `.gitignore`：

```gitignore
.tapd/config.json
.tapd/project.json
.tapd/context.json
.tapd/logs/
```

CLI 不会自动修改 `.gitignore`，也不会执行 `git pull`、`git stash` 或自动提交。

## 安全模型

- `start` 的 dirty worktree 检查仅排除 `.tapd/config.json`、兼容旧版的 `.tapd/project.json`、`.tapd/context.json` 和 `.tapd/logs/**`。
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
- 首次使用生成 `.tapd/config.json`
- `init/configure/start/bind/current/status`
- 标准 detail 与 Story/Task prong view 链接
- Task → 父 Story → 同级 tasks intake
- 日常编码执行、继续开发和开发收尾
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
- Bug 相关 prong/bugtrace、mini-project 和独立短 ID
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
