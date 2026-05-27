# CLI 智能体

一个带流式输出和 shell 工具的交互式终端聊天智能体。输入消息后，智能体会流式回复，并可按示例逻辑代你运行 shell 命令。

## 快速开始

安装依赖：

```bash
bun install
bun run build:sdk
```

设置 API Key：

```bash
export CLINE_API_KEY="cline_..." # 兼容 provider 示例；也可改用其它 provider 凭据
```

运行：

```bash
bun dev
```

在 `you:` 提示符后输入任意消息，即可看到智能体的流式响应。

## 能做什么

- 使用 `createTool` 创建带 `shell` 工具的对话式 `Agent`。
- 在智能体响应时把 `assistant-text-delta` 事件流式输出到 stdout。
- 内联记录工具调用及其结果。
- 首条消息使用 `agent.run()`，后续消息使用 `agent.continue()` 保持对话上下文。

## 演示概念

- 使用 zod schema 校验的 `createTool`。
- 用事件订阅实现流式输出和工具调用可见性。
- 使用 `run()` / `continue()` 实现多轮对话。
- `systemPrompt` 配置。

## 备注

最小示例见 [quickstart](../quickstart)。多工具结构化工作流见 [code-review-bot](../code-review-bot)。
