# 工作项操作

需要 workitem.<kind>.<operation> 能力；先读取公共执行规则和选定连接器。

读取：明确空间与 ID，读取完整正文和必要关联，分页不足时报告范围。创建：先查重复项，整理标题、目标、范围、验收和用户指定字段。更新：先读旧值，仅改变点名字段，保留人工维护内容。

生成或精简需求正文时读取 `references/workflows/requirement-writing.md`；需求文案按六段格式输出，验收只抓核心结果，通常 1–3 条。仅修改其他字段时不重写正文。

需求**创建并回读成功后**，默认进入一次“任务拆分草案”：读取新 Story 与已有 tasks，按独立验收切片生成 Task 表单，再询问是否创建。它不自动创建 Task、不写入 effort/begin/due、不流转状态；用户说“不要拆任务”时跳过。需求修改不触发拆分。

每条草案必须展示 name、范围/验收、owner、effort、begin、due。owner 优先用户指定值，其次当前 `user_nick`；effort 为 AI 建议；日期只用用户明确值或明确授权继承的窗口。任何必填值缺失都标为“待填写”，一次性询问后才可生成写入 dry-run。具体拆分、字段和确认规则按 `../tapd/work-item-orchestrator.md` 与 `../tapd/task-orchestrator.md`。

写前展示实际目标与变更，核对授权；写后通过 read 能力回读。创建成功但关联失败分别报告，不重建已存在对象。

缺陷的预计开始、预计结束或预计修复日期属于排期字段，不得仅写进 description 就报告“已排期”。创建或更新 Bug 时，先读目标和当前 `create_bug`/`update_bug` 的运行时 schema；只把用户明确标注的日期写入该 schema 实际暴露的原生日期字段（例如 `begin`、`due` 或 `deadline`），再用 `get_bug` 回读相同字段。目标字段未暴露、不可写或回读为空时，明确报告“未完成排期”；只能在用户明确选择“仅作备注”后，才把日期写入 description，并同时说明它不是 TAPD 排期。
