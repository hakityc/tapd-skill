# Cursor Bootstrap

## Evidence and status

- 来源：本机 `~/.cursor/mcp.json` 的 `mcpServers` 结构。
- 已观察：stdio entry 使用 `command`、`args`、`env`。
- 未验证：本轮未在 Cursor 内完成写入、reload 和重新探测。

## Configuration

路径：`~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "tapd-mcp": {
      "command": "uvx",
      "args": ["mcp-server-tapd"],
      "env": {
        "TAPD_ACCESS_TOKEN": "<token>",
        "TAPD_API_BASE_URL": "https://api.tapd.cn",
        "TAPD_BASE_URL": "https://www.tapd.cn",
        "CURRENT_USER_NICK": "<nick>"
      }
    }
  }
}
```

仅在用户授权后最小 patch `mcpServers.tapd-mcp`，保留其他 server 和未知键。

## Reload and probe

Cursor 的具体 reload 操作在本轮未验证。要求用户按当前 Cursor 版本 reload MCP/窗口或重启，然后重新调用只读 `get_user_participant_projects`，再核对目标 workflow 工具。
