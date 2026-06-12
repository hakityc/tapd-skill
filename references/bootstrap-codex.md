# Codex Bootstrap

## Evidence and status

- 来源：本机 `codex mcp add --help` 与 `~/.codex/config.toml`。
- 已验证：本会话 `tapd-mcp` 可运行，只读 `get_user_participant_projects` 成功。
- 已观察但未完整验证：通过 CLI 新增 server 后的 reload 流程。

## Command

```bash
codex mcp add \
  --env TAPD_ACCESS_TOKEN=<token> \
  --env TAPD_API_BASE_URL=https://api.tapd.cn \
  --env TAPD_BASE_URL=https://www.tapd.cn \
  --env CURRENT_USER_NICK=<nick> \
  tapd-mcp -- uvx mcp-server-tapd
```

CLI 会写入 Codex MCP 配置。不要直接改其他 `[mcp_servers.*]`。

## Reload and probe

新增配置后重启 Codex 会话/应用使 MCP 重新加载；准确热加载能力未验证。重新调用 `get_user_participant_projects`，再检查 workflow 必需工具。
