# TAPD Skill

面向 AI 编程代理的 TAPD 研发工作流 skill。它能读取 TAPD Story、Task、Bug，绑定 Git 分支上下文，辅助需求分析、拆任务、写代码、测试、收尾和生成简短日报。

[![skills.sh](https://skills.sh/b/hakityc/tapd-skill)](https://skills.sh/hakityc/tapd-skill/tapd)

<!-- README-I18N:START -->

[English](./README.md) | **简体中文**

<!-- README-I18N:END -->

> 示例中的 workspace、工作项 ID、昵称和需求标题均为虚构数据。

## 能做什么

- 粘贴 Story/Task/Bug 链接后读取需求、任务、缺陷和原型信息。
- 首次使用时在业务仓库生成本地 `.tapd/config.json`，并创建开发分支。
- 后续会话从当前分支恢复 TAPD 上下文，继续计划、编码、测试或收尾。
- Task 会回溯父 Story，Bug 会整理复现、影响、关联需求和回归范围。
- 创建/更新任务、测试用例、评论、工时前先 dry-run，并按 MCP 能力回读。
- 生成简短日报/站会简报：今日完成、进行中、风险、明日计划、数据统计。

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

团队成员只需要在自己的 agent 里配置个人 TAPD MCP token。Skill 本身不保存 token。

- MCP 官方文档：[modelcontextprotocol.io](https://modelcontextprotocol.io/docs/getting-started/intro)
- TAPD MCP 服务：[`mcp-server-tapd`](https://pypi.org/project/mcp-server-tapd/)
- 当前兼容基线：`mcp-server-tapd==8.0.78`
- 平台配置说明：[`references/mcp-bootstrap.md`](references/mcp-bootstrap.md)

首次在业务仓库粘贴 TAPD 链接时，Skill 会：

1. 探测 Git base 分支候选。
2. 让用户确认 base。
3. 生成 `.tapd/config.json`。
4. 创建开发分支并绑定当前工作项。

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

Skill 只会在业务仓库写本地状态：

```text
.tapd/config.json
.tapd/context.json
.tapd/logs/
```

建议手工加入项目 `.gitignore`：

```gitignore
.tapd/config.json
.tapd/project.json
.tapd/context.json
.tapd/logs/
```

CLI 不会自动修改 `.gitignore`。

## 安全边界

- 不执行 `git pull`、`git stash`，不自动提交 `.tapd`。
- 不自动流转 TAPD 状态。
- TAPD 远端读写只通过 MCP，不直接调用 OpenAPI。
- 远端写入默认 dry-run + 用户确认。
- owner 使用精确匹配，避免相似昵称误写。
- dirty worktree 检查只排除 `.tapd/config.json`、`.tapd/project.json`、`.tapd/context.json` 和 `.tapd/logs/**`。

## 运行要求

用户运行：

- Git
- Node.js 18+
- TAPD MCP：uv、Python 3.13+、`mcp-server-tapd`

`tapd-context` 已提交 bundled `dist`，用户不需要安装 npm 依赖。

## 开发验证

```bash
cd scripts/tapd-context
npm ci
npm test
cd ../..
python3 scripts/quick_validate.py .
```

## 说明

本项目是社区工作流工具，不代表 TAPD 官方。使用写入能力前，请确认 token 权限、目标 workspace 和 dry-run 内容。
