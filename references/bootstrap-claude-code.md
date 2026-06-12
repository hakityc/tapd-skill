# Claude Code Bootstrap

## Evidence and status

- 来源：本机 `claude mcp add --help`。
- 已观察：支持 stdio、`--scope` 和 `--env`。
- 未验证：本轮未实际执行 add、启动 server 或重开会话。

## Command draft

```bash
claude mcp add --scope user \
  --env TAPD_ACCESS_TOKEN=<token> \
  --env TAPD_API_BASE_URL=https://api.tapd.cn \
  --env TAPD_BASE_URL=https://www.tapd.cn \
  --env CURRENT_USER_NICK=<nick> \
  tapd-mcp -- uvx mcp-server-tapd
```

优先使用官方 CLI，不直接 patch 未确认的 Claude 配置文件。

## Reload and probe

新增 MCP 后需新开 Claude Code 会话或按当前版本 reload；本轮未验证准确 reload 行为。新会话中调用 `get_user_participant_projects`，再核对目标 workflow 工具列表。
