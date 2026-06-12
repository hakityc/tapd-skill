# tapd-mcp Capability Matrix

## 探测方法

1. 用只读 `get_user_participant_projects` 或 Story/Task 查询确认 MCP 服务在线。
2. 检查当前工具列表是否包含目标 workflow 的具体工具。
3. 不通过调用写工具来“探测”能力。
4. 工具名可能随 MCP 版本变化；按当前暴露 schema 判断，不假定存在。

## P0 Matrix

| Workflow | 必需能力 | 可选/待探测能力 | 缺失处理 |
|---|---|---|---|
| Story/Task intake | `get_stories_or_tasks` | `get_image` | 缺读取工具则停止；缺图片工具则列出未读取原型 |
| Task 创建 | `get_stories_or_tasks`, `create_story_or_task` | 无 | 缺创建工具则只输出 dry-run |
| Task 更新 | `get_stories_or_tasks`, `update_story_or_task` | 无 | 缺更新工具则只输出 dry-run |
| Plan | Story/Task intake 能力 | `create_comments` | 仍可产出计划；不能同步评论时明确说明 |
| 评论同步 | `create_comments` | `get_comments` | 缺创建工具则不写；缺读取工具可依据成功返回说明无法列表回读 |
| Tcase 创建 | `create_or_update_tcases` 或 `create_tcases_batch` | `get_tcases`, `entity_relations` | 能创建就创建；缺关联工具时说明未关联 Story |
| Schedule | `get_stories_or_tasks` | `update_story_or_task` | 默认只建议；明确写回但缺更新工具时停止 |
| Bug | 无，本地 context 可用 | `get_bug` 或等价读取工具 | 缺读取能力只绑定，不进入完整 intake |

`get_bug`、`get_comments`、`entity_relations` 都是可选/待探测能力，不得写成 MCP 必然提供。

## Fallback

- 只允许使用 `openapi-fallback.md` 中有完整契约的 endpoint。
- P0 未验证写 fallback 只生成草案，不自动发送。
- 没有文档化 fallback 时停止并报告缺少的工具。

## 回读语义

- 评论：`create_comments` 返回明确成功但没有 `get_comments` 时，输出“写入成功，但无法评论列表回读”。
- 用例：创建与关联是两个独立结果；关联能力缺失不回滚已创建用例。
- 任何回读失败都不得把写入描述为已确认。
