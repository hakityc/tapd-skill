---
name: tapd
description: TAPD 与 Flow 研发工作流总入口。用户提到 TAPD、Story、Task、Bug、产品 Git Repo、发布需求、同步产品文档、产品评审、规格版本、.flow/spec.json、需求 intake、原型读取、编码前审核、拆任务、实现、测试、收尾、日报、今日待办、团队盘点、工时、排期、评论、分支绑定或 tapd-context 时必须使用。产品规格请求先读取 Flow Manifest；工作项请求解析本轮输入或恢复分支绑定；日报、今日待办和团队盘点只读汇总 Provider。
compatibility: Requires Git, Node.js 18+ for bundled tapd-context, and tapd-mcp (uv plus Python 3.13+) for remote TAPD workflows.
---

# Flow 研发交付工作流（TAPD Provider）

将产品规格发布、产品评审、TAPD 上下文恢复、团队策略、需求 intake、任务编排、实现、测试和收尾组合成可续跑流程。当前保留 `/tapd` 兼容入口；核心新流程使用通用 Flow 语义，TAPD 是第一个 Work Item Provider。

- `tapd-context`：只负责 Git 分支、本机绑定、全局缓存和 Agent 可读 active context。
- `tapd-mcp`：负责 TAPD 远端读取与写入。
- 本 skill：负责解析意图、能力门禁、安全确认与工作流编排；通用 Provider 边界见 `references/provider-contract.md`。

事实源边界：产品 Git Repo 保存完整规格与原型；Provider 保存需求摘要、评审结论、任务和进度；代码仓库保存实现；测试系统保存 Case 和证据。规格是否正式准入只按 `references/spec-authority.md` 判断，TAPD 受管描述是发布副本。

团队使用时读取 `references/team-policy.md`：共享 `.tapd/team.json` 与个人 `.tapd/config.json` 按字段合并，用户本轮明确输入优先。所有远端写入和团队盘点不得跳过该策略解析；写动作白名单只能收紧工作流，不能提升 TAPD token 权限。

## 0. 入口解析

“发布需求、同步产品文档、发起产品评审、记录评审结论”优先读取产品 Repo 的 `.flow/spec.json`，分别进入 K/L，不要求先有 TAPD 工作项。

其他工作项工作流执行 Context resolve：

读取并执行 `references/context-manager.md`。工作项来源按以下顺序选择：

1. 本轮 TAPD Context JSON。
2. 本轮 TAPD URL。
3. 当前分支绑定 context。
4. 本轮旧格式复制文本。
5. 询问用户。

只有本轮没有新工作项输入的“继续、状态、同步、计划”等请求，才默认使用当前分支 context。新输入不得被旧绑定覆盖。

日报/站会简报与“今天有哪些活/今日 Todo”都是只读工作流，不要求当前分支 context；进入 `references/daily-brief.md`。前者回顾当天进展，后者从当前迭代未完成任务中挑选今天可推进的事项，不能只按 due=今天过滤。

## 1. 意图识别

- **A. MCP 自助配置**：MCP 不可用或缺少必要能力。
- **B. 需求 intake**：读需求、原型、验收点、tasks 对照。
- **C. 编码前审核**：对产品文档、原型、tasks 和代码落点做高影响问题审核；只输出可能导致返工、阻塞联调或影响验收的问题，并在用户确认后同步 TAPD 评论。
- **D. 任务编排**：按 profile 创建任务、回填 owner/description，并串联 G 估时排期；是否写回由团队策略决定。
- **E. 计划与实现**：按 Story 和 tasks 规划、写代码、测试或继续开发。
- **F. 测试用例**：生成或写入 TAPD 用例。
- **G. 估时排期**：结合当前负载估时或写回排期。
- **H. 评论同步**：同步代码 TODO、联调说明、研发备注或已确认的编码前审核问题。
- **I. 开发收尾**：执行验证、生成提交关键字、登记工时或输出完成摘要。
- **J. 日报/站会简报、今日待办与团队盘点**：日报回顾个人进展；今日待办给出个人排序；团队盘点只读汇总当前迭代成员 WIP、逾期、阻塞和无人负责事项。
- **K. 产品规格发布**：从产品 Git Repo 的 `.flow/spec.json` 幂等创建或更新 Provider Requirement，并回填映射。
- **L. 产品评审 Gate**：生成评审输入包，记录人工确认结论，冻结 reviewed_ref，并识别评审后变化。

拆任务、编码前审核、实现和测试用例都必须先完成 B，并统一执行 `references/spec-authority.md`；tasks 只组织执行。

D 与 G 默认串联，不是互斥分支：

- 用户说“拆任务 / 创建任务 / 回填 TAPD / 建分支拆任务”时：先走 B intake，再走 D 创建/回填任务，最后走 G 估时排期；默认展示 dry-run 并确认后写回本人任务的 effort/begin/due。
- 用户单独说“估时 / 排期 / 补工时”时：只走 G。
- 用户明确说“不写工时 / 只拆任务 / 仅创建任务不排期”时：D 跳过 G，effort/begin/due 保持空或仅按用户指定字段处理。
- 用户要求“实现、写代码、按任务做、继续开发”时：先走 B intake；若本轮尚未做编码前审核，先走 C；确认或跳过写入后再进入 E。

## 2. MCP 能力门禁

读取 `references/mcp-capability-matrix.md`，先探测 MCP 在线状态，再检查目标 workflow 的具体工具。

- Story、Task、Bug 都是主路径。兼容基线 `mcp-server-tapd==8.0.78` 原生提供对应读取与写入工具。
- 仍需按运行时工具列表做能力门禁；缺少必需工具时执行 bootstrap、升级或重载 MCP，仍缺失则停止。
- TAPD 远端读写只通过 MCP 执行，不直接调用 OpenAPI。

MCP 整体不可用时执行 `references/mcp-bootstrap.md`，reload/restart 后重新探测。

## 3. 工作流路由

- A：`references/mcp-bootstrap.md`
- B：`references/intake-gate.md`
- C：`references/pre-dev-review.md`
- D：先读 `references/team-policy.md`，再读 `references/task-orchestrator.md`，并在创建/回填后串联 `references/effort-scheduler.md`
- E：先读 `references/impl-planner.md`；用户要求实施、写代码或继续时再读 `references/development-executor.md`
- F：`references/tcase-orchestrator.md`
- G：`references/effort-scheduler.md`
- H：`references/sync-code-comment-to-tapd.md`
- I：`references/development-finish.md`
- J：`references/daily-brief.md`
- K：`references/spec-publisher.md`
- L：`references/product-review-gate.md`

所有本地和远端修改同时遵守 `references/safety-policy.md`。

## 4. P0 边界

本版本不实现：

- `git pull`、自动 stash、自动修改 `.gitignore`、自动提交 `.tapd`。
- TAPD 状态自动流转、related 多工作项、跨仓库全局配置。
- Cursor Hooks、MR/提测说明生成。
- mini-project 和独立短 ID 硬保证。
- 未经确认的远端写入。
- Git remote hidden refs registry。
- 飞书或其他 Work Item Provider Adapter；当前只定义平台无关 Manifest 和能力边界。

## 5. 输出纪律

- context/CLI 失败时报告稳定错误码和下一步，不解析中文 message 做分支判断。
- 远端写入必须先 dry-run；写后按能力回读，无法回读时明确标记。
- 不回显 token，不假装缺失能力已成功执行。
- 任务编排完成时必须输出当前 profile、任务链接表、每条任务的 effort/begin/due 汇总，以及当前 Story 的同 profile 任务总工时。
