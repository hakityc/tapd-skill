# Hermes Bootstrap

## Evidence and status

- 来源：本机 `~/.hermes/config.yaml` 结构和既有 skill 文档。
- 已观察：`mcp_servers.tapd-mcp` 使用 command、args、env。
- 未验证：本轮未重启 Hermes gateway 或重新探测。

## Configuration

路径：`~/.hermes/config.yaml`

```yaml
mcp_servers:
  tapd-mcp:
    command: uvx
    args:
      - mcp-server-tapd
    env:
      TAPD_ACCESS_TOKEN: "<token>"
      TAPD_API_BASE_URL: "https://api.tapd.cn"
      TAPD_BASE_URL: "https://www.tapd.cn"
      CURRENT_USER_NICK: "<nick>"
```

只在用户授权后最小 patch `mcp_servers.tapd-mcp`，保留其他 server 和 env。

## Restart and probe

CLI 通常需要新开会话，gateway 通常需要重启进程；本轮未验证具体命令。重启后调用 `get_user_participant_projects`，再核对 workflow 工具。
