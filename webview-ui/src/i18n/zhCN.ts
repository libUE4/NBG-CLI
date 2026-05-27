const EXACT_TRANSLATIONS = new Map<string, string>([
	["Settings", "设置"],
	["Done", "完成"],
	["New Task", "新任务"],
	["MCP Servers", "MCP 服务器"],
	["History", "历史"],
	["Account", "账号"],
	["Chat", "聊天"],
	["API Configuration", "API 配置"],
	["Feature Settings", "功能设置"],
	["Features", "功能"],
	["Browser Settings", "浏览器设置"],
	["Browser", "浏览器"],
	["Terminal Settings", "终端设置"],
	["Terminal", "终端"],
	["General Settings", "通用设置"],
	["General", "通用"],
	["Remote Config", "远程配置"],
	["Remotely configured fields", "远程配置字段"],
	["About Cline", "关于 NBG"],
	["About", "关于"],
	["Debug Tools", "调试工具"],
	["Debug", "调试"],
	["What can I do for you?", "我能为你做什么？"],
	["I guess I'm here to help", "我在这里帮你。"],
	["Take a Tour", "查看引导"],
	["Quick [Wins] with Cline", "使用 NBG 快速开始"],
	["Type a message...", "输入消息..."],
	["Type your task here...", "在这里输入你的任务..."],
	["API Provider", "API 提供方"],
	["Search and select provider...", "搜索并选择提供方..."],
	["Clear search", "清除搜索"],
	["Plan Mode", "规划模式"],
	["Act Mode", "执行模式"],
	["Use different models for Plan and Act modes", "为规划和执行模式使用不同模型"],
	["Preferred Language", "首选语言"],
	["Simplified Chinese - 简体中文", "简体中文"],
	["English", "英语"],
	["Allow error and usage reporting", "允许错误和使用情况上报"],
	["Agent", "智能体"],
	["Editor", "编辑器"],
	["Experimental", "实验功能"],
	["Advanced", "高级"],
	["Subagents", "子智能体"],
	["Native Tool Call", "原生工具调用"],
	["Parallel Tool Calling", "并行工具调用"],
	["Strict Plan Mode", "严格规划模式"],
	["Auto Compact", "自动压缩"],
	["Focus Chain", "焦点链"],
	["Feature Tips", "功能提示"],
	["Background Edit", "后台编辑"],
	["Checkpoints", "检查点"],
	["Cline Web Tools", "NBG Web 工具"],
	["Worktrees", "工作树"],
	["Yolo Mode", "自动执行模式"],
	["Double-Check Completion", "双重检查完成状态"],
	["Lazy Teammate Mode", "懒队友模式"],
	["Hooks", "钩子"],
	["MCP Display Mode", "MCP 显示模式"],
	["Plain Text", "纯文本"],
	["Rich Display", "富文本显示"],
	["Markdown", "Markdown"],
	["Default Terminal Profile", "默认终端配置"],
	["Shell integration timeout (seconds)", "Shell 集成超时时间（秒）"],
	["Enter timeout in seconds", "输入超时时间（秒）"],
	["Enable aggressive terminal reuse", "启用更积极的终端复用"],
	["Terminal Execution Mode", "终端执行模式"],
	["VS Code Terminal", "VS Code 终端"],
	["Background Exec", "后台执行"],
	["Having terminal issues?", "终端有问题？"],
	["Terminal Quick Fixes", "终端快速修复"],
	["Complete Troubleshooting Guide", "完整故障排查指南"],
	["Disable browser tool usage", "禁用浏览器工具"],
	["Viewport size", "视口大小"],
	["Use remote browser connection", "使用远程浏览器连接"],
	["Checking connection...", "正在检查连接..."],
	["Connected", "已连接"],
	["Not connected", "未连接"],
	["Launching Browser...", "正在启动浏览器..."],
	["Launch Browser with Debug Mode", "以调试模式启动浏览器"],
	["Chrome Executable Path (Optional)", "Chrome 可执行文件路径（可选）"],
	["Custom Browser Arguments (Optional)", "自定义浏览器参数（可选）"],
	["Leave blank to auto-detect.", "留空则自动检测。"],
	["Community & Support", "社区与支持"],
	["Development", "开发"],
	["Resources", "资源"],
	["Documentation", "文档"],
	["Issues", "问题反馈"],
	["Feature Requests", "功能请求"],
	["Reset Workspace State", "重置工作区状态"],
	["Reset Global State", "重置全局状态"],
	["Reset Onboarding State", "重置引导状态"],
	["Newest", "最新"],
	["Oldest", "最早"],
	["Most Expensive", "费用最高"],
	["Most Tokens", "Token 最多"],
	["Most Relevant", "最相关"],
	["Workspace Only", "仅当前工作区"],
	["Favorites Only", "仅收藏"],
	["Fuzzy search history...", "模糊搜索历史..."],
	["Today", "今天"],
	["Older", "更早"],
	["Select All", "全选"],
	["Select None", "全不选"],
	["Delete selected items", "删除选中项"],
	["Delete all history", "删除全部历史"],
	["Delete All History", "删除全部历史"],
	["Delete Worktree", "删除工作树"],
	["New Worktree", "新建工作树"],
	["Create New Worktree", "创建新工作树"],
	["Create & Open", "创建并打开"],
	["Create Worktree", "创建工作树"],
	["Creating & Opening...", "正在创建并打开..."],
	["Creating...", "正在创建..."],
	["Branch Name *", "分支名称 *"],
	["Folder Path *", "文件夹路径 *"],
	["Clear", "清除"],
	["Cancel", "取消"],
	["Delete", "删除"],
	["Refresh", "刷新"],
	["Not configured", "未配置"],
	["Enabled", "已启用"],
	["Disabled", "已禁用"],
	["Success!", "成功！"],
	["Failed", "失败"],
	["Testing...", "正在测试..."],
	["Test", "测试"],
	["Test Upload", "测试上传"],
	["OpenTelemetry Configuration", "OpenTelemetry 配置"],
	["Prompt Uploading Configuration", "提示词上传配置"],
	["Build a Next.js App", "构建 Next.js 应用"],
	["Craft a CLI Tool", "制作 CLI 工具"],
	["Develop a Game", "开发小游戏"],
	["Get Started for Free", "免费开始"],
	["Use your own API key", "使用自己的 API Key"],
	["Let's go!", "开始！"],
	["Hi, I'm Cline", "你好，我是 NBG"],
	["Relay Base URL", "中转 Base URL"],
	["Relay API", "中转 API"],
	["Gateway Headers", "网关请求头"],
	["Model ID", "模型 ID"],
	["API Key", "API Key"],
	["Base URL", "Base URL"],
	["Support:", "支持："],
	["Speed:", "速度："],
	["Context:", "上下文："],
	["other options", "其他选项"],
	["Generating mermaid diagram...", "正在生成 Mermaid 图表..."],
	["Restores the task and your project's files back to a snapshot taken at this point", "将任务和项目文件恢复到此处的快照"],
	["Deletes messages after this point (does not affect workspace)", "删除此处之后的消息（不影响工作区）"],
	[
		"Restores your project's files to a snapshot taken at this point (task may become out of sync)",
		"将项目文件恢复到此处的快照（任务状态可能不同步）",
	],
	["Restore Task and Workspace", "恢复任务和工作区"],
	["Restore Task Only", "仅恢复任务"],
	["Restore Workspace Only", "仅恢复工作区"],
	["Compare", "比较"],
	["Restore", "恢复"],
	["Checkpoint", "检查点"],
	["Checkpoint (restored)", "检查点（已恢复）"],
	["Restore Files & Task", "恢复文件和任务"],
	["Revert files and clear messages after this point", "还原文件并清除之后的消息"],
	["More options", "更多选项"],
	["Restore Files Only", "仅恢复文件"],
	["Revert files to this checkpoint", "将文件还原到此检查点"],
	["Clear messages after this point", "清除此处之后的消息"],
	["TODOs", "待办"],
	["All Categories", "全部分类"],
	["Most Installs", "安装最多"],
	["GitHub Stars", "GitHub 星标"],
	["Name", "名称"],
	["Your organization has pre-configured the available MCP servers", "你的组织已预配置可用的 MCP 服务器"],
	["Community Made (use at your own risk)", "社区制作（请自行评估风险）"],
	["No token usage data available", "没有可用的 Token 使用数据"],
	["Used:", "已用："],
	["Total:", "总量："],
	["Remaining:", "剩余："],
	["Compact the current task?", "压缩当前任务？"],
	["No tools found", "未找到工具"],
	["No resources found", "未找到资源"],
	["Request Timeout", "请求超时"],
	["Returns", "返回"],
	["Error parsing response:", "解析响应失败："],
	["Your organization manages some MCP servers", "你的组织管理了部分 MCP 服务器"],
	["Transport Type", "传输类型"],
	["Task", "任务"],
	["Task Completed", "任务已完成"],
	["Hook:", "钩子："],
	["The model has determined this command requires explicit approval.", "模型判断此命令需要明确批准。"],
	["Plan Created", "规划已创建"],
	["Browser Connection", "浏览器连接"],
	["Status:", "状态："],
	["Connected", "已连接"],
	["Disconnected", "未连接"],
	["Type:", "类型："],
	["Remote", "远程"],
	["Local", "本地"],
	["Remote Host:", "远程主机："],
	["Tip:", "提示："],
	["Git Commits", "Git 提交"],
	["Searching...", "正在搜索..."],
	["The model used search patterns that don't match anything in the file. Retrying...", "模型使用的搜索模式未匹配到文件内容。正在重试..."],
	["What Happened?", "发生了什么？"],
	["Steps to Reproduce", "复现步骤"],
	["Relevant API Request Output", "相关 API 请求输出"],
	["Provider/Model", "提供方/模型"],
	["Operating System", "操作系统"],
	["System Info", "系统信息"],
	["Cline Version", "NBG 版本"],
	["Additional Context", "补充上下文"],
	["Subagent status update unavailable.", "子智能体状态更新不可用。"],
	["No matching commands found", "未找到匹配命令"],
	["Current:", "当前："],
	["Enable notifications", "启用通知"],
	["Signed in", "已登录"],
	["Unknown User", "未知用户"],
	["Failed to refresh models. Check your session or network.", "刷新模型失败。请检查会话或网络。"],
	["Loading...", "正在加载..."],
	["Model", "模型"],
	["Language Model", "语言模型"],
	["Select a model...", "选择模型..."],
	["Search model...", "搜索模型..."],
	["Search models...", "搜索模型..."],
	["Search and select a model...", "搜索并选择模型..."],
	["Search or enter a custom model ID...", "搜索或输入自定义模型 ID..."],
	["Reasoning Effort", "推理强度"],
	["low", "低"],
	["high", "高"],
	["Note:", "注意："],
	["Use custom base URL", "使用自定义 Base URL"],
	["Custom Base URL (optional)", "自定义 Base URL（可选）"],
	["Default", "默认"],
	["Custom", "自定义"],
	["Context Window", "上下文窗口"],
	["Context Window Size", "上下文窗口大小"],
	["Max Output Tokens", "最大输出 Token"],
	["Input Price / 1M tokens", "输入价格 / 100 万 Token"],
	["Output Price / 1M tokens", "输出价格 / 100 万 Token"],
	["Temperature", "温度"],
	["Header name", "请求头名称"],
	["Header value", "请求头值"],
	["Input:", "输入："],
	["Output:", "输出："],
	["Images", "图片"],
	["Prompt Caching", "提示词缓存"],
	["Cache Reads", "缓存读取"],
	["Cache Writes", "缓存写入"],
	["Tiered Pricing:", "分级价格："],
	["Provider Routing", "提供方路由"],
	["Price", "价格"],
	["Throughput", "吞吐量"],
	["Latency", "延迟"],
	["Done", "完成"],
	["Merge Worktree", "合并工作树"],
	["Merge conflicts detected", "检测到合并冲突"],
	["Delete worktree after successful merge", "合并成功后删除工作树"],
	["No worktrees found.", "未找到工作树。"],
	["Open in current window", "在当前窗口打开"],
	["Open in new window", "在新窗口打开"],
	["Delete this worktree", "删除此工作树"],
	["Multi-folder workspace detected", "检测到多文件夹工作区"],
	["Subfolder of a git repository", "Git 仓库子文件夹"],
	["Storage Type", "存储类型"],
	["Bucket", "存储桶"],
	["Region", "区域"],
	["Endpoint", "端点"],
	["Account ID", "账号 ID"],
	["Access Key ID", "Access Key ID"],
	["Secret Access Key", "Secret Access Key"],
	["Sync Interval", "同步间隔"],
	["Batch Size", "批大小"],
	["Max Retries", "最大重试次数"],
	["Max Queue Size", "最大队列大小"],
	["Backfill Enabled", "启用回填"],
	["Metrics Exporter", "指标导出器"],
	["Logs Exporter", "日志导出器"],
	["OTLP Protocol", "OTLP 协议"],
	["OTLP Endpoint", "OTLP 端点"],
	["Metrics Endpoint", "指标端点"],
	["Logs Endpoint", "日志端点"],
	["OTLP Headers", "OTLP 请求头"],
	["Metric Export Interval", "指标导出间隔"],
	["OTLP Insecure", "OTLP 不安全连接"],
	["Log Batch Size", "日志批大小"],
	["Log Batch Timeout", "日志批超时"],
	["Log Max Queue Size", "日志最大队列大小"],
	["Browser connection info", "浏览器连接信息"],
	["View all history", "查看全部历史"],
	["Favorited", "已收藏"],
	["Follow us on X", "在 X 上关注我们"],
	["Join our Discord", "加入 Discord"],
	["Star us on GitHub", "在 GitHub 上给我们星标"],
	["Join our subreddit", "加入 subreddit"],
	["Follow us on LinkedIn", "在 LinkedIn 上关注我们"],
	["Dismiss", "关闭"],
	["Dismiss banner", "关闭横幅"],
	["Previous banner", "上一条横幅"],
	["Next banner", "下一条横幅"],
	["Announcements", "公告"],
	["Copy Code", "复制代码"],
	["Requires API key", "需要 API Key"],
	["Restart Server", "重启服务器"],
	["Delete Server", "删除服务器"],
	["Disable Checkpoints", "禁用检查点"],
	["Delete Task", "删除任务"],
	["Quote selection", "引用选区"],
	["Quote selection in reply", "在回复中引用选区"],
	["Dismiss quote", "关闭引用"],
	["This was helpful", "这有帮助"],
	["This wasn't helpful", "这没有帮助"],
	["Report a bug", "报告问题"],
	["Slash commands", "斜杠命令"],
	["Context mentions", "上下文引用"],
	["Go to MCP server settings", "打开 MCP 服务器设置"],
	["Show full subagent prompt", "显示完整子智能体提示词"],
	["No, keep the task as is", "否，保持任务不变"],
	["Yes, compact the task", "是，压缩任务"],
	["Current tokens used in this request", "本次请求当前已使用 Token"],
	["Maximum context window size for this model", "此模型的最大上下文窗口"],
	["Context window usage progress", "上下文窗口使用进度"],
	["Auto Condense Threshold", "自动压缩阈值"],
	["Token Usage", "Token 使用量"],
	["View All", "查看全部"],
	["No recent tasks", "暂无最近任务"],
	["No description", "无描述"],
	["Unknown", "未知"],
	["Response (Error)", "响应（错误）"],
	["Failed to load image", "图片加载失败"],
	["Click to open in browser", "点击在浏览器中打开"],
	["Open file in editor", "在编辑器中打开文件"],
	["Add Header", "添加请求头"],
	["Remove", "移除"],
	["Model Configuration", "模型配置"],
	["Supports Images", "支持图片"],
	["Enable R1 messages format", "启用 R1 消息格式"],
	["Use Azure Identity Authentication", "使用 Azure Identity 身份验证"],
	["Modify reasoning effort", "修改推理强度"],
	["High effort may produce more thorough analysis but takes longer and uses more tokens.", "高推理强度可能产生更完整的分析，但耗时更长且消耗更多 Token。"],
	["Base URL (optional)", "Base URL（可选）"],
	["Enter base URL...", "输入 Base URL..."],
	["Enter Model ID...", "输入模型 ID..."],
	["Enter API Key...", "输入 API Key..."],
	["Enter API Key (optional)...", "输入 API Key（可选）..."],
	["Custom base URL", "自定义 Base URL"],
	["Default: noop", "默认：noop"],
	["Default: http://localhost:11434", "默认：http://localhost:11434"],
	["Default: http://localhost:1234", "默认：http://localhost:1234"],
	["Default: 30000 (30 seconds)", "默认：30000（30 秒）"],
	["Request Timeout (ms)", "请求超时（毫秒）"],
	["Model Context Window", "模型上下文窗口"],
	["Unable to fetch models from Ollama server. Please ensure Ollama is running and accessible, or enter the model ID manually above.", "无法从 Ollama 服务器获取模型。请确认 Ollama 正在运行且可访问，或在上方手动输入模型 ID。"],
	["Maximum time in milliseconds to wait for API responses before timing out.", "等待 API 响应的最长时间，单位为毫秒，超出后视为超时。"],
	["quickstart guide.", "快速入门指南。"],
	["quickstart guide", "快速入门指南"],
	["local server", "本地服务器"],
	["Not editable - the value is returned by the connected endpoint", "不可编辑，该值由已连接的端点返回"],
	["This key is stored locally and only used to make API requests from this extension.", "此密钥仅保存在本地，只会用于从本扩展发起 API 请求。"],
	["You can get a", "你可以在这里注册获取"],
	["API key by signing up here.", "API Key。"],
	["Select the API endpoint according to your region:", "根据你的地区选择 API 端点："],
	["for China, or", "中国大陆使用"],
	["for all other locations.", "其他地区使用。"],
	["Entrypoint", "入口"],
	["Z AI Entrypoint", "Z AI 入口"],
	["Moonshot Entrypoint", "Moonshot 入口"],
	["MiniMax Entrypoint", "MiniMax 入口"],
	["Alibaba API Line", "阿里云 API 线路"],
	["Google Cloud Project ID", "Google Cloud 项目 ID"],
	["Google Cloud Region", "Google Cloud 区域"],
	["Select a region...", "选择区域..."],
	["Vercel AI Gateway API Key", "Vercel AI Gateway API Key"],
	["OpenRouter API Key", "OpenRouter API Key"],
	["Hugging Face API Key", "Hugging Face API Key"],
	["Hicap API Key", "Hicap API Key"],
	["Claude Code CLI Path", "Claude Code CLI 路径"],
	["AI Core Client Id", "AI Core 客户端 ID"],
	["AI Core Client Secret", "AI Core 客户端密钥"],
	["AI Core Base URL", "AI Core Base URL"],
	["AI Core Auth URL", "AI Core 认证 URL"],
	["AI Core Resource Group", "AI Core 资源组"],
	["Orchestration Mode", "编排模式"],
	["Loading models...", "正在加载模型..."],
	["AWS Profile", "AWS 配置档案"],
	["AWS Credentials", "AWS 凭据"],
	["AWS Profile Name", "AWS 配置档案名称"],
	["AWS Bedrock Api Key", "AWS Bedrock API Key"],
	["AWS Access Key", "AWS Access Key"],
	["AWS Secret Key", "AWS Secret Key"],
	["AWS Session Token", "AWS 会话 Token"],
	["AWS Region", "AWS 区域"],
	["Base Inference Model", "基础推理模型"],
	["Enter profile name (default if empty)", "输入配置档案名称（留空使用 default）"],
	["Enter Bedrock Api Key", "输入 Bedrock API Key"],
	["Enter Access Key...", "输入 Access Key..."],
	["Enter Secret Key...", "输入 Secret Key..."],
	["Enter Session Token...", "输入会话 Token..."],
	["Search or enter custom region...", "搜索或输入自定义区域..."],
	["Enter VPC Endpoint URL (optional)", "输入 VPC 端点 URL（可选）"],
	["Enter custom model ID...", "输入自定义模型 ID..."],
	["Signed in to OpenAI Codex", "已登录 OpenAI Codex"],
	["Sign in to OpenAI Codex", "登录 OpenAI Codex"],
	["Connecting…", "正在连接..."],
	["Oracle employment", "Oracle 员工身份"],
	["I’m an Oracle Employee", "我是 Oracle 员工"],
	["Sign in with Oracle Code Assist", "使用 Oracle Code Assist 登录"],
	["Log out", "退出登录"],
	["Retry", "重试"],
	["Sign in again", "重新登录"],
	["No models found", "未找到模型"],
	["Plain Text", "纯文本"],
	["Rich Display", "富文本显示"],
])

const PATTERN_TRANSLATIONS: Array<[RegExp, (match: string, ...groups: string[]) => string]> = [
	[/^Delete (\d+)? ?Selected(.*)$/u, (_match, count = "", rest = "") => `删除${count ? ` ${count} 个` : ""}选中项${rest}`],
	[/^Delete All History(.*)$/u, (_match, rest = "") => `删除全部历史${rest}`],
	[/^Delete Task \(size: (.+)\)$/u, (_match, size) => `删除任务（大小：${size}）`],
	[/^Retry in: (\d+) seconds$/u, (_match, seconds) => `${seconds} 秒后重试`],
	[/^(.+) environment$/u, (_match, env) => `${translateExact(env)}环境`],
	[/^Search (.+)\.\.\.$/u, (_match, subject) => `搜索${translateExact(subject).toLowerCase()}...`],
	[/^Enter (.+)\.\.\.$/u, (_match, subject) => `输入${translateExact(subject)}...`],
]

const SKIP_SELECTOR = [
	"code",
	"pre",
	"kbd",
	"samp",
	"select",
	"option",
	"[contenteditable='true']",
	".chat-row-user-message-container",
	".chat-row-assistant-message-container",
	".markdown-body",
	".hljs",
].join(",")

const TRANSLATABLE_ATTRIBUTES = [
	"placeholder",
	"aria-label",
	"aria-description",
	"aria-roledescription",
	"aria-valuetext",
	"title",
	"alt",
	"data-tooltip",
	"data-title",
	"data-description",
] as const

let activeObserver: MutationObserver | null = null
const observedShadowRoots = new WeakSet<ShadowRoot>()

const translateExact = (value: string): string => EXACT_TRANSLATIONS.get(value.trim()) ?? value.trim()

const preserveOuterWhitespace = (source: string, translated: string) => {
	const prefix = source.match(/^\s*/u)?.[0] ?? ""
	const suffix = source.match(/\s*$/u)?.[0] ?? ""
	return `${prefix}${translated}${suffix}`
}

const translateText = (value: string): string => {
	const compact = value.trim().replace(/\s+/gu, " ")
	if (!compact) {
		return value
	}

	const exact = EXACT_TRANSLATIONS.get(compact)
	if (exact) {
		return preserveOuterWhitespace(value, exact)
	}

	for (const [pattern, replacer] of PATTERN_TRANSLATIONS) {
		if (pattern.test(compact)) {
			return preserveOuterWhitespace(value, compact.replace(pattern, replacer as any))
		}
	}

	return value
}

const shouldSkipNode = (node: Node) => {
	const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
	return Boolean(element?.closest(SKIP_SELECTOR))
}

const translateElementAttributes = (element: Element) => {
	if (element.closest("code,pre,kbd,samp,[contenteditable='true'],.chat-row-user-message-container,.chat-row-assistant-message-container,.markdown-body,.hljs")) {
		return
	}

	for (const attribute of TRANSLATABLE_ATTRIBUTES) {
		const value = element.getAttribute(attribute)
		if (!value) {
			continue
		}
		const translated = translateText(value)
		if (translated !== value) {
			element.setAttribute(attribute, translated)
		}
	}
}

const observeShadowRoot = (shadowRoot: ShadowRoot) => {
	if (!activeObserver || observedShadowRoots.has(shadowRoot)) {
		return
	}

	observedShadowRoots.add(shadowRoot)
	activeObserver.observe(shadowRoot, {
		attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
		attributes: true,
		childList: true,
		subtree: true,
	})
}

const translateShadowRoot = (element: Element) => {
	const shadowRoot = element.shadowRoot
	if (!shadowRoot) {
		return
	}

	observeShadowRoot(shadowRoot)

	const walker = document.createTreeWalker(shadowRoot, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
	while (walker.nextNode()) {
		const current = walker.currentNode
		if (current.nodeType === Node.ELEMENT_NODE) {
			translateElementAttributes(current as Element)
		} else {
			translateNode(current)
		}
	}
}

const translateNode = (node: Node) => {
	if (node.nodeType === Node.TEXT_NODE) {
		if (shouldSkipNode(node)) {
			return
		}
		const current = node.textContent ?? ""
		const translated = translateText(current)
		if (translated !== current) {
			node.textContent = translated
		}
		return
	}

	if (node.nodeType !== Node.ELEMENT_NODE) {
		return
	}

	const element = node as Element
	translateElementAttributes(element)
	translateShadowRoot(element)

	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
	while (walker.nextNode()) {
		const current = walker.currentNode
		if (current.nodeType === Node.ELEMENT_NODE) {
			const currentElement = current as Element
			translateElementAttributes(currentElement)
			translateShadowRoot(currentElement)
		} else {
			translateNode(current)
		}
	}
}

export const installZhCNWebviewTranslation = () => {
	if (typeof document === "undefined" || typeof MutationObserver === "undefined") {
		return
	}

	const translateRoot = () => translateNode(document.body)
	queueMicrotask(translateRoot)

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "attributes" && mutation.target.nodeType === Node.ELEMENT_NODE) {
				translateElementAttributes(mutation.target as Element)
				translateShadowRoot(mutation.target as Element)
			}
			for (const node of mutation.addedNodes) {
				translateNode(node)
			}
		}
	})
	activeObserver = observer

	observer.observe(document.body, {
		attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
		attributes: true,
		childList: true,
		subtree: true,
	})
}
