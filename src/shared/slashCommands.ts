export interface SlashCommand {
	name: string
	description?: string
	section?: "default" | "custom" | "mcp"
	cliCompatible?: boolean
}

export const BASE_SLASH_COMMANDS: SlashCommand[] = [
	{
		name: "newtask",
		description: "基于当前任务上下文创建新任务",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "deep-planning",
		description: "编码前创建完整实施计划",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "smol",
		description: "压缩当前上下文窗口",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "newrule",
		description: "基于当前对话创建新的 NBG 规则",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "reportbug",
		description: "使用 NBG 创建 GitHub issue",
		section: "default",
		cliCompatible: true,
	},
]

// VS Code-only slash commands
export const VSCODE_ONLY_COMMANDS: SlashCommand[] = [
	{
		name: "explain-changes",
		description: "解释 git refs 之间的代码变更（PR、提交、分支等）",
		section: "default",
	},
]

// CLI-only slash commands (handled locally, not sent to backend)
export const CLI_ONLY_COMMANDS: SlashCommand[] = [
	{
		name: "help",
		description: "了解如何使用 NBG CLI",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "settings",
		description: "修改 API provider、自动批准和功能设置",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "models",
		description: "修改当前模式使用的模型",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "history",
		description: "浏览和搜索任务历史",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "clear",
		description: "清空当前任务并重新开始",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "exit",
		description: "Ctrl+C 的替代命令",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "q",
		description: "Ctrl+C 的替代命令",
		section: "default",
		cliCompatible: true,
	},
	{
		name: "skills",
		description: "查看和管理已安装技能",
		section: "default",
		cliCompatible: true,
	},
]
