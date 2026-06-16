---
name: tapd
description: TAPD 研发工作流总入口。用户提到 TAPD、Story、Task、Bug、一键复制、需求 intake、原型读取、拆任务、owner、effort、实现计划、按任务写代码、继续开发、测试、开发收尾、日报、站会简报、今日工作、明日计划、工时、提交关键字、排期、TAPD 评论、分支绑定、tapd-context 或 .tapd/context.json 时必须使用。工作项请求先解析本轮输入或恢复分支绑定；日报请求直接只读汇总 TAPD。
compatibility: Requires Git, Node.js 18+ for bundled tapd-context, and tapd-mcp (uv plus Python 3.13+) for remote TAPD workflows.
---

# TAPD 工作流

将 TAPD 上下文恢复、需求 intake、任务编排、实现计划、测试用例、估时排期和评论同步组合成可续跑流程。架构边界：

- `tapd-context`：只负责 Git 分支、本机绑定、全局缓存和 Agent 可读 active context。
- `tapd-mcp`：负责 TAPD 远端读取与写入。
- 本 skill：负责解析意图、能力门禁、安全确认与工作流编排。

## 0. Context resolve（工作项工作流前置）

读取并执行 `references/context-manager.md`。工作项来源按以下顺序选择：

1. 本轮 TAPD Context JSON。
2. 本轮 TAPD URL。
3. 当前分支绑定 context。
4. 本轮旧格式复制文本。
5. 询问用户。

只有本轮没有新工作项输入的“继续、状态、同步、计划”等请求，才默认使用当前分支 context。新输入不得被旧绑定覆盖。

日报/站会简报是只读汇总工作流，不要求当前分支 context；进入 `references/daily-brief.md`。

## 1. 意图识别

- **A. MCP 自助配置**：MCP 不可用或缺少必要能力。
- **B. 需求 intake**：读需求、原型、验收点、tasks 对照。
- **C. 任务编排**：创建任务、回填 owner/effort。
- **D. 计划与实现**：按 Story 和 tasks 规划、写代码、测试或继续开发。
- **E. 测试用例**：生成或写入 TAPD 用例。
- **F. 估时排期**：结合当前负载估时或写回排期。
- **G. 评论同步**：同步代码 TODO、联调说明或研发备注。
- **H. 开发收尾**：执行验证、生成提交关键字、登记工时或输出完成摘要。
- **I. 日报/站会简报**：汇总今日完成、进行中、风险、明日计划，输出短简报。

拆任务、实现和测试用例都必须先完成 B。Story 与 description/原型是需求真相，tasks 只组织执行。

## 2. MCP 能力门禁

读取 `references/mcp-capability-matrix.md`，先探测 MCP 在线状态，再检查目标 workflow 的具体工具。

- Story、Task、Bug 都是主路径。兼容基线 `mcp-server-tapd==8.0.78` 原生提供对应读取与写入工具。
- 仍需按运行时工具列表做能力门禁；缺少必需工具时执行 bootstrap、升级或重载 MCP，仍缺失则停止。
- TAPD 远端读写只通过 MCP 执行，不直接调用 OpenAPI。

MCP 整体不可用时执行 `references/mcp-bootstrap.md`，reload/restart 后重新探测。

## 3. 工作流路由

- A：`references/mcp-bootstrap.md`
- B：`references/intake-gate.md`
- C：`references/task-orchestrator.md`
- D：先读 `references/impl-planner.md`；用户要求实施、写代码或继续时再读 `references/development-executor.md`
- E：`references/tcase-orchestrator.md`
- F：`references/effort-scheduler.md`
- G：`references/sync-code-comment-to-tapd.md`
- H：`references/development-finish.md`
- I：`references/daily-brief.md`

所有本地和远端修改同时遵守 `references/safety-policy.md`。

## 4. P0 边界

本版本不实现：

- `git pull`、自动 stash、自动修改 `.gitignore`、自动提交 `.tapd`。
- TAPD 状态自动流转、related 多工作项、跨仓库全局配置。
- Cursor Hooks、MR/提测说明生成。
- mini-project 和独立短 ID 硬保证。
- 未经确认的远端写入。
- Git remote hidden refs registry。

## 5. 输出纪律

- context/CLI 失败时报告稳定错误码和下一步，不解析中文 message 做分支判断。
- 远端写入必须先 dry-run；写后按能力回读，无法回读时明确标记。
- 不回显 token，不假装缺失能力已成功执行。
