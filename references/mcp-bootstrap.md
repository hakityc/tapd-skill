# tapd-mcp Bootstrap Router

## 原则

先用只读工具探测服务，再检查目标 workflow 的能力矩阵。不要因为 server 在线就假定所有工具存在。

用户提供 token 时不要在对话或日志中回显。配置完成后必须 reload/restart，并重新执行只读探测及目标工具存在性检查。

当前兼容基线：

- `mcp-server-tapd==8.0.78`
- 验证日期：2026-06-15
- `uv`
- Python 3.13+
- MCP 配置只要求 `TAPD_ACCESS_TOKEN`

`TAPD_API_BASE_URL`、`TAPD_BASE_URL` 和 `CURRENT_USER_NICK` 不是云端 TAPD 的默认必填项。私有部署需要覆盖域名时再单独增加。

## Platform status

| 平台 | 配置来源 | 当前验证状态 | 自动 patch |
|---|---|---|---|
| Cursor | 本机 `~/.cursor/mcp.json` 结构观察 | 配置格式已观察；reload 与启动未验证 | 可在用户授权后最小 patch |
| Claude Code | `claude mcp add --help` | CLI 参数已观察；实际添加与 reload 未验证 | 优先 CLI，不直接猜配置文件 |
| Codex | `codex mcp add --help`、本机 `~/.codex/config.toml`、本会话探测 | 配置形状和 MCP 运行已验证；新增流程未完整验证 | 优先 CLI |
| Hermes | 本机 `~/.hermes/config.yaml` 和既有实践 | YAML 结构已观察；本轮未验证 restart | 可在用户授权后最小 patch |

分别读取：

- `bootstrap-cursor.md`
- `bootstrap-claude-code.md`
- `bootstrap-codex.md`
- `bootstrap-hermes.md`

未验证步骤必须如实标记，不写成确定结论。
