---
name: tapd
description: 处理 TAPD 需求、任务、缺陷、用例和研发交付，包括需求梳理、拆解、排期、开发及进展同步。用户明确提到 TAPD、Story、Task、Bug 或 TAPD 分支上下文时使用。
---

# TAPD 工作流

使用 TAPD 宿主 MCP 处理工作项和研发交付。先读取 `references/core/execution.md` 与 `references/connectors/tapd.md`，根据当前意图按需加载以下规则；本轮明确指定的工作项优先于旧绑定。

- 创建、读取或修改需求、任务、缺陷：`references/workflows/workitems.md`；生成或精简需求正文另读 `references/workflows/requirement-writing.md`。
- 需求 intake、任务拆解、研发计划、实现、测试、排期、评论、工时、日报、产品规格与评审：`references/workflows/delivery.md`，再按表格加载对应 TAPD 专项规则。
- 缺少连接或认证失败：`references/core/onboarding.md`。优先复用已可用的宿主 MCP，不要求重配；发现目标能力并核对运行时工具 schema。
- Git 分支绑定与旧数据迁移：`references/core/context.md`。普通需求操作不要求 Git 仓库。

用户已明确授权的操作无需重复确认；写入前检查目标和变更，写后回读，失败或未知状态如实报告。不要绕过宿主 MCP 直接请求 TAPD 业务 API。仅草拟不等于授权写入；未经请求不启用自动同步或通知。

随 skill 附带的 CLI 和引用沿用 WorkBridge 的连接实现，状态仍在原 WorkBridge 配置目录，不迁移、不覆盖已有连接。维护已由 WorkBridge 注册的连接时，使用该连接原来的 CLI 路径，避免改变宿主登记或所有权判断；需要执行命令时先展示实际绝对路径。本 skill 只支持 TAPD。
