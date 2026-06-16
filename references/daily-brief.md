# TAPD 日报/站会简报

用户说“日报、站会、今日工作、明日计划、今天做了什么、明早汇报”时使用。该工作流只读 TAPD，不要求 Git 仓库或分支 context，不创建文件，不写 TAPD。

## 输入解析

优先使用用户本轮给出的 `workspace_id`、用户昵称和日期；其次读取当前仓库 `.tapd/config.json` 的 `workspace_id/user_nick`；仍缺失时询问一次。

- 日期默认使用 Asia/Shanghai 的今天，格式 `YYYY-MM-DD`。
- 明日计划使用下一工作日；周五输出“明日计划（下周一）”。
- 不从 Git、聊天记忆或主观猜测补工作内容。

## 能力前置

按 `mcp-capability-matrix.md` 检查“日报/站会简报”。

必需：

- `get_stories_or_tasks`

可选：

- `get_bug`
- `get_comments`
- `get_timesheets`
- `get_iterations`
- `get_workflows_last_steps`

缺少可选能力时继续生成，但在“数据”里用短句说明缺项；缺少必需能力时执行 MCP bootstrap，仍缺失则停止。

## 采集范围

### Tasks

调用 `get_stories_or_tasks(workspace_id, options)`：

```json
{
  "entity_type": "tasks",
  "owner": "<nick>",
  "fields": "id,name,status,owner,begin,due,iteration_id,story_id,modified,created",
  "limit": 200,
  "order": "modified desc"
}
```

纳入今日候选：

- `begin <= today <= due`
- `begin == today`
- `due == today`
- `created` 或 `modified` 在 today

### Bugs

若有 `get_bug`，调用：

```json
{
  "current_owner": "<nick>",
  "fields": "id,title,status,current_owner,begin,due,iteration_id,modified,created,severity",
  "limit": 200,
  "order": "modified desc"
}
```

纳入规则同 Tasks。缺少 `get_bug` 时不臆造 Bug 数据。

### Comments

若有 `get_comments`，查询 today 内作者为当前 nick 的评论：

```json
{
  "author": "<nick>",
  "entry_type": "stories|tasks|bug|bug_remark",
  "created": "<today range>",
  "fields": "id,author,entry_type,entry_id,description,created",
  "limit": 200,
  "order": "created asc"
}
```

评论只用作“今日动作”辅助说明，提炼为 4-18 个字，不粘贴原文。

### Timesheets and iterations

- 有 `get_timesheets` 时查询 `spentdate=today`，只统计总工时和条数。
- 从今日事项与明日计划收集非空 `iteration_id`；有 `get_iterations` 时回填迭代名。
- 有 `get_workflows_last_steps` 时读取完成态；否则使用常见完成态兜底。

## 分类规则

完成态包含：

- task: `done`, `closed`, `已完成`, `已关闭`
- bug: `resolved`, `verified`, `closed`, `已解决`, `已验证`, `已关闭`

今日完成：

- 今日候选且状态在完成态。

进行中：

- 今日候选且未完成。
- 状态未知时归入进行中，并标注“状态待确认”。

风险：

- 今日计划内仍未完成，且没有今日评论、工时或状态推进。
- `due` 早于 today 且未完成。
- 今日新增且严重程度高的 Bug。

明日计划：

- 下一工作日 `begin` 或 `due` 命中。
- 今日未完成且仍需推进的事项。

## 输出风格

- 简短干练，不写长背景，不复述需求全文。
- 不按业务域分组，不做二级嵌套。
- 每个事项一行，优先“事项名：动作/状态”。
- 每行尽量不超过 32 个中文字符。
- 每个区块最多 5 条；超过时写“另 X 项”。
- 没有数据写“无”，不要写解释性长段。
- 不输出原始 JSON、完整 description、评论全文或 token。

## 输出模板

严格使用以下结构：

```markdown
# YYYY-MM-DD 日报/站会简报

## 今日完成
- 事项名（状态）

## 进行中
- 事项名：下一步

## 风险
- 无

## 明日计划
- 事项名

## 数据
- 任务 X，缺陷 X，评论 X，工时 Xh
- 迭代：迭代名1、迭代名2

## 统计
- 今日事项 X；完成 X；进行中 X；风险 X
```

若数据源部分缺失，在“数据”里追加一条短句，例如：

```markdown
- 缺失：Bug、评论
```
