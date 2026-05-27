# 多智能体 War Room

一个 Web 应用示例：并行启动四个专家智能体，通过 SSE 把响应实时流式输出到浏览器，然后把结果交给综合智能体生成统一决策简报。

![多智能体 War Room 界面](assets/agent-war-room.png)

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

在浏览器打开 http://localhost:3456，输入任务目标，观察智能体协作。

## 能做什么

1. 在浏览器输入任务目标。
2. 服务端通过 `Promise.all` 并行启动四个 `Agent` 实例：
   - Architect（系统设计）
   - Security Analyst（审计）
   - Pragmatist（产品）
   - Skeptic（红队）
3. 每个智能体通过 SSE 将 `assistant-text-delta` 事件流式发送到浏览器，并渲染到独立卡片。
4. 所有专家完成后，综合智能体会合并结果，生成统一决策简报并实时流式输出。

## 演示概念

- 使用 `Promise.all` 并发运行多个 `Agent` 实例。
- 每个智能体使用独立 `subscribe()` 事件流。
- 使用 Server-Sent Events（SSE）把智能体输出流式发送到浏览器。
- 智能体组合：把一个智能体的输出作为另一个智能体的输入。
- 由同一个 Node.js server 提供内联 HTML 前端（单文件，无构建步骤）。

## 备注

更简单的起点见 [quickstart](../quickstart)。自定义工具和结构化工作流见 [code-review-bot](../code-review-bot)。
