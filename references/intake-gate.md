# TAPD 需求 intake（强制阅读）

## 能力前置

- 先执行 `mcp-capability-matrix.md`。
- Story/Task P0 必须有 `get_stories_or_tasks`。
- `get_image` 是可选能力；缺失时必须列出未读取的原型图片，不能假装已查看。
- Bug P0 只保证本地 context 绑定。没有运行时可用的 Bug 读取工具时，停止完整 intake 并说明其属于 P1。

## 目标输出

- Story 核心约束清单（must/should/out-of-scope）
- 原型信息提取（菜单路径、字段、按钮、状态）
- Story ↔ Tasks 对照（覆盖/遗漏/冲突）
- 代码落点初筛（路由/菜单/页面/API/类型/i18n）

## 强制步骤

1. 从 context resolve 结果取得 `workspace_id`、`entity_type` 和字符串 ID。
2. 若入口是 Task：
   - 先调用 `get_stories_or_tasks(... entity_type='tasks', id=task_id, fields='id,name,description,status,owner,story_id,parent_id,...')`。
   - 从返回结果取得 `story_id`；不得把 task ID 当成 story ID。
   - 保留该 Task 作为“当前执行焦点”。
   - 若返回缺少 `story_id`，输出 Task-only intake 和缺失项，不猜测父 Story。
3. 若入口是 Story，当前 ID 即 `story_id`。
4. 获取父 Story：`get_stories_or_tasks(workspace_id, { entity_type: 'stories', id: story_id, fields: 'id,name,description,...' })`（必须带 `description`）。
5. 提取并查看原型图：若 `description` 有 `/tfl/captures/...png` 且存在 `get_image`，逐张获取下载地址并读取图片内容；缺少工具时记录 gap。
6. 拉取同 Story tasks：`get_stories_or_tasks(workspace_id, { entity_type: 'tasks', story_id, fields: 'id,name,description,status,owner,created,modified' })`。
7. 用仓库现状做边界：定位相关模块，形成“代码落点初筛”。
8. 输出“目标输出”四部分内容；Task 入口额外标明当前焦点 Task。

## 输出模板（必须）

按以下结构输出：

- **Story摘要**：标题、链接、关键背景（若缺失写“未提供”）  
- **硬约束（must）**：逐条列出（来自 description/原型）  
- **期望（should）**：逐条列出  
- **不在范围（out-of-scope）**：逐条列出（如果无法判断，写“未明确”）  
- **原型提取**：菜单路径 / 页面字段 / 按钮与开关 / 状态与权限可见性  
- **Story ↔ Tasks 对照**：覆盖点 / 漏点 / 冲突点  
- **代码落点初筛**：路由/菜单、页面组件、API、类型、i18n（路径列表即可）  
