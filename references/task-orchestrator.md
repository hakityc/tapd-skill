# TAPD 任务编排（前端任务创建 / 回填）

## 前置

- 必须先通过 MCP 探测  
  - 若不可用，先走 `references/mcp-bootstrap.md`  
- 按 `references/mcp-capability-matrix.md` 检查读取和目标 create/update 工具。  
- 若要“基于需求拆任务”，必须先走 `references/intake-gate.md`  
- 所有修改遵守 `references/safety-policy.md`。  

## 创建任务（Story → tasks）

1. 读取 intake 输出：Story 约束、原型、代码落点初筛。  
2. **确认“我”是谁（强制）**：  
   - 优先使用用户输入中的 `当前用户：<nick>`  
   - 若缺失：读取 `CURRENT_USER_NICK`（来自 MCP env）  
   - 若仍缺失：尝试运行 `scripts/get_current_user.py` 通过 `GET /users/info` 自动获取 nick  
   - 若仍为空：**必须主动询问用户**“你的 TAPD nick（处理人字段）是什么？”  
3. 结合现有代码合理拆解任务：每条任务可独立验收。  
4. **Dry-run（强制）**：先输出将创建的任务列表（name/owner/范围摘要/预计工时（若有）/计划 begin-due（若有））。用户本轮未明确授权写入时必须等待确认；已明确要求直接创建时，展示摘要后继续。  
5. 创建 tasks（强制补 owner）：  
   - 每条 `【前端】...` task 创建时默认 `owner=<我的nick>;`（除非用户明确指定其它 owner）  
   - 调用 `create_story_or_task(workspace_id, name, { entity_type: 'tasks', story_id, owner, description, ... })`  
6. **回读校验（强制）**：创建后再拉取一次 tasks，确认 ID/owner/description 写入成功。  
7. 返回每条 task 的可点击链接。  

## 批量回填 owner + effort

1. **确认“我”是谁（强制）**：同“创建任务”第 2 步。  
2. 拉取该 Story 下 tasks：`get_stories_or_tasks(workspace_id, { entity_type: 'tasks', story_id, ... })`。  
3. 只筛选 `【前端】` 前缀任务。  
4. **安全过滤（强制）**：  
   - 按 `safety-policy.md` 的 owner 分隔符精确匹配规则判断本人。  
   - 仅允许对精确匹配当前 nick 的任务执行任何修改（effort / status / description / owner 等）。  
   - 对非本人任务：只展示，不修改，并在输出中注明“已跳过（非本人任务）”  
5. **Dry-run（强制）**：先展示“将被修改”的候选清单（id/name/owner/旧值→新值）；未授权时等待确认。  
6. 执行批量更新：`update_story_or_task(workspace_id, { entity_type: 'tasks', id, ... })`。  
7. **回读校验（强制）**：更新后重新拉取并对比关键字段，确认写入成功。  

## 安全护栏

- **创建任务默认 owner=我**：除非用户明确指定其它 owner；若不知道“我”是谁，必须主动询问。  
- **修改只改本人任务**：任何更新类操作仅作用于 owner token 精确匹配“我”的任务；`开发者A同学` 不匹配 `开发者A`。  
- **写前 dry-run、写后回读**：任何写操作都必须先输出变更清单，再回读校验结果。  
