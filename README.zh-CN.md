# TAPD Skill

面向团队的 AI 研发交付工作流。它以产品 Git 仓库为规格事实源、以 TAPD 为首个协作 Provider，把需求发布、产品评审、开发执行、测试验证和交付追踪串成一条可复用链路；未来可在不改变团队流程的前提下接入飞书等平台。

[![skills.sh](https://skills.sh/b/hakityc/tapd-skill)](https://skills.sh/hakityc/tapd-skill/tapd)

<!-- README-I18N:START -->

[English](./README.md) | **简体中文**

<!-- README-I18N:END -->

> 示例中的 workspace、工作项 ID、昵称和需求标题均为虚构数据。

## 能做什么

- 从产品仓库的 `.flow/spec.json` 幂等创建或更新 TAPD Story，绑定精确规格 commit 和稳定验收点 ID。
- 产品经理无需手写 Manifest；说“初始化产品流程”后由 AI 生成 scope/验收点草案，并通过 bundled CLI 做 Git 版本和路径硬校验。
- 生成产品评审包，由人确认评审结论并冻结 `reviewed_ref`；规格变化后自动识别需要增量复审。
- 粘贴 Story/Task/Bug 链接后读取需求、任务、缺陷和原型信息。
- 首次使用时在业务仓库生成本地 `.tapd/config.json`，并创建开发分支。
- 后续会话从 Git dir 本机绑定或 `tapd-*` 分支名恢复 TAPD 上下文，继续计划、编码、测试或收尾。
- Task 会回溯父 Story，Bug 会整理复现、影响、关联需求和回归范围。
- 编码前对产品文档、原型和 tasks 做高影响审核，只找会导致返工、阻塞联调或影响验收的问题；用户确认后可同步到 TAPD 评论。
- 创建/更新任务、测试用例、评论、工时前先 dry-run，并按 MCP 能力回读。
- 按前端、后端、测试、产品或负责人 profile 拆分任务，默认先展示估时排期，确认后再写回 effort/begin/due。
- 生成简短日报/站会简报：今日完成、进行中、风险、明日计划、数据统计。
- 生成“今天做什么”清单：从当前迭代中本人未完成的任务按进行中、逾期、优先级、截止日期和容量排序，而非只看今天截止的任务。

## 为什么绑定分支

TAPD 是需求上下文，Git 分支是代码上下文。

把两者绑定后，AI 在后续任何会话里都能知道：

- 当前分支对应哪个 Story、Task 或 Bug
- 去哪里重新读取需求、父 Story、相关 tasks、Bug 备注和评论
- 收尾前要验证什么
- TAPD 评论、工时草案和完成说明应该同步到哪个工作项

这解决的是 AI 编程里最常见的问题：会话一断，上下文就没了。

## 日常工作流

给团队成员的完整场景、命令和试用步骤见：[团队使用手册](docs/team-user-guide.zh-CN.md)。

| 场景 | 你说 | Skill 做什么 |
|---|---|---|
| 发布需求 | `/tapd 从当前产品仓库发布需求` | 校验规格 Manifest，幂等创建/更新 TAPD Story并回填映射 |
| 初始化产品流程 | `/tapd 初始化当前产品仓库的 Flow 需求` | 分析已提交文档和原型，确认后生成并校验 `.flow/spec.json` |
| 产品评审 | `/tapd 准备产品评审` | 生成评审包，由人确认结论并冻结已评审规格版本 |
| 开始需求 | `/tapd 开始做 <Story 链接>` | 创建分支、绑定 TAPD、读取需求 |
| 开始任务 | `/tapd 开始做 <Task 链接>` | 读取 Task，并回溯父 Story |
| 修 Bug | `/tapd 修这个 Bug <Bug 链接>` | 读取复现、影响、评论和回归范围 |
| 编码前审核 | `/tapd 先审一下产品文档和原型差异` | 找出会导致返工/阻塞/验收歧义的问题，确认后写 TAPD 评论 |
| 继续开发 | `/tapd 继续开发` | 从当前 Git 分支恢复上下文 |
| 拆任务回填 | `/tapd 建个分支，合理拆分任务回填到 TAPD` | 按 profile 创建任务、写 owner/description，确认后补 effort/begin/due |
| 开发收尾 | `/tapd 收尾` | 检查改动、运行验证、生成评论和工时草案 |
| 站会汇报 | `/tapd 站会简报` | 汇总完成、进行中、风险和明日计划 |
| 今日待办 | `/tapd 看看我今天有哪些活要干` | 从当前迭代未完成任务中挑选今天优先推进的事项 |
| 团队盘点 | `/tapd 看下当前迭代团队负载和风险` | 只读汇总成员 WIP、逾期、阻塞和无人负责事项 |

## 安装

```bash
npx skills add hakityc/tapd-skill --skill tapd --global --yes
```

Skills CLI 会自动识别当前 agent。若要指定某个 agent，可追加 `--agent <agent-name>`。

## 更新

```bash
npx skills update tapd --global --yes
```

## 最简配置

这个 skill 不内置 TAPD MCP 服务。Skill 负责编排工作流，MCP 服务负责访问 TAPD 和管理 token。

成员不需要预先学习 `setup`、`doctor` 或 `init` 命令：直接说“帮我创建需求”或“开始做这个需求”即可。Skill 会自动诊断环境，并只在首次连接 TAPD、缺少权限或缺少业务信息时引导当前的一步。个人 TAPD token 仍需要由本人完成一次安全授权；Skill 不保存 token，也不会要求把 token 发到聊天、文档或 Git 仓库。

- MCP 官方文档：[modelcontextprotocol.io](https://modelcontextprotocol.io/docs/getting-started/intro)
- TAPD MCP 服务：[`mcp-server-tapd`](https://pypi.org/project/mcp-server-tapd/)
- 当前兼容基线：`mcp-server-tapd==8.0.78`
- 平台配置说明：[`tapd/references/mcp-bootstrap.md`](tapd/references/mcp-bootstrap.md)

首次在业务仓库表达 TAPD 业务目标时，Skill 会：

1. 探测 Git base 分支候选。
2. 让用户确认 base。
3. 生成 `.tapd/config.json`。
4. 创建 `tapd-story|task|bug-<id>` 开发分支并绑定当前工作项。

团队推广时可将 `tapd/examples/team.example.json` 复制为业务仓库的 `.tapd/team.json` 并提交，用于统一 profile 前缀、修改范围、估时参数与写回策略。个人昵称和个人覆盖项仍保存在不提交的 `.tapd/config.json`。配置优先级为：本轮输入 > 个人配置 > 团队策略 > 安全默认值。

产品仓库只需提交产品文档和原型；缺少 `.flow/spec.json` 时，产品经理直接说“根据当前文档创建需求”，AI 会生成范围和验收点草案，确认后再生成并校验 Manifest。产品经理不需要手写 JSON；[`tapd/examples/spec-manifest.example.json`](tapd/examples/spec-manifest.example.json) 仅用于参考，字段约束见 [`tapd/scripts/tapd-context/schemas/spec-manifest.schema.json`](tapd/scripts/tapd-context/schemas/spec-manifest.schema.json)。

生成的本地配置类似：

```json
{
  "version": 1,
  "base_branch": "master",
  "workspace_id": "12345678"
}
```

## 常用方式

```text
/tapd 开始做 https://www.tapd.cn/12345678/prong/stories/view/1112345678000000001
/tapd 继续开发
/tapd 这个需求做完了，帮我收尾
/tapd 生成今天的站会简报，workspace_id=12345678，当前用户=开发者A
```

支持的常见链接：

```text
/tapd_fe/<workspace_id>/story/detail/<story_id>
/tapd_fe/<workspace_id>/task/detail/<task_id>
/tapd_fe/<workspace_id>/bug/detail/<bug_id>
/<workspace_id>/prong/stories/view/<story_id>
/<workspace_id>/prong/tasks/view/<task_id>
/<workspace_id>/bugtrace/bugs/view/<bug_id>
```

## 本地文件

Skill 按敏感程度拆分本地状态：

```text
.flow/spec.json                    产品规格清单（产品仓库提交）
.tapd/config.json                  项目配置
.tapd/team.json                    团队共享策略（建议提交）
$GIT_DIR/tapd-context/             本机分支绑定
~/.tapd-context/cache/             个人工作项缓存
.tapd/active-context.md            生成给 Agent 读取的上下文
.tapd/context.json                 旧版只读迁移路径
```

建议手工加入项目 `.gitignore`：

```gitignore
.tapd/config.json
.tapd/project.json
.tapd/context.json
.tapd/active-context.md
.tapd/logs/
```

CLI 不会自动修改 `.gitignore`。

不要把 `.tapd/team.json` 加入 `.gitignore`；该文件不得包含 token 或个人昵称。

为了让同事接手时更无痛，建议保留默认分支命名协议，例如 `feat/tapd-story-1112345678000000001-action-item`。同事 checkout 后执行 `/tapd 继续开发`，skill 可以先从分支名恢复 TAPD 身份，再通过 MCP 补全详情。

## 安全边界

- 不执行 `git pull`、`git stash`，不自动提交 `.tapd`。
- 不自动流转 TAPD 状态。
- TAPD 远端读写只通过 MCP，不直接调用 OpenAPI。
- 远端写入默认 dry-run + 用户确认。
- owner 使用精确匹配，避免相似昵称误写。
- dirty worktree 检查只排除 `.tapd/config.json`、`.tapd/project.json`、`.tapd/context.json`、`.tapd/active-context.md` 和 `.tapd/logs/**`。

## 运行要求

用户运行：

- Git
- Node.js 18+
- TAPD MCP：uv、Python 3.13+、`mcp-server-tapd`

`tapd-context` 已提交 bundled `dist`，用户不需要安装 npm 依赖。

## 开发验证

```bash
cd tapd/scripts/tapd-context
npm ci
npm test
cd ../..
python3 scripts/quick_validate.py .
```

## 说明

本项目是社区工作流工具，不代表 TAPD 官方。使用写入能力前，请确认 token 权限、目标 workspace 和 dry-run 内容。

当前只实现 TAPD Provider；完整产品定位和演进顺序见 [`docs/product-vision.md`](docs/product-vision.md) 与 [`docs/roadmap.md`](docs/roadmap.md)。
