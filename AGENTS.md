# Repository Guidelines

## Project Structure & Module Organization

本仓库是基于当前 Cline 代码库演进的 NBG 独立仓库。`@cline/*` 运行时包暂时作为兼容层保留，面向用户的产品文案、测试断言、README 和提交信息优先使用中文与 NBG 品牌。主扩展代码在 `src/`，按 task、provider、controller、host 等领域组织。SDK 工作区在 `sdk/`：共享包在 `sdk/packages/*`，NBG CLI 在 `sdk/apps/cli`。Webview React 代码在 `webview-ui/src`，资源在 `assets/`，协议定义在 `proto/`，文档在 `docs/`。

测试通常与源码同目录，以 `*.test.ts` 命名，或放在附近的 `__tests__` 目录。不要编辑生成产物，例如 `dist/`、`dist-standalone/`、`node_modules/`、生成的模型目录和会话 `*.jsonl` 文件。不要直接操作大文件；需要查看或修改时分段读取、分段 patch。

## Build, Test, and Development Commands

- `cd sdk && bun install --backend=copyfile --ignore-scripts --omit=optional`: 在当前环境安装 SDK 工作区依赖；普通 `bun install` 可能因硬链接或 optional 包解压失败。
- `cd sdk && bun run build:sdk`: 构建共享 SDK 包。
- `cd sdk/apps/cli && bun script/build.ts --single`: 构建当前平台的 NBG CLI 二进制。
- `cd sdk/apps/cli && bun run test:unit`: 运行 NBG CLI 单元测试。
- `cd sdk/apps/cli && bun run typecheck`: 运行 CLI TypeScript 检查。
- `cd sdk && bun run check`: 运行格式、构建、类型检查和发布检查。

小范围修改优先跑窄测试，例如 `cd sdk/apps/cli && bun vitest run --config vitest.config.ts src/tui/components/status-bar.test.ts`。

## Coding Style & Naming Conventions

沿用目标包已有的 TypeScript 和 React 写法。文件按领域保持聚焦，优先复用现有 helper，避免无关重构。不要做全仓 `cline` 到 `nbg` 的机械替换：provider ID、存储路径、fixture、包名和兼容 API 必须逐步迁移。格式由 Biome 管理；大范围修改前运行 `cd sdk && bun run format` 或 `bun biome check`。变量/函数用 `camelCase`，React 组件和类型用 `PascalCase`，测试文件使用描述性的 `*.test.ts`。

## Testing Guidelines

单元测试使用 Vitest，部分 CLI 测试也可通过 Bun 测试运行器执行。行为变化必须补充或更新测试，尤其是 `core`、`llms` 和 `cli`。fixture 保持小而清晰，除非明确隔离或标注，不要加入真实网络测试。

## Commit & Pull Request Guidelines

后续提交信息使用中文，仍保留 Conventional Commits 结构，例如 `test(cli): 同步 NBG 中文化断言`。scope 保持具体，例如 `cli`、`llms`、`shared`、`core`。PR 需要包含清晰摘要、相关 issue、测试结果；涉及 UI/TUI 的变更附截图或终端输出。

## Security & Configuration Tips

不要提交 API key、认证 token、本机会话日志或生成凭据。provider 配置放在本地配置文件或环境变量。修改模型/provider 代码时必须保护请求隐私，避免记录 prompt 正文、密钥或原始认证头。
