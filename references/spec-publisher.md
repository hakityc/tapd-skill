# Flow 产品规格发布（Git Spec → Work Item）

产品经理说“发布需求、把产品文档同步到 TAPD、从原型仓库创建需求、更新评审需求”时使用。本流程是平台无关工作流，当前只实现 TAPD Provider；未来协作平台必须复用同一规格 Manifest 和发布语义。

## 产品事实源

- 产品 Git Repo 是完整规格事实源，默认清单路径为 `.flow/spec.json`。
- TAPD Story 是协作与执行中心，保存可读摘要、验收点、规格版本、任务、评论和风险。
- 前后端代码仓库是实现事实源。
- 不允许产品 Git 文档和 TAPD 生成区块自由双向编辑。规格从 Git 单向发布；评审决定必须回写产品 Repo 后再发布新版本。

Manifest 结构遵守 `scripts/tapd-context/schemas/spec-manifest.schema.json`，示例见 `examples/spec-manifest.example.json`。

## 能力前置

1. 读取 `references/provider-contract.md`、`references/team-policy.md` 和 `references/safety-policy.md`。
   - 新建需求需当前 profile 允许 `create-requirement`；更新需求需允许 `update-requirement`。
2. 当前 Provider 为 TAPD 时，按 `references/mcp-capability-matrix.md` 探测：
   - 新建 Requirement：`get_stories_or_tasks` + `create_story_or_task`，`entity_type='stories'`。
   - 更新 Requirement：`get_stories_or_tasks` + `update_story_or_task`。
   - 评审说明：可选 `create_comments`，回读可选 `get_comments`。
3. 缺少 Provider 写能力时仍输出发布草案，但不得直接调用 OpenAPI。

## Manifest Gate

发布前必须：

1. 定位产品 Repo 根目录和 `.flow/spec.json`。
2. 校验 JSON 结构、`spec_id`、标题、scope、至少一个验收点，以及验收 ID 唯一。
3. 校验 `source.document`、`source.prototype_paths` 和可选 decisions 文件都在产品 Repo 内，拒绝 `..` 越界路径。
4. 解析 `source.ref` 为精确 commit；若是分支、tag 或 `HEAD`，发布 dry-run 中展示解析值，并计划回填完整 commit。
5. 使用该 commit 读取产品文档和原型，不自动 checkout、pull、stash 或修改分支。
6. 工作区有未提交修改时允许生成“草稿预览”，但不得标记为正式发布；正式发布必须引用已提交 commit。
7. `publication.provider` 缺失时当前默认 `tapd`；非 `tapd` Provider 尚未实现时停止远端步骤，不伪装成功。

## 规格审核

读取产品文档、原型和 Manifest 后生成：

- 背景与目标。
- in-scope / out-of-scope。
- must / should。
- `AC-*` 验收点。
- 页面、字段、按钮、状态和权限。
- 文档与原型的高影响差异。
- 前端、后端和质量任务草案。
- API、数据、历史兼容和发布风险。

高影响差异未确认时，允许发布为 `review.status=changes-required` 的草稿，但不得标记为评审通过。

## 幂等发布

`spec_id + publication.provider + publication.space_id` 是发布幂等键。

### 首次发布

Manifest 没有 `publication.external_id` 时：

1. 使用稳定标题 `【FLOW:<spec_id>】<title>`，受管描述与标题必须在一次创建调用中提交。
2. 创建前按稳定标题查询候选并检查描述中的同 `spec_id` 受管标记：无匹配才允许创建；唯一匹配则展示“恢复远端映射”dry-run；多条匹配时停止并要求人工选择。
3. 展示 Story name、workspace、生成描述、规格 commit 和验收点 dry-run。
4. 用户已明确说“发布/创建需求”时，展示摘要后可创建；否则等待确认。
5. 创建后回读 Story，取得 ID 和 URL。
6. 更新 `.flow/spec.json` 的 `publication`：provider、space_id、entity_type、external_id、url、published_ref。
7. 不自动 git commit 产品 Repo；输出待提交的 Manifest 变更。

恢复探测是首次发布幂等性的一部分，不是可选优化。创建成功但进程中断或 Manifest 未回填时，重试必须先找到带同一稳定标题与受管标记的 Story，再恢复映射，禁止直接创建第二条。

### 后续发布

Manifest 已有 `publication.external_id` 时：

1. 强校验 Provider、space 和远端 Requirement ID。
2. 回读远端完整 description。
3. 只替换由 Flow 管理的规格区块，保留区块外人工内容。
4. 若现有 Story 没有 Flow 标记，不得直接接管；展示“采用为受管需求”的 dry-run 并等待确认。
5. `published_ref` 与当前精确 commit 相同且远端受管区块已等于本轮期望内容时，才视为幂等命中；review 状态等元数据变化时仍需更新受管区块。
6. 写后回读，并把新 commit 写入 `publication.published_ref`。

受管区块使用稳定可见标记，避免平台清理 HTML comment：

```text
【FLOW-SPEC-BEGIN:<spec_id>】
<生成的规格摘要、范围、验收点和版本链接>
【FLOW-SPEC-END:<spec_id>】
```

不得要求成员手工修改标记区块；评审意见写评论，正式规格变化回到产品 Repo。

## TAPD 描述模板

受管区块至少包含：

```text
【FLOW-SPEC-BEGIN:<spec_id>】
规格来源：<repo_url>
规格版本：<full commit>
产品文档：<document path>
原型：<prototype paths>

目标与范围：
- ...

不在范围：
- ...

验收标准：
- AC-01 [must] ...
- AC-02 [should] ...

评审状态：draft / reviewing / approved / changes-required
【FLOW-SPEC-END:<spec_id>】
```

## 发布完成输出

- Requirement 链接与 Provider。
- `spec_id`、published_ref、reviewed_ref。
- 新建 / 更新 / 幂等跳过状态。
- 产品 Repo 待提交文件。
- 高影响差异和数据缺口。
- 下一动作：发起产品评审或重新发布修订版本。

## 失败处理

- 规格文件缺失或路径越界：停止发布，不猜测文件。
- source.ref 无法解析：停止正式发布，只输出草稿。
- 远端写入成功但 Manifest 回填失败：标记“远端已创建、本地映射未完成”，给出 external ID；若响应也丢失，下次按稳定标题与受管标记恢复，禁止重复创建。
- Manifest 有 external ID 但远端不存在：停止并要求确认新建或修复映射。
- Provider 能力缺失：保留发布草案，不绕过 Provider Adapter。
