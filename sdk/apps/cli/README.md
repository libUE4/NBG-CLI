# NBG CLI

<p align="center">
  <img src="https://github.com/user-attachments/assets/7123f9d1-afeb-48d5-93fa-e750dec0ebba" width="70%" />
</p>

<div align="center">
<table>
<tbody>
<td align="center">
<a href="https://www.npmjs.com/package/@nbg/cli" target="_blank">NPM</a>
</td>
<td align="center">
<a href="https://github.com/libUE4/NBG-CLI" target="_blank">GitHub</a>
</td>
<td align="center">
<a href="https://github.com/libUE4/NBG-CLI/issues" target="_blank">Issues</a>
</td>
<td align="center">
<a href="../../../AGENTS.md" target="_blank">贡献指南</a>
</td>
<td align="center">
<a href="../../../docs-internal/commercialization-plan.md" target="_blank">商业化计划</a>
</td>
<td align="center">
<a href="../../../README.md" target="_blank">项目首页</a>
</td>
</tbody>
</table>
</div>

在终端运行 NBG。它提供中文交互式 TUI，也支持 CI/CD 和脚本场景的无头模式。当前 NBG 以 Cline 派生运行时作为兼容层，用户可见产品外壳、文案和发布入口逐步迁移到独立 NBG 品牌。

## 安装

```sh
npm install -g @nbg/cli
```

夜间版本：

```sh
npm install -g @nbg/cli@nightly
```

平台二进制覆盖 macOS、Linux、Windows 的 `arm64` 和 `x64`。`@nbg/cli` 包会通过 optional dependencies 选择当前平台二进制，安装后运行 CLI 不需要额外 Node、Bun 或 Zig 运行时。

## 快速开始

交互式运行：

```sh
nbg
```

运行单次提示词：

```sh
nbg "审计这个包并提出修复建议"
```

管道输入：

```sh
cat file.txt | nbg "总结这份文件"
```

完整参数参考见 `nbg --help`。

## 使用任意提供方

NBG 保留从 Cline 派生运行时继承的 provider 兼容层。你可以通过受支持的托管 provider 登录，使用 `openai-codex` 接入 ChatGPT 订阅，或接入 Anthropic、OpenAI、Google Gemini、OpenRouter、AWS Bedrock、GCP Vertex、Cerebras、Groq 以及任意 OpenAI 兼容端点的 API Key。

```sh
nbg auth                                # 交互式登录
nbg auth cline                          # 通过兼容 provider 进行 OAuth 登录
nbg auth --provider anthropic --apikey sk-... --modelid claude-sonnet-4-6
```

不带 provider 的 `nbg auth` 会打开交互式认证设置 TUI，选项与继承的 CLI 流程保持兼容。

支持 OAuth 的 provider（`cline`、`openai-codex`、`oca`）在普通启动时不会自动打开浏览器。请先用 `nbg auth <provider>` 显式认证。无交互运行时，如果选择了 OAuth provider 但没有已保存凭据，`nbg` 会直接给出认证错误，而不是隐藏式启动浏览器流程。

## 运行模式

NBG CLI 根据使用场景提供几种形态：

- 交互式 TUI：`nbg` 或 `nbg -i` 打开完整终端界面，支持规划/执行切换、斜杠命令、文件引用和实时工具审批。
- 单次任务：`nbg "你的提示词"` 执行一轮后退出。
- JSON：`nbg --json "..."` 输出 NDJSON 事件，便于管道传给其他工具。
- Yolo：`nbg --yolo "..."` 跳过审批提示，任务结束后退出。
- Zen：`nbg --zen "..."` 将任务提交到后台 hub daemon 后立即退出，详见下文。

## 面向 CI/CD 的无头模式

在脚本和自动化中以无交互方式运行 NBG。你可以管道输入、输出 JSON、串联命令并集成到 CI/CD 流水线。

```sh
# 单次提示词，自动批准所有工具
nbg --yolo "运行测试并修复失败项"

# 将 diff 通过管道传入用于审查
git diff origin/main | nbg "检查这些改动是否存在问题"

# 输出 NDJSON 供下游工具处理
nbg --json "列出所有 TODO 注释" | jq -r 'select(.type == "agent_event" and .event.text) | .event.text'
```

## 功能

- 基于 [OpenTUI](https://github.com/sst/opentui) 的流式 TUI，支持 Markdown 渲染、语法高亮 diff、可滚动聊天和鼠标操作。
- 规划/执行模式切换，用于在分析和落地之间控制节奏。
- 原生 MCP 支持，用于连接自定义工具。
- 检查点和 `/undo`，用于回退工作区状态。
- 子智能体和团队模式，用于并行处理复杂任务。
- 支持 Cline 兼容 provider、ChatGPT 订阅（`openai-codex`）和 OCA 的 OAuth 登录。
- 每次运行可配置 thinking budget。
- cron 和事件驱动计划任务，用于周期性智能体工作。
- Telegram、Google Chat、WhatsApp 等聊天连接器。

## 用法

```sh
# 不带提示词启动，进入交互式模式
nbg

# 单次提示词，包含工具、子任务和团队能力
nbg "审计这个包并提出修复建议"

# 带初始提示词进入交互式模式
nbg -i "我们一起处理这个任务。先分析当前状态。"

# 使用自定义系统提示词
nbg -i -s "你是严格的代码审查员" "检查这个模块的风险"

# 每次工具调用前都要求审批
nbg --auto-approve false "检查并修改这个仓库"

# 显式 yolo：启用提交后退出，并默认禁用 spawn/team 工具
nbg --yolo --retries 5 "重构这个包"

# 覆盖连续内部错误重试上限（默认 3）
nbg --retries 5 "修复失败测试"

# 使用持久化名称运行团队工作流
nbg --team-name my-team "规划、实现并验证发布清单"
nbg --team-name my-team "继续昨天的团队工作流"

# 显示详细运行统计（耗时、token、可用时显示估算费用）
nbg -v "解释量子计算"

# 为单次提示词指定 provider、模型和访问 token
nbg -P openrouter -m google/gemini-3-pro -k sk-... "搭建 Storybook"

# 在上次使用的 provider 下切换模型
nbg -m anthropic/claude-opus-4-6 "解释弦理论"

# 输出结构化 NDJSON
nbg --json "总结这个仓库"

# 快速设置 provider
nbg auth --provider anthropic --apikey sk-... --modelid claude-sonnet-4-6
nbg auth --provider openai-native --apikey sk-... --modelid gpt-5 --baseurl https://api.example.com/v1
```

### 连接器

把聊天平台桥接到 RPC 支撑的 NBG 会话。每个对话线程都会映射到一个带完整上下文的会话。支持平台包括 Telegram、Slack、Google Chat、WhatsApp 和 Linear。

```sh
# Telegram（轮询模式）
nbg connect telegram -k 123456:ABCDEF...

# Slack（webhook 模式）
nbg connect slack --bot-token $SLACK_BOT_TOKEN --signing-secret $SLACK_SIGNING_SECRET --base-url https://your-domain.com

# Google Chat（webhook 模式）
nbg connect gchat --base-url https://your-domain.com

# WhatsApp（webhook 模式）
nbg connect whatsapp --base-url https://your-domain.com

# Linear（webhook 模式）
nbg connect linear --api-key $LINEAR_API_KEY --base-url https://your-domain.com

# 停止连接器桥接并删除对应会话
nbg connect --stop
nbg connect --stop telegram
```

在聊天平台中，连接器斜杠命令包括 `/help`、`/start`、`/new`、`/clear`、`/whereami`、`/tools`、`/yolo`、`/cwd <path>`、`/schedule`、`/abort` 和 `/exit`。运行 `nbg connect <adapter> --help` 可查看指定 adapter 的完整参数列表。

### 计划任务

按 cron 周期或外部事件调度智能体。

```sh
nbg schedule create "每日代码审查" \
  --cron "0 9 * * MON-FRI" \
  --prompt "审查昨天打开的 PR 并总结问题。" \
  --workspace /path/to/repo \
  --provider openai-compatible \
  --model gpt-5 \
  --timeout 3600 \
  --tags automation,review

nbg schedule list
nbg schedule get <schedule-id>
nbg schedule trigger <schedule-id>
nbg schedule history <schedule-id> --limit 20
nbg schedule export <schedule-id> > daily-review.yaml
nbg schedule import ./daily-review.yaml
```

计划任务可以通过 `--delivery-adapter`、`--delivery-bot` 和 `--delivery-thread` 把结果回传到聊天平台。

## 参数

| 参数 | 说明 |
|------|------|
| `-s, --system <prompt>` | 覆盖系统提示词 |
| `-P, --provider <id>` | provider id（默认随配置而定，NBG 首选 OpenAI 兼容入口） |
| `-m, --model <id>` | 模型 id |
| `-k, --key <api-key>` | 本次运行使用的 API Key 覆盖值 |
| `-p, --plan` | 以规划模式运行（默认是执行模式） |
| `-i, --tui` | 进入交互式 TUI 多轮模式 |
| `-t, --timeout <seconds>` | 可选运行超时时间，单位秒 |
| `-c, --cwd <path>` | 工具执行的工作目录 |
| `--config <path>` | 配置目录，用于解析 CLI home |
| `--hooks-dir <path>` | 运行时 hook 注入使用的附加目录 |
| `--acp` | ACP（Agent Client Protocol）模式 |
| `--thinking [none\|low\|medium\|high\|xhigh]` | 模型支持时的 thinking 级别；只传 flag 时默认 `medium`，不传则关闭 |
| `--compaction <agentic\|basic\|off>` | 上下文压缩模式，默认 `basic`；`agentic` 使用 LLM 压缩，`off` 关闭 |
| `--retries <count>` | 停止前允许的最大连续错误/重试次数（默认 `3`） |
| `--json` | 输出 NDJSON，而不是带样式文本 |
| `--data-dir <path>` | 使用隔离本地状态目录；兼容层默认状态目录仍可能是 `~/.cline` |
| `--auto-approve [true\|false]` | 设置所有工具的自动审批 |
| `--kanban` | 运行外部 `kanban` 应用 |
| `-y, --yolo` | 跳过工具审批，启用 `submit_and_exit`，并默认禁用 spawn/team 工具 |
| `-z, --zen` | 将任务派发到后台 hub 后立即退出 CLI |
| `--team-name <name>` | 覆盖运行时团队状态名称 |
| `-h, --help` | 显示帮助并退出 |
| `-v, --verbose` | 显示详细运行诊断 |
| `-V, --version` | 显示版本并退出 |

`--json` 是无交互模式，需要提示词参数或管道 stdin。`--key` 优先级高于环境变量。

## 顶层命令

- `nbg config` - 打开交互式配置视图
- `nbg history|h [options]` - 列出历史会话或管理已保存会话
- `nbg version` - 显示 CLI 版本
- `nbg update [options]` - 检查 CLI 和 kanban 更新
- `nbg auth <provider>` - 认证或写入 provider 凭据
- `nbg connect <adapter>` - 运行聊天连接器桥接（`telegram`、`gchat`、`whatsapp`）
- `nbg connect --stop [adapter]` - 停止连接器桥接进程和相关会话
- `nbg schedule <command>` - 创建和管理计划任务
- `nbg doctor` - 检查本地 CLI 健康状态和残留进程
- `nbg doctor fix` - 清理残留本地 RPC listener 和旧 CLI 进程
- `nbg doctor log` - 打开 CLI 运行时日志文件
- `nbg hook` - 从 stdin 处理 hook payload
- `nbg hub` - 管理本地 hub daemon
- `nbg kanban` - 运行外部 `kanban` 应用，必要时先安装

## Zen 模式

`--zen`（别名 `-z`）会把任务提交到后台 hub daemon，然后立即退出 CLI。它适合不需要保持终端连接的长任务。

```sh
nbg --zen "重构认证模块并补充单元测试"
```

行为：

- CLI 会启动或复用本地 hub daemon，提交任务后退出；它不会流式输出，也不会继续附着在会话上。
- 因为 CLI 退出后没有人工审批，zen 会话会完全自动批准工具调用，语义与 `--yolo` 一致。出于安全考虑，`spawn`/`team` 工具默认禁用。
- 如果 NBG 菜单栏应用正在运行，它可以订阅 hub `ui.notify` 事件，并在任务完成时显示系统通知。
- 如果没有运行菜单栏应用，则不会有实时 UI。稍后可用 `nbg history` 查找会话并查看结果。
- `--zen` 与 `--data-dir` 不兼容，也不能和 `--tui` 同时使用。

## 工具审批

工具调用默认自动批准。使用 `--auto-approve false` 可在工具执行前要求人工审查。

```sh
nbg --auto-approve false "检查并修改这个仓库"
```

需要审批时，CLI 会在 TTY 模式中提示：

```text
批准 "<tool_name>" <preview> [y/N]
```

- 输入 `y` 或 `yes` 批准。
- 输入其他内容或直接回车会拒绝。
- 如果 stdin/stdout 不是 TTY，终端模式会拒绝需要审批的工具调用。

也支持通过环境变量启用桌面集成审批模式（`CLINE_TOOL_APPROVAL_MODE=desktop` 和 `CLINE_TOOL_APPROVAL_DIR=<path>`）。在桌面模式中，CLI 会写入请求 JSON 文件，并等待匹配的决策 JSON 文件。

## 环境变量

以下变量名仍来自兼容运行时，迁移到 `NBG_*` 命名需要按兼容计划单独推进。

- `ANTHROPIC_API_KEY` - Anthropic API Key
- `CLINE_API_KEY` - Cline 兼容 provider 的 API Key（使用 `-P cline` 时）
- `OPENAI_API_KEY` - OpenAI API Key（使用 `-P openai` 时）
- `OPENROUTER_API_KEY` - OpenRouter API Key（使用 `-P openrouter` 时）
- `AI_GATEWAY_API_KEY` - Vercel AI Gateway API Key（使用 `-P vercel-ai-gateway` 时）
- `V0_API_KEY` - v0 API Key（使用 `-P v0` 时）
- `CLINE_DATA_DIR` - 会话、设置、团队和 hooks 的基础数据目录
- `CLINE_SANDBOX` - 设为 `1` 时强制启用沙箱模式
- `CLINE_SANDBOX_DATA_DIR` - 覆盖沙箱状态目录
- `CLINE_TEAM_DATA_DIR` - 覆盖团队持久化目录
- `CLINE_BUILD_ENV` - SDK 子进程启动时使用的运行时构建模式
- `CLINE_DEBUG_HOST` - 开发 inspector listener 主机（默认 `127.0.0.1`）
- `CLINE_DEBUG_PORT_BASE` - 开发子进程 inspector 起始端口
- `CLINE_TOOL_APPROVAL_MODE` - 审批模式（`desktop` 使用文件 IPC；未设置时使用终端提示）
- `CLINE_TOOL_APPROVAL_DIR` - 桌面审批请求/决策文件目录
- `CLINE_LOG_ENABLED` - 设为 `0`/`false` 可关闭运行时文件日志
- `CLINE_LOG_LEVEL` - 运行时日志级别（`trace|debug|info|warn|error|fatal|silent`，默认 `info`）
- `CLINE_LOG_PATH` - 运行时日志文件路径（默认 `<CLINE_DATA_DIR>/logs/cline.log`）
- `CLINE_LOG_NAME` - 写入运行时日志记录的 logger 名称

`--key` 的优先级高于环境变量。

## 贡献

本地开发、monorepo 结构和 TUI 架构见 [DEVELOPMENT.md](./DEVELOPMENT.md)。CLI 打包和分发流程见 [DISTRIBUTION.md](./DISTRIBUTION.md)。

## 许可证

[Apache 2.0](../../../LICENSE)
