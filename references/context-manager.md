# TAPD Context Manager

## 目标

在进入后续工作流前，解析本轮工作项或恢复当前 Git 分支绑定。不要让旧分支 context 覆盖用户本轮明确提供的新工作项。

## CLI 定位与 cwd

1. 用 `git rev-parse --show-toplevel` 确定项目根目录；失败则停止本地 context 流程。
2. 在项目根目录执行所有命令。
3. 调用顺序固定：
   - PATH 中存在 `tapd-context`：使用该命令。
   - 否则使用 `node <skill目录>/scripts/tapd-context/dist/cli.js`。
   - bundled dist 不存在或 Node 低于 18：报错停止。

不要临时运行 TypeScript 源码，也不要要求用户安装 npm 依赖。

## Context resolve

按以下优先级寻找工作项：

1. **本轮 Context JSON**：识别包含 `entity_type` 和 `id` 的 JSON 对象。
2. **本轮 TAPD URL**：支持标准 detail 链接及 `/<workspace>/prong/stories|tasks/view/<id>`。
3. **当前分支 context**：调用 `current --format json`；仅在本轮没有任何明确新工作项输入时使用。
4. **旧格式文本**：解析 `类型`、`标题`、`工作项 id`、`链接`、`当前用户`，转换为 Context JSON。检测到这些字段即视为本轮新工作项输入，不得被步骤 3 的旧 context 覆盖。
5. 仍无工作项时询问用户提供 Context JSON 或标准 TAPD URL。

旧格式包含链接时，链接解析出的 `workspace_id/entity_type/id` 是身份真相；周围文本只补充 `title/user_nick`。冲突字段不得覆盖 URL 身份。

Story/Task 只有 URL 且缺标题时，优先使用 MCP 读取工具补全。准备执行 `start` 时，若标题仍缺失或标题无法产生英文 slug，skill 应根据已读取的标题生成简短英文 `--slug`；MCP 不可用时才降级为 ID slug。不得伪造标题或用户。Bug 缺少读取能力时只允许本地绑定，不进入完整 intake。

## 开始新需求

适用于“开始做、初始化、处理这个需求/任务/缺陷”等意图。

1. 解析本轮新工作项 B。
2. 调用 `current --format json` 检查当前分支：
   - `CONTEXT_NOT_FOUND`：继续。
   - 已绑定 A 且 A 与 B 不同：展示 A、B 和“将从 base_branch 创建新分支”，等待确认；不复用 A、不覆盖 A。
3. 若输入是 URL，先完成只读 MCP 补全，再调用 `start --input '<JSON>' [--slug '<english-slug>']`。不要先创建低可读性分支、再补标题。
4. 若返回 `PROJECT_NOT_INITIALIZED`：
   - 使用错误详情中的 candidates，必要时调用 `detect-base`。
   - 候选按用户指定、`origin/HEAD`、本地 `master`、本地 `main` 排序。
   - 向用户展示候选 base；workspace 优先取输入 URL/JSON。
   - 用户确认后执行 `init --base ... [--workspace ...]`，自动生成 `.tapd/config.json`。昵称不是初始化必填项。
   - 重试 `start`。
5. start 成功后再进入 MCP 能力门禁和 intake。

“开始新需求”明确授权创建本地分支和 context 文件，但 base 候选、绑定冲突与覆盖仍需确认。

## 绑定当前分支

1. 解析本轮工作项。
2. 执行 `bind --input '<JSON>'`。
3. 若返回 `PROJECT_NOT_INITIALIZED`，按“开始新需求”相同规则确认 base、生成 `.tapd/config.json`，再重试 bind。
4. `CONTEXT_ALREADY_BOUND` 时展示旧、新工作项并等待确认。
5. 只有用户确认覆盖后才重试 `bind ... --force`。
6. 成功后进入 MCP 能力门禁；Story/Task 可进入 intake，Bug 按可选能力处理。

## 继续与状态

没有新工作项输入时执行 `current --format json`：

- 成功：使用绑定工作项进入目标 workflow。
- `CONTEXT_NOT_FOUND`：要求提供 Context JSON、URL 或执行绑定。
- `DETACHED_HEAD`：要求先切换到命名分支。
- `INVALID_CONTEXT_FILE`：停止并提示修复 JSON，不覆盖损坏文件。
- `NOT_GIT_REPO`：停止本地 context 流程。

根据错误码决策，不匹配中文 message。

## 安全提示

`init/start/bind` 成功后可以提示用户手工加入 `.gitignore`：

```gitignore
.tapd/config.json
.tapd/project.json
.tapd/context.json
.tapd/logs/
```

`.tapd/project.json` 是旧格式兼容路径。不得自动修改 `.gitignore`、pull、stash 或提交这些文件。
