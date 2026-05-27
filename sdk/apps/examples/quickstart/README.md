# 快速开始

最小化的兼容 SDK 示例：创建一个智能体，发送单条提示词，并把响应流式输出到 stdout。

## 快速开始

使用 Node.js 22 或更新版本。

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

## 能做什么

1. 使用 provider 和模型创建 `Agent`。
2. 订阅 `assistant-text-delta` 事件实现流式输出。
3. 使用提示词调用 `agent.run()`。
4. 完成后打印 token 使用量。

## 备注

交互式终端聊天见 [cli-agent](../cli-agent)。自定义工具和结构化工作流见 [code-review-bot](../code-review-bot)。
