# Claude Code Bootstrap

## Evidence and status

- 来源：本机 `claude mcp add --help`。
- 已观察：支持 stdio、`--scope` 和 `--env`。
- 未验证：本轮未实际执行 add、启动 server 或重开会话。

## Command draft

```bash
read -s TAPD_ACCESS_TOKEN
export TAPD_ACCESS_TOKEN
claude mcp add --scope user \
  --env TAPD_ACCESS_TOKEN="$TAPD_ACCESS_TOKEN" \
  tapd-mcp -- uvx mcp-server-tapd==8.0.78
unset TAPD_ACCESS_TOKEN
```

个人 token 是唯一必填 MCP 配置。版本 `8.0.78` 已作为当前兼容基线，但本平台启动流程仍标记为未完整验证。

优先使用官方 CLI，不直接 patch 未确认的 Claude 配置文件。

## Reload and probe

新增 MCP 后需新开 Claude Code 会话或按当前版本 reload；本轮未验证准确 reload 行为。新会话中调用 `get_user_participant_projects`，再核对目标 workflow 工具列表。
