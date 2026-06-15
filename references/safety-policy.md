# TAPD Safety Policy

## 本地 Git 与 context

- 明确的“开始”允许创建业务分支并写 `.tapd/context.json`。
- 明确的“绑定”允许写当前分支 context。
- 首次 init 的 base 候选必须展示并确认。
- 已有配置、已有绑定或新旧工作项冲突时默认不覆盖。
- 不执行 pull、stash、强制 checkout、自动删分支、自动提交或修改 `.gitignore`。
- dirty 检查仅豁免 `.tapd/config.json`、兼容旧版的 `.tapd/project.json`、`.tapd/context.json`、`.tapd/logs/**`。
- JSON 使用原子写入；损坏文件停止处理，不用空文件覆盖。

## TAPD 远端写入

所有创建/更新任务、测试用例、评论、工时、排期和 OpenAPI 写入：

1. 先展示 dry-run：对象、关键字段、旧值到新值和预计影响。
2. 用户本轮未明确授权写入：等待确认。
3. 用户已明确说“直接创建/同步/写回”：展示简短 dry-run 后可在本轮执行。
4. 执行后使用可用读取能力回读。
5. 缺少回读能力时必须说明“写入返回成功，但无法列表回读”。
6. 回读与写入结果不一致时标记“写入未确认”。

本地 context 写入不套用 TAPD 远端 dry-run，但仍遵守 base、冲突和覆盖确认。

## Owner 精确匹配

owner 字段可能是：

```text
开发者A;
张三;开发者A;
张三，开发者A
```

统一判断：

1. 按 `;`、`；`、`,`、`，` 和任意空白切分。
2. 对每段 trim。
3. 过滤空值。
4. 任一 token 与当前 nick 完全相等才视为本人。

禁止 substring。`开发者A同学`、`小开发者A` 不得匹配 `开发者A`。任务编排和估时排期必须引用本文件，不各自发明规则。

## 凭据与失败

- 不输出 token、Authorization header 或包含 token 的异常。
- MCP/HTTP 失败不得宣称已写入。
- TAPD 远端读写只通过运行时 MCP 工具执行。
- 必需工具缺失时先 bootstrap、升级或 reload；仍缺失则停止远端步骤。
- Skill 不读取 MCP 子进程 token，也不直接调用 TAPD OpenAPI。
- MCP 写入后的回读失败统一标记“写入未确认”。
