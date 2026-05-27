export interface PlatformDef {
	id: string;
	name: string;
	type: "polling" | "webhook";
	hint: string;
	fields: FieldDef[];
	security?: SecurityDef;
}

export interface FieldDef {
	flag: string;
	label: string;
	placeholder?: string;
	required?: boolean;
	help?: string[];
}

export interface SecurityFieldDef {
	key: string;
	label: string;
	placeholder?: string;
	help?: string[];
	requiredMessage: string;
	validate?: (value: string) => string | undefined;
}

export interface SecurityDef {
	prompt: string;
	fields: SecurityFieldDef[];
	buildHookCommand: (values: Record<string, string>) => string;
}

function validateTelegramUserId(value: string): string | undefined {
	return /^\d+$/.test(value)
		? undefined
		: "Telegram 用户 ID 只能包含数字";
}

function validateSlackTeamId(value: string): string | undefined {
	return /^T[A-Z0-9]+$/.test(value)
		? undefined
		: "Slack 工作区 ID 必须以 T 开头，且只能包含大写字母或数字";
}

function validateSlackUserId(value: string): string | undefined {
	return /^[UW][A-Z0-9]+$/.test(value)
		? undefined
		: "Slack 成员 ID 必须以 U 或 W 开头，且只能包含大写字母或数字";
}

export const PLATFORMS: PlatformDef[] = [
	{
		id: "telegram",
		name: "Telegram",
		type: "polling",
		hint: "最容易设置。不需要公网 URL。",
		fields: [
			{
				flag: "-k",
				label: "机器人 token",
				placeholder: "7123456789:AAH...",
				required: true,
				help: [
					"打开 Telegram，并与 @BotFather 开始聊天",
					"发送 /newbot 并按提示操作",
					"创建机器人后，BotFather 会给出这个 token",
					"格式类似 7123456789:AAHxxx...",
				],
			},
		],
		security: {
			prompt:
				"默认情况下，任何找到你的机器人并发消息的人都能在你的机器上运行任务。是否限制为你的 Telegram 用户 ID？",
			fields: [
				{
					key: "userId",
					label: "你的 Telegram 用户 ID",
					placeholder: "123456789",
					help: [
						"在 Telegram 给 @userinfobot 发消息",
						"它会回复你的数字用户 ID",
					],
					requiredMessage: "限制访问需要填写用户 ID",
					validate: validateTelegramUserId,
				},
			],
			buildHookCommand: ({ userId }) =>
				`jq -r ".payload.actor.participantKey" | grep -q "telegram:id:${userId}" && echo '{"action":"allow"}' || echo '{"action":"deny"}'`,
		},
	},
	{
		id: "slack",
		name: "Slack",
		type: "webhook",
		hint: "需要 Slack app 和公网 URL。",
		fields: [
			{
				flag: "--bot-token",
				label: "机器人 token",
				placeholder: "xoxb-...",
				required: true,
				help: [
					"打开 api.slack.com/apps 并创建新 app",
					"添加 Bot Token Scopes：chat:write、app_mentions:read、channels:history、channels:read、im:history、im:read、im:write、users:read",
					"安装到工作区并复制 Bot Token",
				],
			},
			{
				flag: "--signing-secret",
				label: "签名密钥",
				required: true,
				help: ["可在 app 的 Basic Information 页面找到"],
			},
			{
				flag: "--base-url",
				label: "公网 Base URL",
				placeholder: "https://example.com",
				required: true,
				help: [
					"用于 webhook 回调的公网可访问 URL",
					"本地开发可使用 ngrok 或类似工具",
				],
			},
		],
		security: {
			prompt: "是否限制可与机器人交互的 Slack 用户？",
			fields: [
				{
					key: "teamId",
					label: "允许的 Slack 工作区 ID",
					placeholder: "T01ABC123",
					help: [
						"在浏览器中打开你的 Slack 工作区 URL",
						"工作区 ID 是 /client/ 后面的片段，例如 T01ABC123",
					],
					requiredMessage: "限制访问需要填写工作区 ID",
					validate: validateSlackTeamId,
				},
				{
					key: "userId",
					label: "允许的 Slack 成员 ID",
					placeholder: "U01ABC123",
					help: [
						"在 Slack 中点击用户名称，然后查看完整资料",
						"点击 ... 并复制成员 ID",
					],
					requiredMessage: "限制访问需要填写成员 ID",
					validate: validateSlackUserId,
				},
			],
			buildHookCommand: ({ teamId, userId }) =>
				`jq -r ".payload.actor.participantKey" | grep -q "slack:team:${teamId}:user:${userId}" && echo '{"action":"allow"}' || echo '{"action":"deny"}'`,
		},
	},
	{
		id: "discord",
		name: "Discord",
		type: "webhook",
		hint: "需要 Discord app 和公网 URL。",
		fields: [
			{
				flag: "--application-id",
				label: "应用 ID",
				required: true,
				help: [
					"打开 discord.com/developers/applications",
					"创建新 app，并复制 Application ID",
				],
			},
			{
				flag: "--bot-token",
				label: "机器人 token",
				required: true,
				help: ["进入 Bot 区域，创建机器人并复制 token"],
			},
			{
				flag: "--public-key",
				label: "公钥",
				required: true,
				help: ["可在 app 的 General Information 中找到"],
			},
			{
				flag: "--base-url",
				label: "公网 Base URL",
				placeholder: "https://example.com",
				required: true,
				help: ["将此设置为 Interactions Endpoint URL"],
			},
		],
	},
	{
		id: "whatsapp",
		name: "WhatsApp",
		type: "webhook",
		hint: "需要 Meta 开发者账号和公网 URL。",
		fields: [
			{
				flag: "--phone-number-id",
				label: "电话号码 ID",
				required: true,
				help: ["来自 Meta Developer 门户中的 WhatsApp Business 账号"],
			},
			{
				flag: "--access-token",
				label: "访问 token",
				required: true,
				help: ["在 Meta Developer 门户中生成永久 token"],
			},
			{
				flag: "--app-secret",
				label: "App 密钥",
				required: true,
				help: ["可在 App Settings > Basic 中找到"],
			},
			{
				flag: "--verify-token",
				label: "Webhook 验证 token",
				placeholder: "my-verify-token",
				required: true,
				help: ["任意自定义字符串，用于验证 webhook 设置"],
			},
			{
				flag: "--base-url",
				label: "公网 Base URL",
				placeholder: "https://example.com",
				required: true,
			},
		],
	},
	{
		id: "gchat",
		name: "Google Chat",
		type: "webhook",
		hint: "需要 Google Cloud 项目和公网 URL。",
		fields: [
			{
				flag: "--credentials-json",
				label: "服务账号凭据 JSON",
				required: true,
				help: [
					"在 Google Cloud Console 中创建服务账号",
					"下载凭据 JSON 文件",
					"在这里粘贴 JSON 内容",
				],
			},
			{
				flag: "--base-url",
				label: "公网 Base URL",
				placeholder: "https://example.com",
				required: true,
			},
		],
	},
	{
		id: "linear",
		name: "Linear",
		type: "webhook",
		hint: "响应 Linear issue 和评论。",
		fields: [
			{
				flag: "--api-key",
				label: "API Key",
				required: true,
				help: ["打开 Linear Settings > API > Personal API keys"],
			},
			{
				flag: "--webhook-secret",
				label: "Webhook 签名密钥",
				required: true,
				help: [
					"打开 Settings > API > Webhooks，并创建一个 webhook",
					"复制签名密钥",
				],
			},
			{
				flag: "--base-url",
				label: "公网 Base URL",
				placeholder: "https://example.com",
				required: true,
			},
		],
	},
];
