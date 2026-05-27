<p align="center">
  <img src="assets/icons/icon.png" width="80" alt="NBG" />
</p>

<h1 align="center">NBG</h1>

<p align="center">
商业化开发者 AI 代理 CLI 与 SDK，基于 Cline 运行时底座演进，面向中文开发工作流。
</p>

<div align="center">

<div align="center">
<table>
<tbody>
<td align="center">
<a href="./sdk/apps/cli/README.md" target="_blank"><strong>中文文档</strong></a>
</td>
<td align="center">
<a href="https://github.com/libUE4/NBG-CLI" target="_blank"><strong>GitHub</strong></a>
</td>
<td align="center">
<a href="https://github.com/libUE4/NBG-CLI/issues" target="_blank"><strong>Issues</strong></a>
</td>
<td align="center">
<a href="./docs-internal/commercialization-plan.md" target="_blank"><strong>商业化计划</strong></a>
</td>
<td align="center">
<a href="./AGENTS.md" target="_blank"><strong>贡献指南</strong></a>
</td>
</tbody>
</table>
</div>

</div>

<br>

<div align="center">
<table>
<tr>
<td align="center" width="50%">

### CLI

在终端运行 NBG。
支持交互式中文 TUI，
也支持 CI/CD 和脚本中的无头模式。

```
npm i -g @nbg/cli
```

<a href="./sdk/apps/cli/README.md">查看 CLI 文档</a>
<br><br>

</td>
<td align="center" width="50%">

### Kanban

商业化多智能体看板规划中。
目标是让每张任务卡拥有独立 worktree、
自动提交和依赖链编排。

<a href="./docs-internal/commercialization-plan.md">查看商业化计划</a>
<br><br>

</td>
</tr>
<tr>
<td align="center" width="50%">

### VS Code 扩展

在编辑器中使用 NBG。
支持创建文件、执行命令、浏览网页，
并通过人工确认控制关键操作。

<a href="./README.marketplace.md">查看扩展说明</a>
<br><br>

</td>
<td align="center" width="50%">

### IDE 适配

JetBrains 等 IDE 适配会基于共享核心逐步推进。
当前仓库优先保证 CLI、SDK 和 VS Code 扩展入口。

<a href="./docs-internal/commercialization-plan.md">查看路线图</a>
<br><br>

</td>
</tr>
</table>
</div>

<div align="center">
<table>
<tr>
<td align="center">

### SDK

基于驱动 NBG CLI 的同一套派生运行时构建自定义智能体和集成。当前 SDK 包名保留 `@cline/*` 兼容入口，迁移到 NBG 命名会按模块逐步完成。

```
npm install @cline/sdk
```

<a href="./sdk/README.md">查看 SDK 文档</a>
<br><br>

</td>
</tr>
</table>
</div>

---

## 目录

| 模块 | 说明 | 位置 | 变更记录 |
|------|------|------|----------|
| **SDK** | Node.js 智能体 API、运行时和扩展导出。 | [`sdk/`](./sdk/) | - |
| **CLI** | 终端 TUI、无头模式、命令执行和自动化工作流。 | [`sdk/apps/cli/`](./sdk/apps/cli/) | [`sdk/apps/cli/CHANGELOG.md`](./sdk/apps/cli/CHANGELOG.md) |
| **VS Code 扩展** | 编辑器侧入口、扩展宿主集成和 Marketplace 说明。 | [`./`](./) | [`CHANGELOG.md`](./CHANGELOG.md) |
| **IDE 适配** | JetBrains 等客户端适配规划。 | [`docs-internal/commercialization-plan.md`](./docs-internal/commercialization-plan.md) | - |
| **多智能体看板** | Web 化任务板和商业化协作入口规划。 | [`docs-internal/commercialization-plan.md`](./docs-internal/commercialization-plan.md) | - |
| **文档** | 公开文档和内部商业化推进资料。 | [`docs/`](./docs/) / [`docs-internal/`](./docs-internal/) | - |

## 跨项目编辑代码

NBG 会读取项目结构，理解文件关系，并在代码库内协调修改。它可以在执行中关注 lint、类型和构建反馈，修复缺失导入、类型不匹配和语法错误等问题。编辑器入口中的改动会以 diff 展示，便于审阅、修改或回滚。

## 执行终端命令

NBG 可以在终端中执行命令并实时读取输出，用于安装依赖、运行构建、执行测试、部署应用或管理数据库。对开发服务器等长时间运行进程，它会持续观察输出并根据新的错误继续处理。

## 规划与执行

在规划模式中，NBG 会探索代码库、提出必要问题并给出策略；进入执行模式后再落地修改。文件编辑和终端命令可以保留人工审批，也可以在可信范围内开启自动批准。

## 规则与技能

通过 `.clinerules` 定义项目级规则，例如编码规范、架构约束、部署流程和测试要求。CLI 与编辑器入口会读取这些规则；技能机制用于在需要时加载特定领域的操作说明。

## 接入多种模型

NBG 不绑定单一 AI 提供方。按任务选择适合的模型或网关：

| 提供方 | 模型 |
|--------|------|
| Anthropic | Claude Opus, Sonnet, Haiku |
| OpenAI | GPT 系列模型 |
| Google | Gemini 系列模型 |
| OpenRouter | 聚合多提供方模型 |
| Vercel AI Gateway | Vercel AI Gateway 托管模型 |
| AWS Bedrock | Claude、Llama 等模型 |
| Azure / GCP Vertex | 云厂商托管模型 |
| Cerebras / Groq | 高速推理模型 |
| Ollama / LM Studio | 本机运行的本地模型 |
| 任意 OpenAI 兼容 API | 自托管或第三方端点 |

## 使用插件或 MCP 扩展

通过 SDK 注册工具和生命周期钩子，为 NBG 增加日志、审计、策略控制或业务专用能力。当前示例仍使用兼容入口 `@cline/sdk`。

```typescript
import { Agent, createTool } from "@cline/sdk"

const deployTool = createTool({
  name: "deploy",
  description: "将当前分支部署到预发环境。",
  inputSchema: { type: "object", properties: { env: { type: "string" } }, required: ["env"] },
  execute: async (input) => {
    // 在这里接入你的部署逻辑
  },
})

const agent = new Agent({ tools: [deployTool], /* ... */ })
```
也可以使用 [MCP servers](https://github.com/modelcontextprotocol) 连接数据库、查询 API、管理云资源或访问内部系统。在 CLI 中使用 `nbg mcp` 管理服务器。

## 多智能体团队

让多个智能体协同处理复杂任务。协调智能体会拆分子任务，并把工作交给拥有独立工具和上下文的专家智能体；团队状态会跨会话保留。

```bash
nbg --team-name auth-sprint "规划并实现用户认证，补齐测试"
```

## 定时智能体

用 cron 表达式运行周期性自动化，例如每日 PR 摘要、每周依赖检查和代码库健康报告。计划任务会持久化，并独立于当前终端会话运行。

```bash
nbg schedule create "PR 摘要" \
  --cron "0 9 * * MON-FRI" \
  --prompt "列出所有打开的 PR 及其评审状态" \
  --workspace /path/to/repo
```

## 连接 Slack、Telegram、Discord 等渠道

从 Telegram、Slack、Discord、Google Chat、WhatsApp、Linear 等消息平台与智能体对话。每个会话线程都会映射到带上下文的智能体会话，并可通过访问控制限制使用者。

```bash
nbg connect telegram -k $BOT_TOKEN
nbg connect slack --token $SLACK_TOKEN --signing-secret $SECRET --base-url $URL
```

## 面向 CI/CD 的无头 CLI

在脚本和流水线中以无交互模式运行 NBG：管道输入、JSON 输出、命令串联和 CI/CD 集成都可以自动化。

```bash
nbg "运行测试并修复失败项"
git diff origin/main | nbg "检查这些改动是否存在问题"
nbg --json "列出所有 TODO 注释" | jq -r 'select(.type == "agent_event" and .event.text) | .event.text'
```

## 贡献

先阅读 [贡献指南](CONTRIBUTING.md) 和 [仓库协作说明](AGENTS.md)。公开文案、测试断言和提交信息优先使用中文；底层兼容 API 按计划逐步迁移。

## 许可证

[Apache 2.0](./LICENSE)
