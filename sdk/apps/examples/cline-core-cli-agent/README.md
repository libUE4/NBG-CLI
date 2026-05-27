# ClineCore CLI 智能体

一个基于 `ClineCore` 运行时的交互式终端聊天智能体。它和 [`cli-agent`](../cli-agent) 思路相近，但使用有状态的 ClineCore 会话和内置运行时工具，而不是无状态 `Agent` 类。当前 `ClineCore` 名称属于兼容 SDK API。

## 快速开始

安装依赖：

```bash
bun install
bun run build:sdk
```

设置 API Key：

```bash
export CLINE_API_KEY="sk_..." # 兼容 provider 示例；也可改用其它 provider 凭据
```

运行：

```bash
bun dev
```

在 `you:` 提示符后输入任意消息即可看到流式响应。输入 `exit` 退出。

## 可选模型配置

示例默认使用兼容 provider 和 Claude Sonnet：

```bash
export CLINE_PROVIDER_ID="cline"
export CLINE_MODEL_ID="anthropic/claude-sonnet-4.6"
```

## 能做什么

- 使用 `ClineCore.create()` 创建本地 `ClineCore` 运行时。
- 使用 `cline.start()` 启动一个交互式会话。
- 使用 `cline.send({ sessionId, prompt })` 发送每个用户回合。
- 在助手响应时把 `agent_event` 文本流式输出到 stdout。
- 内联记录工具调用和工具结果。
- 使用 ClineCore 内置工具，而不是自定义工具。
- 关闭时调用 `cline.stop()` 和 `cline.dispose()`。

## 演示概念

- 使用 `ClineCore` 的有状态会话。
- 使用单个 `sessionId` 进行多轮对话。
- 通过 `cline.subscribe()` 订阅 `CoreSessionEvent`。
- 内置运行时工具（`read_files`、`search_codebase`、`run_commands` 等）。
- 基础工具策略：文件读取/搜索自动批准，其他工具请求审批。

## 备注

当你需要带会话、持久化和内置工具的完整 ClineCore 运行时时使用此示例。最小 SDK 示例见 [quickstart](../quickstart)。轻量无状态运行时示例见 [cli-agent](../cli-agent)。
