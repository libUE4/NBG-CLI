# 代码审查 Bot Dashboard

一个面向真实 GitHub pull request 的 AI 代码审查 dashboard。粘贴 PR URL 后，可以查看实际变更文件，基于真实 PR diff 流式运行 SDK 审查，并复制或按需发布生成的审查意见。

<p align="center">
  <img src="./assets/dashboard.jpg" alt="Code Review Bot dashboard showing a loaded pull request diff" width="100%" />
</p>

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

可选设置 GitHub token。公开 PR 可以不带 token 加载，但私有仓库和更高 rate limit 建议配置 token：

```bash
export GITHUB_TOKEN="github_pat_..."
```

运行 dashboard：

```bash
bun dev
```

打开 http://localhost:3457，粘贴 GitHub pull request URL，然后点击 **Run Review**。

默认情况下，应用会把生成的审查意见复制到剪贴板。如需允许把摘要评论发回 GitHub，请同时设置 `GITHUB_TOKEN` 和：

```bash
export ENABLE_GITHUB_REVIEW_POSTING=1
```

## 能做什么

1. 获取真实 GitHub PR，包括元数据、变更文件、patch 和检查状态。
2. 在 dashboard 中渲染 PR，包含文件导航、diff 视图、审查通道和问题卡片。
3. 将真实 PR diff 发送给带三个自定义工具的智能体：
   - `get_file_context` - 从 PR head commit 读取完整文件内容，用于补充上下文。
   - `add_review_finding` - 记录包含文件、行号、严重级别、分类和建议的结构化问题。
   - `submit_review` - 完成工具，用摘要和 approve/request-changes 决策结束本轮运行。
4. 智能体审查 PR 时，通过 Server-Sent Events 把问题流式发送到浏览器。
5. 在本地复制最终审查意见，或在显式启用后作为 GitHub PR 评论发布。

## 演示概念

- 多个带 zod schema 的 `createTool` 定义。
- 使用 `lifecycle: { completesRun: true }` 让工具结束 agent loop。
- 带结构化指令的丰富 `systemPrompt`。
- 按工具名过滤的事件订阅。
- 集成 GitHub REST API 获取 pull request 元数据和 diff。
- 使用 Server-Sent Events（SSE）实现实时审查 dashboard。
- 通过显式发布开关保护外部写入。

## 备注

更简单的起点见 [quickstart](../quickstart)。交互式聊天智能体见 [cli-agent](../cli-agent)。
