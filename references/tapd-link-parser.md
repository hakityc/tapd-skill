# TAPD Link Parser P0

## 硬支持

标准云端或路径一致的私有部署域名：

```text
https://<host>/tapd_fe/<workspace_id>/story/detail/<story_id>
https://<host>/tapd_fe/<workspace_id>/task/detail/<task_id>
https://<host>/tapd_fe/<workspace_id>/bug/detail/<bug_id>
```

输出 `workspace_id`、规范化 `entity_type`、字符串 `id` 和原 URL。

## Context JSON

Context JSON 是首选输入。若 JSON 含标准 URL，URL 身份覆盖冲突的 `entity_type/id/workspace_id`，`title/user_nick` 仍来自 JSON。

## P1 / best-effort

以下格式不属于 P0 硬验收：

- `/prong/stories/view/...`
- `/prong/tasks/view/...`
- bugtrace 链接
- mini-project 链接
- 只给短 ID

无法可靠解析时返回 `UNSUPPORTED_TAPD_URL`，由 skill 请求 Context JSON，不猜测 workspace 或长 ID。
