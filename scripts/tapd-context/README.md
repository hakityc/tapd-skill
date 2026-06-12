# tapd-context

`tapd-context` 管理业务仓库内 Git 分支与 TAPD 工作项的本地绑定。它不调用
TAPD API，也不会执行 `git pull`、`git stash`、提交代码或修改 `.gitignore`。

## Runtime

- 用户运行环境：Node.js 18+，直接执行已提交的 `dist/cli.js`。
- 开发环境：Node.js、npm、固定版本 TypeScript 与 `node:test`。

## Commands

```bash
tapd-context detect-base
tapd-context init --user "开发者A" --base master
tapd-context start --input '{"entity_type":"Story","id":"...","title":"..."}'
tapd-context bind --input '{"entity_type":"Task","id":"..."}'
tapd-context current --format json
tapd-context status
```

`--input` 的首选格式是 TAPD Context JSON。标准 Story、Task、Bug detail URL
仅作为兼容输入。URL 缺少标题或用户时，CLI 保持缺失，不生成虚假值。

## Local files

CLI 只写：

- `.tapd/project.json`
- `.tapd/context.json`

日志目录 `.tapd/logs/` 预留给调用方。CLI 会提示将这三个路径加入
`.gitignore`，但不会自行修改项目文件。
