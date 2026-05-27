// @jsxImportSource @opentui/react
import type { ChoiceContext } from "@opentui-ui/dialog";
import { useDialogKeyboard } from "@opentui-ui/dialog/react";

type HelpRow =
	| { kind: "heading"; id: string; text: string }
	| { kind: "entry"; id: string; key: string; desc: string }
	| { kind: "spacer"; id: string };

const HELP_ROWS: HelpRow[] = [
	{ kind: "heading", id: "h-keys", text: "键盘快捷键" },
	{
		kind: "entry",
		id: "k-enter",
		key: "Enter",
		desc: "提交提示词（或选择自动补全项）",
	},
	{
		kind: "entry",
		id: "k-shift-enter",
		key: "Shift+Enter",
		desc: "在输入框中换行",
	},
	{
		kind: "entry",
		id: "k-tab",
		key: "Tab",
		desc: "切换工作模式：执行 / 规划",
	},
	{
		kind: "entry",
		id: "k-ctrl-down",
		key: "Ctrl+↓",
		desc: "切换全部自动批准",
	},
	{
		kind: "entry",
		id: "k-ctrl-c",
		key: "Ctrl+C",
		desc: "清空输入 / 退出",
	},
	{
		kind: "entry",
		id: "k-ctrl-d",
		key: "Ctrl+D",
		desc: "退出（空闲且输入为空时）",
	},
	{
		kind: "entry",
		id: "k-ctrl-l",
		key: "Ctrl+L",
		desc: "清空对话",
	},
	{
		kind: "entry",
		id: "k-ctrl-s",
		key: "Ctrl+S",
		desc: "引导（智能体运行时发送）",
	},
	{
		kind: "entry",
		id: "k-ctrl-p",
		key: "Ctrl+P",
		desc: "打开命令面板",
	},
	{
		kind: "entry",
		id: "k-opt-help",
		key: "Opt+K",
		desc: "显示此帮助",
	},
	{
		kind: "entry",
		id: "k-escape",
		key: "Escape",
		desc: "关闭菜单 / 中止正在运行的 Agent",
	},
	{
		kind: "entry",
		id: "k-esc-esc",
		key: "Esc Esc",
		desc: "恢复到上一个检查点",
	},
	{
		kind: "entry",
		id: "k-updown",
		key: "Up/Down",
		desc: "导航自动补全或输入历史",
	},
	{
		kind: "entry",
		id: "k-page-scroll",
		key: "PgUp/PgDn",
		desc: "按页滚动对话记录",
	},
	{
		kind: "entry",
		id: "k-page-scroll-alt",
		key: "Ctrl+Alt+B/F",
		desc: "按页滚动对话记录",
	},
	{
		kind: "entry",
		id: "k-half-page-scroll",
		key: "Ctrl+Alt+U/D",
		desc: "按半页滚动对话记录",
	},
	{
		kind: "entry",
		id: "k-transcript-bounds",
		key: "Ctrl+G/Ctrl+Alt+G",
		desc: "跳到第一条或最后一条消息",
	},

	{ kind: "spacer", id: "s1" },
	{ kind: "heading", id: "h-slash", text: "斜杠命令" },
	{
		kind: "entry",
		id: "c-model",
		key: "/model",
		desc: "切换模型或三方 API",
	},
	{
		kind: "entry",
		id: "c-settings",
		key: "/settings",
		desc: "打开交互式配置浏览器",
	},
	{
		kind: "entry",
		id: "c-mcp",
		key: "/mcp",
		desc: "管理 MCP 服务器",
	},
	{
		kind: "entry",
		id: "c-compact",
		key: "/compact",
		desc: "压缩上下文窗口",
	},
	{
		kind: "entry",
		id: "c-clear",
		key: "/clear",
		desc: "开始新会话",
	},
	{
		kind: "entry",
		id: "c-team",
		key: "/team",
		desc: "用智能体团队启动任务",
	},
	{
		kind: "entry",
		id: "c-history",
		key: "/history",
		desc: "查看并恢复历史会话",
	},
	{
		kind: "entry",
		id: "c-fork",
		key: "/fork",
		desc: "分叉当前会话并继续",
	},
	{
		kind: "entry",
		id: "c-undo",
		key: "/undo",
		desc: "恢复到上一个检查点",
	},
	{ kind: "entry", id: "c-quit", key: "/quit", desc: "退出 NBG" },
	{ kind: "entry", id: "c-help", key: "/help", desc: "显示此帮助" },

	{ kind: "spacer", id: "s2" },
	{ kind: "heading", id: "h-mentions", text: "引用" },
	{
		kind: "entry",
		id: "m-file",
		key: "@filename",
		desc: "将工作区文件附加到提示词",
	},

	{ kind: "spacer", id: "s3" },
	{ kind: "heading", id: "h-modes", text: "工作模式" },
	{
		kind: "entry",
		id: "mode-plan",
		key: "规划",
		desc: "智能体只说明计划，不进行修改",
	},
	{
		kind: "entry",
		id: "mode-act",
		key: "执行",
		desc: "智能体执行工具并进行修改（默认）",
	},

	{ kind: "spacer", id: "s4" },
	{ kind: "heading", id: "h-approve", text: "自动批准" },
	{
		kind: "entry",
		id: "approve-off",
		key: "关闭",
		desc: "安全工具自动批准，其它操作需要确认",
	},
	{
		kind: "entry",
		id: "approve-on",
		key: "开启",
		desc: "所有工具调用无需确认自动批准",
	},

	{ kind: "spacer", id: "s5" },
	{ kind: "heading", id: "h-wizards", text: "CLI 向导" },
	{
		kind: "entry",
		id: "w-connect",
		key: "nbg connect",
		desc: "设置消息平台集成",
	},
	{
		kind: "entry",
		id: "w-schedule",
		key: "nbg schedule",
		desc: "创建和管理定时 cron 任务",
	},
	{
		kind: "entry",
		id: "w-mcp",
		key: "nbg mcp",
		desc: "添加、移除和管理 MCP 服务器",
	},
];

const KEY_WIDTH = 20;

export function HelpDialogContent(props: ChoiceContext<void>) {
	const { dismiss, dialogId } = props;

	useDialogKeyboard((key) => {
		if (
			key.name === "escape" ||
			key.name === "return" ||
			key.name === "enter" ||
			key.name === "q"
		) {
			dismiss();
		}
	}, dialogId);

	return (
		<box flexDirection="column" paddingX={1}>
			<scrollbox flexGrow={1}>
				<box flexDirection="column">
					{HELP_ROWS.map((row) => {
						if (row.kind === "spacer") {
							return <text key={row.id}> </text>;
						}
						if (row.kind === "heading") {
							return (
								<text key={row.id} fg="white">
									{row.text}
								</text>
							);
						}
						return (
							<box key={row.id} flexDirection="row" paddingX={1}>
								<text fg="cyan" width={KEY_WIDTH} flexShrink={0}>
									{row.key}
								</text>
								<text fg="gray">{row.desc}</text>
							</box>
						);
					})}
				</box>
			</scrollbox>

			<text fg="gray" marginTop={1}>
				<em>Esc/Enter 关闭</em>
			</text>
		</box>
	);
}
