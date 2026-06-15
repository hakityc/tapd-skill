# Codex Bootstrap

## Evidence and status

- 来源：本机 `codex mcp add --help` 与 `~/.codex/config.toml`。
- 已验证：本会话 `tapd-mcp` 可运行，只读 `get_user_participant_projects` 成功。
- 已观察但未完整验证：通过 CLI 新增 server 后的 reload 流程。

## Command

已验证的 `mcp-server-tapd` 版本：`8.0.78`。只需要个人 token；API 域名和当前用户由服务默认值及 token 自动解析。

```bash
read -s TAPD_ACCESS_TOKEN
export TAPD_ACCESS_TOKEN
codex mcp add \
  --env TAPD_ACCESS_TOKEN="$TAPD_ACCESS_TOKEN" \
  tapd-mcp -- uvx mcp-server-tapd==8.0.78
unset TAPD_ACCESS_TOKEN
```

CLI 会写入 Codex MCP 配置。不要直接改其他 `[mcp_servers.*]`。

## Reload and probe

新增配置后重启 Codex 会话/应用使 MCP 重新加载；准确热加载能力未验证。重新调用 `get_user_participant_projects`，再检查 workflow 必需工具。
