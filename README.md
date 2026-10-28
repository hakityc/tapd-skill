# TAPD Skill

面向 TAPD 的 Agent skill，支持需求、任务、缺陷、测试用例和研发交付。通过宿主提供的 TAPD MCP 完成业务操作，读取运行时能力后按需路由；工作项写入遵循用户授权并回读验证。

## 安装

```bash
npx skills add hakityc/tapd-skill --skill tapd
```

安装后重新打开或重载 Agent。可使用 `$tapd` 或直接提出 TAPD 请求。

## 运行环境

已有可用 TAPD MCP 时直接复用，不必迁移连接。分支绑定与连接管理 CLI 需要 Node.js 22+。首次使用 CLI 前，在安装后的 skill 的 `scripts` 目录运行 `npm ci`；TAPD MCP 还需要 `uv` 和 Python 3.13+。预构建的 CLI 随 skill 提供。

首次连接时，Agent 会给出展开为本机实际路径的命令；个人访问令牌只在用户自己的终端隐藏输入，不要贴到聊天中。调用业务接口始终通过宿主 MCP；CLI 探测成功不代表宿主已加载该服务。

连接实现沿用 WorkBridge 的本地配置和注册标识。已有 WorkBridge 管理的连接应继续使用原 CLI 路径维护，不自动迁移或覆盖。Discourse 不属于此 skill。

## 开发验证

```bash
npm --prefix tapd/scripts ci
npm --prefix tapd/scripts/tapd-context ci
python3 tapd/scripts/quick_validate.py
```
