# TAPD OpenAPI Fallback Drafts

## P0 policy

这些接口已根据 TAPD OpenAPI 文档和当前 `mcp-server-tapd` 请求形状整理，但本 skill 尚未完成真实写入验证。P0 默认只生成脱敏请求草案，不发送。

只有用户明确说“使用未验证 fallback 写入”时才可发送；发送前仍需 dry-run，发送后必须回读。回读失败标记“写入未确认”。

通用 headers：

```http
Authorization: Bearer ${TAPD_ACCESS_TOKEN}
Content-Type: application/json
```

不得输出 Authorization 的实际值。`${TAPD_API_BASE_URL}` 默认 `https://api.tapd.cn`。

## ID rules

- 所有 ID 在本地按字符串处理。
- 长 ID 可直接发送。
- P0 不自行把独立短 ID 拼成长 ID；短 ID 只有在接口和 workspace 明确支持时才原样发送。
- `workspace_id` 必须来自 Context JSON、标准 URL 或已确认项目配置，不能猜测。

## Comments

文档：[添加评论](https://open.tapd.cn/document/api-doc/API%E6%96%87%E6%A1%A3/api_reference/comment/add_comment.html)

写入：

```http
POST ${TAPD_API_BASE_URL}/comments
```

```json
{
  "workspace_id": "12345678",
  "entry_id": "1112345678000000001",
  "entry_type": "stories",
  "author": "开发者A",
  "description": "<p>...</p>"
}
```

- `entry_type`: Story=`stories`、Task=`tasks`、Bug=`bug`；必须与 `entry_id` 一致。
- 权限：`comment#write`；实际 token scope 以 TAPD 返回为准。
- 成功：HTTP 2xx、合法 JSON、顶层 `status == 1`，并能取得返回 Comment/id 或等价对象。

回读草案：

```http
GET ${TAPD_API_BASE_URL}/comments?workspace_id=12345678&id=<returned_comment_id>
```

若响应未提供评论 ID，使用 `workspace_id + entry_id + entry_type` 查询并核对 author/description。权限 `comment#read`。无已验证 GET 能力时保留“写入成功，但无法评论列表回读”。

## Test cases

文档：

- [新增测试用例](https://open.tapd.cn/document/api-doc/API%E6%96%87%E6%A1%A3/api_reference/tcase/add_tcase.html)
- [批量新增测试用例](https://open.tapd.cn/document/api-doc/API%E6%96%87%E6%A1%A3/api_reference/tcase/batch_add_tcase.html)

单条写入：

```http
POST ${TAPD_API_BASE_URL}/tcases
```

```json
{
  "workspace_id": "12345678",
  "name": "[模块] 场景",
  "precondition": "前置条件",
  "steps": "1. 操作",
  "expectation": "预期结果",
  "status": "normal",
  "priority": "P2",
  "type": "功能测试",
  "creator": "开发者A"
}
```

批量写入：

```http
POST ${TAPD_API_BASE_URL}/tcases/batch_save
```

body 为上述对象数组，每项均包含 `workspace_id`。权限：`tcase#write`。

成功：HTTP 2xx、合法 JSON、`status == 1`，并取得每条用例 ID。回读：

```http
GET ${TAPD_API_BASE_URL}/tcases?workspace_id=12345678&id=<tcase_id>
```

权限：`tcase#read`。逐条核对 name、precondition、steps、expectation。

## Story and tcase relation

文档：[需求关联测试用例](https://open.tapd.cn/document/api-doc/API%E6%96%87%E6%A1%A3/api_reference/story/create_story_tcase.html)

写入：

```http
POST ${TAPD_API_BASE_URL}/stories/add_story_tcase
```

```json
{
  "workspace_id": "12345678",
  "story_id": "1112345678000000001",
  "tcase_id": "1112345678000000101,1112345678000000102"
}
```

`tcase_id` 可为英文逗号分隔，单次不超过接口限制。权限至少涉及 `story#write`、`story#read`、`tcase#read`；遇到 403 时同时报告 TAPD 返回的具体权限，例如 `stories::add_story_tcase`。

回读：

```http
GET ${TAPD_API_BASE_URL}/stories/get_story_tcase?workspace_id=12345678&story_id=1112345678000000001
```

成功需在返回关联列表中找到全部 tcase ID。回读失败时输出“用例可能已创建，但 Story 关联未确认”，不删除用例。

## Failure handling

- HTTP 401：凭据无效或过期，停止。
- HTTP 403：输出 endpoint 和缺失 scope/权限，不重试写入。
- HTTP 404：检查 base URL、workspace 和 endpoint；不切换到猜测接口。
- HTTP 429/5xx：报告可重试，不自动循环写入。
- 非 JSON 或 `status != 1`：视为失败，保存脱敏摘要。
- 写后回读失败：标记“写入未确认”，不得宣称最终成功。
