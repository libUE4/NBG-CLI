# NBG SDK 示例

这些示例展示如何基于当前兼容 SDK 构建 NBG 智能体应用，按从简单到复杂排序。当前公共 SDK 包名仍保留 `@cline/*` 兼容入口。

## Agent 上下文

如果使用 Codex、Claude Code 或其他 coding agent，请先读取仓库根目录的 `AGENTS.md` 和 `docs-internal/commercialization-plan.md`。在支持技能的环境中，可以加载本地 `cline-sdk` 技能，明确当前 `@cline/*` 是兼容层，公开产品方向是 NBG。

## 快速开始

所有示例都在当前目录中。每个示例都是带独立 `package.json` 和 README 的项目。运行示例：

```bash
cd apps/examples/<example-name>
bun install
bun run build:sdk
export CLINE_API_KEY="cline_..." # 兼容 provider 示例；也可以使用其它 provider 的 API Key
bun dev
```

需要 Node.js 22+。

## 示例

### 入门

| 示例 | 说明 | 概念 |
|------|------|------|
| [quickstart](./quickstart) | 发送一个提示词并流式输出响应，约 15 行代码。 | `Agent`, `subscribe`, `run()` |
| [cli-agent](./cli-agent) | 带 shell 工具的交互式终端聊天。 | `createTool`, 多轮 `run()`/`continue()`, streaming |
| [cline-core-cli-agent](./cline-core-cli-agent) | 基于 `ClineCore` 的交互式终端聊天。 | `ClineCore.create()`, `cline.start()`, `cline.send()`, 内置工具, streaming |

### 进阶

| 示例 | 说明 | 概念 |
|------|------|------|
| [code-review-bot](./code-review-bot) | 读取 git diff 并输出结构化评论的 AI 代码审查器。 | 多工具, `completesRun` 生命周期, `systemPrompt`, zod schemas |
| [multi-agent](./multi-agent) | Web 应用并行调用四个专家智能体，通过 SSE 流式输出，再综合统一答案。 | 并发智能体, `Promise.all`, 单智能体 `subscribe()`, SSE streaming, agent composition |

### 高级

| 示例 | 说明 | 概念 |
|------|------|------|
| [desktop-app](./desktop-app) | 用于运行和检查聊天会话的 Tauri + Next.js 桌面应用。 | Sidecar runtime, websocket transport, session persistence |
| [menubar](./menubar) | 基于 Tauri 的 macOS 菜单栏应用。 | 原生应用集成, 紧凑 UI |
| [vscode](./vscode) | 带聊天面板的 VS Code 扩展示例。 | Extension API, webview, workspace context |

## SDK 包

构建自己的应用时，安装当前兼容 SDK 包：

```bash
npm add @cline/sdk
```

`@cline/sdk` 会从 `@cline/core` 重新导出完整 API。只有在需要直接控制 agent runtime 或 model gateway 底层能力时，才需要单独使用 `@cline/agents` 或 `@cline/llms`。

## 了解更多

- [SDK 包说明](../../packages/README.md)
- [架构指南](../../ARCHITECTURE.md)
- [插件示例](../../examples/plugins) - 用自定义工具和事件 hook 扩展兼容 SDK 与 NBG CLI
- [Hook 示例](../../examples/hooks) - 用于日志、阻断和注入的生命周期 hook
