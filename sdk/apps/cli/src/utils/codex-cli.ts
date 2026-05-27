import {
	type ChildProcessWithoutNullStreams,
	execFile,
	spawn,
} from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const OPENAI_CODEX_CLI_PROVIDER_ID = "openai-codex-cli";
export const CODEX_CLI_INSTALL_URL = "https://developers.openai.com/codex/cli";
export const CLAUDE_CODE_PROVIDER_ID = "claude-code";
export const CLAUDE_CODE_INSTALL_URL =
	"https://docs.anthropic.com/en/docs/claude-code/setup";

export type CodexCliStatus =
	| {
			installed: true;
			version: string;
			authenticated?: boolean;
	  }
	| {
			installed: false;
			reason: string;
			authRequired?: boolean;
			commandAvailable?: boolean;
	  };

export interface ClaudeCodeLoginSession {
	cancel: () => void;
	submitCode: (code: string) => void;
}

function normalizeLocalCliProviderId(providerId: string | undefined): string {
	return (providerId ?? "").trim().toLowerCase();
}

export function isOpenAICodexCliProvider(providerId: string | undefined): boolean {
	return normalizeLocalCliProviderId(providerId) === OPENAI_CODEX_CLI_PROVIDER_ID;
}

export function isClaudeCodeProvider(providerId: string | undefined): boolean {
	return normalizeLocalCliProviderId(providerId) === CLAUDE_CODE_PROVIDER_ID;
}

export function isLocalCliProvider(providerId: string | undefined): boolean {
	return isOpenAICodexCliProvider(providerId) || isClaudeCodeProvider(providerId);
}

export function getLocalCliProviderInfo(providerId: string | undefined): {
	command: string;
	displayName: string;
	installUrl: string;
	authHint: string;
} {
	if (isClaudeCodeProvider(providerId)) {
		return {
			command: "claude",
			displayName: "Claude Code",
			installUrl: CLAUDE_CODE_INSTALL_URL,
			authHint: "安装后请运行 claude auth login 完成 Anthropic 官方账号验证。",
		};
	}
	return {
		command: "codex",
		displayName: "Codex CLI",
		installUrl: CODEX_CLI_INSTALL_URL,
		authHint: "安装后请运行 codex login 完成 ChatGPT 订阅验证。",
	};
}

function isClaudeCodeLoggedIn(output: string): boolean {
	try {
		const parsed = JSON.parse(output) as { loggedIn?: unknown };
		return parsed.loggedIn === true;
	} catch {
		return (
			output.includes('"loggedIn": true') ||
			output.includes('"loggedIn":true')
		);
	}
}

function extractAuthUrl(text: string): string | undefined {
	const match = /https?:\/\/[^\s]+/.exec(text);
	return match?.[0].replace(/[)>.,]+$/g, "");
}

function toErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return String(error);
}

export function startClaudeCodeLogin(input: {
	onDone: () => void;
	onError: (message: string) => void;
	onOutput?: (text: string) => void;
	onStatus: (status: string) => void;
	onUrl: (url: string) => void;
}): ClaudeCodeLoginSession {
	let child: ChildProcessWithoutNullStreams | undefined;
	let settled = false;
	let urlEmitted = false;

	const handleOutput = (text: string) => {
		input.onOutput?.(text);
		if (text.includes("Opening browser")) {
			input.onStatus("正在打开 Claude 官方验证...");
		}
		const url = extractAuthUrl(text);
		if (url && !urlEmitted) {
			urlEmitted = true;
			input.onUrl(url);
			input.onStatus("请在浏览器中完成 Claude 官方验证。");
		}
		if (text.includes("Paste code here")) {
			input.onStatus("如果页面要求粘贴授权码，请粘贴到下方并回车。");
		}
		if (text.includes("Login successful")) {
			input.onStatus("Claude 官方验证成功。");
		}
	};

	try {
		child = spawn("claude", ["auth", "login", "--claudeai"], {
			stdio: "pipe",
			windowsHide: true,
		});
		child.stdin.setDefaultEncoding("utf8");
	} catch (error) {
		settled = true;
		input.onError(toErrorMessage(error));
		return {
			cancel: () => {},
			submitCode: () => {},
		};
	}

	child.stdout.on("data", (chunk: Buffer | string) => {
		handleOutput(chunk.toString());
	});
	child.stderr.on("data", (chunk: Buffer | string) => {
		handleOutput(chunk.toString());
	});
	child.on("error", (error) => {
		if (settled) return;
		settled = true;
		input.onError(toErrorMessage(error));
	});
	child.on("close", (code, signal) => {
		if (settled) return;
		settled = true;
		if (code === 0) {
			input.onDone();
			return;
		}
		if (signal) {
			input.onError(`Claude 官方验证已中断（${signal}）。`);
			return;
		}
		input.onError(`Claude 官方验证失败，退出码 ${code ?? "unknown"}。`);
	});

	return {
		cancel: () => {
			if (settled) return;
			settled = true;
			child?.kill();
		},
		submitCode: (code: string) => {
			const value = code.trim();
			if (!value || !child?.stdin.writable) return;
			child.stdin.write(`${value}\n`);
		},
	};
}

export async function checkLocalCliInstalled(
	providerId: string,
): Promise<CodexCliStatus> {
	const info = getLocalCliProviderInfo(providerId);
	try {
		const result = await execFileAsync(info.command, ["--version"], {
			timeout: 3000,
			windowsHide: true,
		});
		const version = (result.stdout || result.stderr).trim();
		const status: CodexCliStatus = {
			installed: true,
			version: version || info.command,
		};
		if (isClaudeCodeProvider(providerId)) {
			let authOutput = "";
			try {
				const authResult = await execFileAsync("claude", ["auth", "status"], {
					timeout: 3000,
					windowsHide: true,
				});
				authOutput = (authResult.stdout || authResult.stderr).trim();
			} catch (error) {
				return {
					installed: false,
					commandAvailable: true,
					authRequired: true,
					reason: `${info.displayName} 已安装，但还没有完成 Anthropic 官方验证。按 L 启动官方登录。${toErrorMessage(error)}`,
				};
			}
			if (!isClaudeCodeLoggedIn(authOutput)) {
				return {
					installed: false,
					commandAvailable: true,
					authRequired: true,
					reason: `${info.displayName} 已安装，但还没有完成 Anthropic 官方验证。按 L 启动官方登录。`,
				};
			}
			status.authenticated = true;
		}
		return status;
	} catch (error) {
		const details =
			error && typeof error === "object"
				? (error as { code?: unknown; message?: unknown })
				: undefined;
		const code = typeof details?.code === "string" ? details.code : "";
		if (code === "ENOENT") {
			return {
				installed: false,
				reason: `未在 PATH 中找到 ${info.command} 可执行文件。${info.authHint}`,
			};
		}
		const message =
			typeof details?.message === "string"
				? details.message
				: `无法运行 ${info.command} --version。`;
		return {
			installed: false,
			reason: isClaudeCodeProvider(providerId)
				? `${message}。${info.authHint}`
				: message,
		};
	}
}

export async function checkCodexCliInstalled(): Promise<CodexCliStatus> {
	return checkLocalCliInstalled(OPENAI_CODEX_CLI_PROVIDER_ID);
}
