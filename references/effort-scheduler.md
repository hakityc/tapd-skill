# TAPD 估时与排期（AI 加速版）

## 目标

基于 TAPD 需求/任务与“我”的现有任务负载，输出一份**不夸张、可解释、可调整**的估时与排期建议。

默认 **只输出建议**，不自动写回 TAPD；除非用户明确要求写回，并且只写回 **owner=我** 的任务。

owner 判断必须复用 `references/safety-policy.md` 的分隔符精确匹配，禁止 substring。

## 默认参数（可调）

- `capacity_per_week_hours = 30`（默认 30h/周）
- `work_days_per_week = 5`
- `allow_weekend = false`
- `wip_limit = 2`（同时进行任务不超过 2 个）

### AI 加速系数（可调，避免写死）

估时按“分段”而不是整体打折：

- `ai_coding_factor = 0.45`（实现/编码段：传统工时 × 0.45）
- `integration_factor = 0.85`（联调/回归段：传统工时 × 0.85）
- `planning_factor = 0.80`（需求对齐/拆解段：传统工时 × 0.80）
- `buffer_percent = 0.20`（默认 20% 风险缓冲）

> 说明：这组默认值偏保守，目标是“不夸张”。用户可根据自己团队/习惯调整。

## 输入

- Story 一键复制 / story_id / 链接  
- （可选）新任务列表（若用户要对“将创建的新任务”排期）  
- （可选）用户额外约束：必须完成日期、不可延期事项  

## 输出格式（必须）

按下面结构输出（不要自由发挥）：

1) **参数摘要**：capacity/WIP/系数/缓冲  
2) **当前负载概览**：owner=我 的 open/progressing tasks 数量与最近 due  
3) **新任务估时**：每条任务（plan/implement/integration/buffer/total）  
4) **建议排期**：每条任务 begin/due（按工作日）  
5) **冲突/风险提示**：明确哪些 due 会被挤压，给出 2~3 个策略选项  
## 强制步骤

1. **确保 MCP 可用**  
   - 若不可用，先执行 `references/mcp-bootstrap.md`  
2. **确认“我”是谁（强制）**  
   - 复用 `references/task-orchestrator.md` 的“确认我是谁”规则  
3. **拉取我的现有任务负载（强制）**  
   - 用 `get_stories_or_tasks(entity_type='tasks')` 查询候选任务，再按共享 owner token 规则精确过滤“我”的任务  
   - 过滤状态：`open` / `progressing`  
   - fields 至少包含：`id,name,status,owner,created,modified,begin,due`  
4. **估时（强制，分段）**  
   - 对每条新任务先给“传统工时基线”（可用经验/模板），再乘以系数：  
     - plan  
     - implement（受 ai_coding_factor 影响最大）  
     - integration（受 integration_factor 影响，且若依赖后端/权限则提高缓冲）  
   - 总工时 = (plan×planning_factor + implement×ai_coding_factor + integration×integration_factor) × (1+buffer_percent)  
5. **排期（强制）**  
   - 把每周 `capacity_per_week_hours` 按工作日切片  
   - WIP 限制：同一时间最多并行 `wip_limit` 个任务  
   - 优先级顺序默认：  
     - 有 due 的先排  
     - progressing 优先于 open  
     - 新任务按“依赖链”顺序排（若来自 story/tasks）  
6. **写回规则（默认不写回）**  
   - 只有用户明确说“写回 TAPD begin/due/effort”才写  
   - 且只写回 owner=我 的任务  
   - 写回前必须展示 dry-run 清单；本轮未明确授权写入时等待确认  
   - 缺少 `update_story_or_task` 时只输出建议，不执行未文档化 fallback  

## 风险缓冲规则（建议）

遇到下列任一情况，`buffer_percent` 建议上调到 30%~50%：

- 后端接口/字段未定或需联调  
- 需要额外权限/审批  
- 原型不完整/验收口径不清  
- 需要灰度/多环境验证  
