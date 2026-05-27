export interface QuickWinTask {
	id: string
	title: string
	description: string
	icon?: string
	actionCommand: string
	prompt: string
	buttonText?: string
}

export const quickWinTasks: QuickWinTask[] = [
	{
		id: "nextjs_notetaking_app",
		title: "构建 Next.js 应用",
		description: "用 Next.js 和 Tailwind 创建漂亮的笔记应用",
		icon: "WebAppIcon",
		actionCommand: "cline/createNextJsApp",
		prompt: "创建一个漂亮的 Next.js 笔记应用，使用 Tailwind CSS 做样式。搭建基础结构，并实现添加和查看笔记的简单界面。",
		buttonText: ">",
	},
	{
		id: "terminal_cli_tool",
		title: "制作 CLI 工具",
		description: "开发一个强大的终端 CLI，用来自动化实用任务",
		icon: "TerminalIcon",
		actionCommand: "cline/createCliTool",
		prompt: "使用 Node.js 制作一个终端 CLI 工具，可按类型、大小或日期整理目录中的文件。需要支持把文件分类到文件夹、显示文件统计、查找重复文件、清理空目录，并带有彩色输出和进度提示。",
		buttonText: ">",
	},
	{
		id: "snake_game",
		title: "开发小游戏",
		description: "编写一个可在浏览器运行的经典贪吃蛇游戏。",
		icon: "GameIcon",
		actionCommand: "cline/createSnakeGame",
		prompt: "使用 HTML、CSS 和 JavaScript 制作经典贪吃蛇游戏。游戏需要能在浏览器中运行，支持键盘控制、计分系统和游戏结束状态。",
		buttonText: ">",
	},
]
