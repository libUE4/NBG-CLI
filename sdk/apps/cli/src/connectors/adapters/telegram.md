# Telegram 连接器

Telegram 连接器会把 Telegram Bot API 机器人桥接到 NBG CLI 会话。它使用轮询模式，不需要公开 webhook URL；只要需要 Telegram 访问，连接器进程就必须保持运行。

## 设置

用 `@BotFather` 创建机器人：

1. 打开 Telegram，并和 `@BotFather` 开始聊天。
2. 发送 `/newbot`，按提示创建机器人。
3. 复制 bot token，并像密码一样保护它。

启动连接器：

```bash
nbg connect telegram -k "$TELEGRAM_BOT_TOKEN"
```

连接器会从 token 自动发现 bot username。只有在需要覆盖时才使用 `--bot-username`。

常用变体：

```bash
# 调试时把日志保留在当前终端。
nbg connect telegram -i -k "$TELEGRAM_BOT_TOKEN"

# 从环境变量读取凭据。
TELEGRAM_BOT_TOKEN=123456:ABCDEF... nbg connect telegram

# 覆盖 Telegram 会话使用的工作区和模型。
nbg connect telegram -k "$TELEGRAM_BOT_TOKEN" --cwd /path/to/repo --provider openai-compatible --model gpt-5

# 对不可信 Telegram 场景禁用工具。
nbg connect telegram -k "$TELEGRAM_BOT_TOKEN" --no-tools

# 停止 Telegram 连接器进程和会话。
nbg connect --stop telegram
```

连接器启动后，在 Telegram 中向机器人发送 `/help` 或 `/start`。

## 能做什么

- 为每个 Telegram thread 启动或复用一个 NBG RPC 会话。
- 按 Telegram thread 分别保存聊天历史和工作目录状态。
- 允许 Telegram 用户提问、分配编码任务，并在启用工具时检查文件、编辑文件、运行命令和准备 PR。
- 支持在 Telegram 中用 `Y` / `N` 回复完成必要工具审批。
- 连接器运行时，可以把计划任务结果投递回 Telegram thread。

## 聊天命令

Telegram 连接器使用共享连接器命令解析器：

- `/help` 或 `/start` - 显示连接器帮助
- `/new` 或 `/clear` - 为当前 thread 开始新会话
- `/whereami` - 显示 thread、cwd、工具和 yolo 状态
- `/tools [on|off|toggle]` - 允许或阻止仓库/文件/shell 工具
- `/yolo [on|off|toggle]` - 自动批准工具使用
- `/cwd <path>` - 切换工作目录
- `/schedule create/list/trigger/delete` - 管理计划工作流
- `/abort` - 停止当前任务
- `/exit` - 停止连接器

在 Telegram 群组中，只有当 `/help@my_bot` 这类命令后缀匹配配置的 bot username 时才会被归一化。发给其他机器人的命令不会匹配。

## 工具与访问控制

Telegram 会话默认启用工具。这意味着任何能成功向机器人发送消息的人，都可能要求它检查或修改配置的工作区。

如果 Telegram 场景不可信，请使用 `--no-tools`：

```bash
nbg connect telegram -k "$TELEGRAM_BOT_TOKEN" --no-tools
```

连接器以 `--no-tools` 启动时，`/tools on` 和 `/yolo on` 等聊天命令不能在当前连接器运行中重新启用工具。

如需限制参与者，可以运行 `nbg connect` 交互式连接器向导，或传入 `--hook-command`，让它对未授权的 `session.authorize` 事件返回 `{"action":"deny"}`。如果没有配置 hook，则默认允许消息。

## 消息投递

Telegram 的最终助手回复会通过带 message entities 的 Telegram `sendMessage` payload 直接发送。这可以避免原始模型文本导致 Telegram Markdown 解析失败。如果 entity 发送失败，连接器会回退到原始文本。

较长的最终助手回复会拆分成多条 Telegram 消息。工具/状态更新和计划任务投递消息会使用 adapter 的原始 thread posting 路径。

Telegram 最终回复会在 runtime turn 完成后发送。Google Chat 和 WhatsApp 使用共享连接器 runtime streaming 路径发送增量助手文本。

## 计划任务投递

如需把计划任务结果投递回 Telegram，尽量从 Telegram 聊天中创建计划：

1. 启动 Telegram 连接器。
2. 在 Telegram 中发送计划任务命令：

```text
/schedule create "每日总结" --cron "0 9 * * *" --prompt "总结这个工作区昨天的活动。"
```

这样创建的计划会自动把当前 Telegram thread 作为投递目标。也可以在 Telegram 中使用 `/schedule list`、`/schedule trigger <schedule-id>` 和 `/schedule delete <schedule-id>`。

如果在 Telegram 之外创建计划，请先在 Telegram 中发送 `/whereami` 获取 thread id，然后把投递元数据传给 CLI：

```bash
nbg schedule create "每日总结" \
  --cron "0 9 * * *" \
  --prompt "总结这个工作区昨天的活动。" \
  --workspace /path/to/repo \
  --delivery-adapter telegram \
  --delivery-bot my_bot \
  --delivery-thread telegram:123456789
```

仅使用 token 配置连接器后，仍然支持 `--delivery-bot`。如果需要指定某个 Telegram 连接器，请使用 `/whereami` 显示的 Telegram bot username 作为 `deliveryUserName`；如果计划不需要限制到特定 bot，则可以省略该参数。

计划任务结果投递时，连接器必须正在运行，目标 thread 也必须已有 thread binding。

## 限制

- 连接器不是由 Telegram 托管。它是本地 CLI 进程轮询 Telegram，因此机器或连接器进程离线后会停止工作。
- 当前文档化能力覆盖文本提示词和命令回复。Telegram 媒体专用工作流不属于此连接器契约。
- Telegram 群组消息投递仍取决于 Telegram bot 设置，以及 Bot API 会向 adapter 投递哪些事件。
