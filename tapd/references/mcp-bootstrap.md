# tapd-mcp Bootstrap Router

## 面向用户的按需配置

这是 Agent 的内部恢复流程，不是要求产品、研发或测试成员背诵的操作手册。用户说“帮我创建需求”“开始做这个需求”“生成测试用例”等业务意图时：

1. 先自动执行本地 `tapd-context doctor` 和只读 MCP 探测；不得先抛出安装说明。
2. MCP 正常且目标能力存在时，直接回到原请求继续执行。
3. 仅在 MCP 未安装、未连接、权限不足或缺少目标工具时，说明当前影响和唯一下一步；完成后自动重新探测并恢复原请求，不要求用户重复输入。
4. Token 只能通过宿主工具提供的安全输入、账号授权或本机隐藏输入完成。不得让用户粘贴到聊天、Issue、产品文档、`.tapd/*.json`、命令历史或日志中。
5. 新增或修改 MCP 配置属于个人环境变更：先说明将变更的宿主配置和 server 名称，获得授权后才执行；配置完成必须 reload/restart 并再次只读探测。

当前 Skill 没有跨宿主的安全授权 UI 时，不得把“无感知”表述为“无需授权”。应使用“只需首次连接一次 TAPD，之后由 AI 自动检查和恢复”的表述。

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
