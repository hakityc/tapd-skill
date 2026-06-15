# tapd-context

`tapd-context` 管理业务仓库内 Git 分支与 TAPD 工作项的本地绑定。它不调用
TAPD API，也不会执行 `git pull`、`git stash`、提交代码或修改 `.gitignore`。

## Runtime

- 用户运行环境：Node.js 18+，直接执行已提交的 `dist/cli.js`。
- 开发环境：Node.js、npm、固定版本 TypeScript 与 `node:test`。

## Commands

```bash
tapd-context detect-base
tapd-context init --base master --workspace 12345678
tapd-context configure --user "开发者A"
tapd-context start --input '{"entity_type":"Story","id":"...","title":"..."}'
tapd-context bind --input '{"entity_type":"Task","id":"..."}'
tapd-context current --format json
tapd-context status
```

`--input` 的首选格式是 TAPD Context JSON。兼容标准 Story、Task、Bug detail URL
和 Story/Task prong view URL。URL 缺少标题或用户时，CLI 保持缺失，不生成虚假值。

## Local files

CLI 新版本只写：

- `.tapd/config.json`
- `.tapd/context.json`

`.tapd/project.json` 仅用于读取旧版本配置；新写入统一使用 `.tapd/config.json`。
日志目录 `.tapd/logs/` 预留给调用方。CLI 会提示将这些路径加入
`.gitignore`，但不会自行修改项目文件。
