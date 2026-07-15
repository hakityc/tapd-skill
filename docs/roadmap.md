# Flow 路线图

## M1：规格发布与产品评审

- `.flow/spec.json` 平台无关规格 Manifest。
- Provider capability contract 与 TAPD Adapter 映射边界。
- 产品 Git Repo → TAPD Requirement 幂等发布。
- 规格 commit、验收点和远端工作项互相追溯。
- 产品文档 / 原型高影响审核。
- 产品评审 Gate、评审冻结和评审后变更摘要。

成功标准：产品经理不再手工复制完整文档；开发能确认自己读取的是已评审 commit。

## M2：评审到前后端开发

- 前端、后端和质量任务同时编排。
- 多仓库工作区初始化。
- 接口契约、依赖和联调检查点。
- 开发交接、MR/PR 与提测说明。

成功标准：后端进入同一需求上下文；前后端等待和重复澄清下降。

## M3：开发到质量验证

- `AC-*` 验收点映射 TAPD Case。
- AI E2E 使用统一 Case 格式。
- 测试环境结果、截图、视频和 Trace 回写。
- 失败结果生成关联 Defect 草案。

成功标准：开发前已有可执行 Case；测试证据能追溯到规格和代码版本。

## M4：质量到发布

- 发布 Gate 和未验证项确认。
- 测试环境与生产环境版本校验。
- 发布说明、生产冒烟和回滚摘要。
- 经确认的状态流转。

成功标准：每次发布都有完整规格、代码、Case 和证据链。

## M5：Provider 平台化

- Context ID 支持通用 Provider。
- 增加飞书 Adapter，同时保留 TAPD 兼容入口。
- 增加跨 Provider 迁移与双平台过渡策略。

成功标准：核心 Gate 不依赖 TAPD 专属概念；同一规格可以发布到不同 Provider。
