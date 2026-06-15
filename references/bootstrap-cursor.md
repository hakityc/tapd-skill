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
      "args": ["mcp-server-tapd==8.0.78"],
      "env": {
        "TAPD_ACCESS_TOKEN": "<token>"
      }
    }
  }
}
```

仅在用户授权后最小 patch `mcpServers.tapd-mcp`，保留其他 server 和未知键。
个人 token 是唯一必填环境变量。

## Reload and probe

Cursor 的具体 reload 操作在本轮未验证。要求用户按当前 Cursor 版本 reload MCP/窗口或重启，然后重新调用只读 `get_user_participant_projects`，再核对目标 workflow 工具。
