import { fstatSync } from "node:fs";
import { homedir } from "node:os";
import { basename } from "node:path";
import type { ToolPolicy } from "@cline/core";

import { registerDisposable } from "@cline/shared";
import type { Command } from "commander";
import {
	CommanderError,
	commanderToParsedArgs,
	createProgram,
} from "./commands/program";
import {
	autoUpdateOnStartup,
	getPreferredKanbanInstaller,
} from "./commands/update";
import { CLI_DEFAULT_CHECKPOINT_CONFIG } from "./runtime/defaults";
import {
	buildCliCompactionConfig,
	CLI_COMPACTION_MODE_EXPECTED_TEXT,
} from "./utils/compaction-mode";
import {
	configureSandboxEnvironment,
	normalizeAutoApproveArgs,
	resolveWorkspaceRoot,
} from "./utils/helpers";
import {
	c,
	installStreamErrorGuards,
	setCurrentOutputMode,
	writeErr,
	writeln,
} from "./utils/output";
import {
	ensureOAuthProviderApiKey,
	getPersistedProviderApiKey,
	isOAuthProvider,
	normalizeProviderId,
} from "./utils/provider-auth";
import { rewriteTeamPrompt, TEAM_COMMAND_USAGE } from "./utils/team-command";
import { THIRD_PARTY_PROVIDER_ID } from "./utils/third-party-api";
import {
	captureCliExtensionActivated,
	getCliTelemetryService,
} from "./utils/telemetry";
import type { Config } from "./utils/types";
import { runConnectWizard } from "./wizards/connect";
import { runMcpWizard } from "./wizards/mcp";
import { runScheduleWizard } from "./wizards/schedule";

export function stdinHasPipedInput(): boolean {
	if (process.stdin.isTTY) return false;
	try {
		const stats = fstatSync(0);
		return stats.isFIFO() || stats.isFile();
	} catch {
		return false;
	}
}

async function createProviderSettingsManager() {
	const { ProviderSettingsManager } = await import("@cline/core");
	return new ProviderSettingsManager();
}

async function loadCliRuntimeModules() {
	const [coreServer, prompt, runAgentModule] = await Promise.all([
		import("@cline/core"),
		import("./runtime/prompt"),
		import("./runtime/run-agent"),
	]);
	return {
		coreServer,
		resolveSystemPrompt: prompt.resolveSystemPrompt,
		runAgent: runAgentModule.runAgent,
	};
}

async function loadInteractiveRuntimeModule() {
	const { runInteractive } = await import("./runtime/run-interactive");
	return runInteractive;
}

/**
 * Two-pass approach for --config: a quick scan of process.argv extracts the
 * config directory before commander parses, because setClineDir() must run
 * before any code that reads the home/config directory.
 *
 * Recognizes both Commander spellings:
 *   --config <dir>
 *   --config=<dir>
 *
 * Exported for unit testing; callers in this file should use this rather
 * than reimplementing the scan.
 */
export function resolveConfigDirArg(argv: string[]): string | undefined {
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--config") {
			const value = argv[i + 1]?.trim();
			return value ? value : undefined;
		}
		if (arg?.startsWith("--config=")) {
			const value = arg.slice("--config=".length).trim();
			return value ? value : undefined;
		}
	}
	return undefined;
}

export async function runCli(): Promise<void> {
	installStreamErrorGuards();
	autoUpdateOnStartup();

	const cliArgs = process.argv.slice(2);
	const configDir = resolveConfigDirArg(cliArgs);
	const { setClineDir, setHomeDir } = await import("@cline/shared/storage");
	if (configDir) {
		setClineDir(configDir);
	}
	setHomeDir(homedir());

	// Capture activation telemetry only after config/home directory selection
	// has been applied, so the telemetry singleton's persisted distinct-id
	// (and any other storage it touches) lands under the user-selected
	// `--config <dir>` rather than the default home/config location.
	captureCliExtensionActivated();

	let launchConfigView = false;
	const normalizedArgs = normalizeAutoApproveArgs(cliArgs);

	// Subcommand routing via Commander
	const ctx: { exitCode?: number; resumeSessionId?: string } = {};
	const io = { writeln, writeErr };
	const program = createProgram();
	// Re-enable built-in help/version output for the routing program
	program.configureOutput({
		writeOut: (str: string) => process.stdout.write(str),
		writeErr: (str: string) => process.stderr.write(str),
	});
	// Default action handles non-subcommand args (e.g. prompt text)
	program.action(() => {});

	// Auth subcommand: defines its own options so commander parses them
	// directly. The short flags -p/-m intentionally shadow the root's -p (plan)
	// and -m (model); commander scopes options per-command so there is no
	// conflict.
	const authCmd = program
		.command("auth")
		.description("认证提供方并配置要使用的模型")
		.argument("[provider]", "提供方 ID（-p 的位置参数简写）")
		.option("-p, --provider <id>", "提供方 ID")
		.option("-k, --apikey <key>", "API Key")
		.option(
			"-m, --modelid <id>",
			"模型 ID（openai-compatible 可省略，自动获取默认模型）",
		)
		.option("-b, --baseurl <url>", "基础 URL")
		.option("--config <dir>", "配置目录")
		.option("-c, --cwd <path>", "工作目录")
		.option(
			"--data-dir <dir>",
			"在 <dir> 使用隔离的本地状态，而不是 ~/.cline（启用沙箱模式）",
		)
		.option("-v, --verbose", "显示详细输出")
		.action(async (positionalProvider: string | undefined) => {
			const opts = authCmd.opts<{
				provider?: string;
				apikey?: string;
				modelid?: string;
				baseurl?: string;
				config?: string;
				cwd?: string;
				dataDir?: string;
				verbose?: boolean;
			}>();
			// Honor --config inside the action as a defense-in-depth measure.
			// The early pre-pass in runCli() also calls setClineDir(), but only
			// for argv tokens it can spot before commander runs. Reapplying
			// here ensures opts.config (parsed by commander, including the
			// --config=<dir> form) is always respected before any provider
			// settings manager is constructed against ~/.cline.
			if (opts.config?.trim()) {
				const { setClineDir } = await import("@cline/shared/storage");
				setClineDir(opts.config.trim());
			}
			// Honor --data-dir before constructing the provider settings manager
			// so writes land under the chosen data dir instead of ~/.cline.
			configureSandboxEnvironment({
				enabled: !!opts.dataDir || process.env.CLINE_SANDBOX?.trim() === "1",
				cwd: opts.cwd ?? process.cwd(),
				explicitDir: opts.dataDir,
			});
			const { runAuthCommand } = await import("./commands/auth");
			const providerSettingsManager = await createProviderSettingsManager();
			ctx.exitCode = await runAuthCommand({
				providerSettingsManager,
				explicitProvider: opts.provider ?? positionalProvider,
				apikey: opts.apikey,
				modelid: opts.modelid,
				baseurl: opts.baseurl,
				io,
			});
		});

	const createConfigRuntimeCommand = async () => {
		const { createConfigCommand } = await import("./commands/config");
		let configCmd: Command;
		configCmd = createConfigCommand(
			() => resolveWorkspaceRoot(program.opts().cwd ?? process.cwd()),
			() => {
				const outputMode =
					program.opts().json || configCmd.opts().json
						? ("json" as const)
						: ("text" as const);
				setCurrentOutputMode(outputMode);
				return outputMode;
			},
			io,
			(code) => {
				ctx.exitCode = code;
			},
			() => {
				launchConfigView = true;
			},
		);
		return configCmd;
	};

	program
		.command("config")
		.description("显示当前配置")
		.option("--json", "以 JSON 输出")
		.option("--config <dir>", "配置目录")
		.allowUnknownOption()
		.allowExcessArguments()
		.passThroughOptions()
		.action(async (_opts: unknown, cmd: Command) => {
			const realCmd = await createConfigRuntimeCommand();
			await realCmd.parseAsync(cmd.args, { from: "user" });
		});

	const pluginCmd = program
		.command("plugin")
		.description("管理 NBG 插件")
		.action(() => {
			pluginCmd.help();
		});
	const pluginInstallCmd = pluginCmd
		.command("install")
		.alias("i")
		.description("从 npm、git、URL 或本地路径安装 NBG 插件")
		.argument(
			"<source>",
			"npm 包、git URL、插件文件 URL 或本地插件路径",
		)
		.option("--npm", "将来源视为 npm 包")
		.option("--git", "将来源视为 git 仓库")
		.option("--force", "替换同一来源的已有安装")
		.option("--json", "以 JSON 输出")
		.option("--cwd <path>", "安装到 <path>/.cline/plugins")
		.action(async (source: string) => {
			const opts = pluginInstallCmd.opts<{
				npm?: boolean;
				git?: boolean;
				force?: boolean;
				json?: boolean;
				cwd?: string;
			}>();
			const sourceTypes = [
				opts.npm ? ("npm" as const) : undefined,
				opts.git ? ("git" as const) : undefined,
			].filter((sourceType) => sourceType !== undefined);
			if (sourceTypes.length > 1) {
				writeErr("plugin install 只能接受一个来源类型标志");
				ctx.exitCode = 1;
				return;
			}
			const { runPluginInstallCommand } = await import("./commands/plugin");
			ctx.exitCode = await runPluginInstallCommand({
				source,
				sourceType: sourceTypes[0],
				cwd: opts.cwd,
				force: opts.force === true,
				json: opts.json === true || program.opts().json === true,
				io,
			});
		});
	const connectCmd = program
		.command("connect")
		.description("连接到外部频道")
		.argument("[channel]", "要连接 NBG CLI 的频道")
		.option("--stop", "终止所有当前频道连接")
		.allowUnknownOption()
		.passThroughOptions()
		.addHelpText(
			"after",
			"\n运行 'connect <channel> --help' 查看频道专属选项。",
		)
		.action(async (adapter: string | undefined) => {
			const {
				formatAdapterList,
				runConnectAdapter,
				runStopAllConnectors,
				runStopConnector,
			} = await import("./commands/connect");
			const opts = connectCmd.opts();
			if (opts.stop) {
				if (adapter) {
					ctx.exitCode = await runStopConnector(adapter, io);
				} else {
					ctx.exitCode = await runStopAllConnectors(io);
				}
			} else if (adapter) {
				// connectCmd.args = [adapter, ...passthroughFlags]. Pass only the
				// connector-specific flags (everything after the adapter name).
				ctx.exitCode = await runConnectAdapter(
					adapter,
					connectCmd.args.slice(1),
					io,
				);
			} else if (process.stdin.isTTY && process.stdout.isTTY) {
				ctx.exitCode = await runConnectWizard();
			} else {
				writeln(`\n适配器：\n${formatAdapterList()}`);
				connectCmd.help();
			}
		});

	program
		.command("mcp")
		.description("管理 MCP 服务器")
		.action(async () => {
			if (process.stdin.isTTY && process.stdout.isTTY) {
				ctx.exitCode = await runMcpWizard();
			} else {
				writeln(
					"MCP 向导需要 TTY。使用 nbg config mcp 列出服务器。",
				);
			}
		});

	const createDoctorRuntimeCommand = async () => {
		const { createDoctorCommand } = await import("./commands/doctor");
		return createDoctorCommand(io, (code) => {
			ctx.exitCode = code;
		});
	};

	program
		.command("doctor")
		.description("诊断并修复配置问题")
		.allowUnknownOption()
		.allowExcessArguments()
		.passThroughOptions()
		.addHelpText(
			"after",
			"\n命令：\n  fix  终止所有正在运行的进程\n  log  打开 CLI 日志文件\n",
		)
		.action(async (_opts: unknown, cmd: Command) => {
			const doctorCmd = await createDoctorRuntimeCommand();
			await doctorCmd.parseAsync(cmd.args, { from: "user" });
		});

	const historyCmd = program
		.command("history")
		.alias("h")
		.description("列出会话历史或管理已保存会话")
		.option("--json", "以 JSON 输出")
		.option("--limit <count>", "最多显示的会话数量", "50")
		.option("--page <number>", "分页结果页码")
		.option("--config <dir>", "配置目录")
		.action(async () => {
			const opts = historyCmd.opts();
			const limit = Number.parseInt(opts.limit, 10);
			const outputMode =
				program.opts().json || opts.json
					? ("json" as const)
					: ("text" as const);
			const { runHistoryList } = await import("./commands/history");
			const result = await runHistoryList({
				limit,
				outputMode,
				io,
			});
			if (typeof result === "string") {
				ctx.resumeSessionId = result;
				// JSON listing should never return a session id; if it does, still exit here so
				// we never fall through to agent bootstrap (which can block on stdin in CI).
				if (outputMode === "json") {
					ctx.exitCode = 0;
				}
			} else {
				// Always set exit code for numeric results so `ctx.exitCode` is never left
				// undefined (that would fall through and load the full CLI runtime).
				ctx.exitCode = result ?? 0;
			}
		});

	const historyDeleteCmd = historyCmd
		.command("delete")
		.description("从历史记录中删除会话")
		.option("--session-id <id>", "要删除的会话 ID")
		.action(async () => {
			const opts = historyDeleteCmd.opts();
			if (!opts.sessionId) {
				writeErr("history delete 需要 --session-id <id>");
				ctx.exitCode = 1;
				return;
			}
			const outputMode =
				program.opts().json || historyCmd.opts().json
					? ("json" as const)
					: ("text" as const);
			const { runHistoryDelete } = await import("./commands/history");
			ctx.exitCode = await runHistoryDelete(opts.sessionId, outputMode, io);
		});

	const historyUpdateCmd = historyCmd
		.command("update")
		.description("更新历史记录中的会话")
		.option("--metadata <json>", "JSON 字符串形式的元数据")
		.option("--prompt <text>", "新的提示词文本")
		.option("--session-id <id>", "要更新的会话 ID")
		.option("--title <text>", "新标题")
		.action(async () => {
			const opts = historyUpdateCmd.opts();
			if (!opts.sessionId) {
				writeErr("history update 需要 --session-id <id>");
				ctx.exitCode = 1;
				return;
			}
			const outputMode =
				program.opts().json || historyCmd.opts().json
					? ("json" as const)
					: ("text" as const);
			const { runHistoryUpdate } = await import("./commands/history");
			ctx.exitCode = await runHistoryUpdate(
				opts.sessionId,
				opts.prompt,
				opts.title,
				opts.metadata,
				outputMode,
				io,
			);
		});

	const historyExportCmd = historyCmd
		.command("export <sessionId>")
		.description("将会话导出为独立 HTML 文件")
		.option("-o, --output <path>", "输出 HTML 文件路径")
		.action(async (sessionId: string) => {
			const opts = historyExportCmd.opts();
			const outputMode =
				program.opts().json || historyCmd.opts().json
					? ("json" as const)
					: ("text" as const);
			const { runHistoryExport } = await import("./commands/history");
			ctx.exitCode = await runHistoryExport(
				sessionId,
				opts.output,
				outputMode,
				io,
			);
		});

	program
		.command("hook")
		.description("处理来自 stdin 的 hook payload")
		.allowUnknownOption()
		.allowExcessArguments()
		.action(async () => {
			const { runHookCommand } = await import("./commands/hook");
			ctx.exitCode = await runHookCommand(io);
		});

	const createScheduleRuntimeCommand = async () => {
		const { createScheduleCommand } = await import("./commands/schedule");
		return createScheduleCommand(io, (code) => {
			ctx.exitCode = code;
		});
	};
	const createHubRuntimeCommand = async () => {
		const { createHubCommand } = await import("./commands/hub");
		return createHubCommand(io, (code) => {
			ctx.exitCode = code;
		});
	};

	program
		.command("schedule")
		.description("管理计划任务")
		.allowUnknownOption()
		.allowExcessArguments()
		.passThroughOptions()
		.addHelpText(
			"after",
			"\n可用子命令：\n  create    创建新的计划任务\n  list      列出计划任务\n  active    显示当前正在执行的计划任务\n  upcoming  显示即将运行的计划任务\n  trigger   立即触发计划任务\n  pause     暂停计划任务\n  resume    恢复计划任务\n  history   显示计划任务执行历史\n  stats     显示计划任务统计\n  get       按 ID 获取计划任务\n  update    更新计划任务\n  delete    删除计划任务\n  import    导入计划任务\n  export    导出计划任务\n",
		)
		.action(async (_opts: unknown, cmd: Command) => {
			if (
				cmd.args.length === 0 &&
				process.stdin.isTTY &&
				process.stdout.isTTY
			) {
				ctx.exitCode = await runScheduleWizard();
				return;
			}
			const scheduleCmd = await createScheduleRuntimeCommand();
			await scheduleCmd.parseAsync(cmd.args, { from: "user" });
		});
	program
		.command("hub")
		.description("管理本地 hub 守护进程")
		.allowUnknownOption()
		.allowExcessArguments()
		.passThroughOptions()
		.action(async (_opts: unknown, cmd: Command) => {
			const hubCmd = await createHubRuntimeCommand();
			await hubCmd.parseAsync(cmd.args, { from: "user" });
		});

	const updateCmd = program
		.command("update")
		.description("检查更新，有可用更新时安装")
		.allowUnknownOption()
		.allowExcessArguments()
		.option("-v, --verbose", "显示详细输出")
		.option("--config <dir>", "配置目录")
		.action(async () => {
			const { checkForUpdates } = await import("./commands/update");
			ctx.exitCode = await checkForUpdates({
				verbose: updateCmd.opts().verbose === true,
			});
		});

	program
		.command("version")
		.description("显示 nbg 版本号")
		.action(async () => {
			const { showVersion } = await import("./commands/help");
			showVersion();
			ctx.exitCode = 0;
		});

	program
		.command("kanban")
		.description("运行看板应用")
		.action(async () => {
			const { launchKanban } = await import("./commands/kanban");
			ctx.exitCode = await launchKanban({
				preferredInstaller: getPreferredKanbanInstaller(),
			});
		});

	try {
		await program.parseAsync(normalizedArgs, { from: "user" });
	} catch (err: unknown) {
		if (err instanceof CommanderError) {
			if (err.exitCode !== 0) {
				process.exitCode = err.exitCode;
				return;
			}
			return;
		}
		throw err;
	}

	if (ctx.exitCode !== undefined) {
		process.exitCode = ctx.exitCode;
		return;
	}

	const rootOpts = program.opts<{
		kanban?: boolean;
		tui?: boolean;
		update?: boolean;
		verbose?: boolean;
	}>();
	if (rootOpts.update) {
		if (rootOpts.kanban || rootOpts.tui || program.args.length > 0) {
			writeErr("使用 --update 时不要同时传入提示词或任务标志。");
			process.exitCode = 1;
			return;
		}
		const { checkForUpdates } = await import("./commands/update");
		process.exitCode = await checkForUpdates({
			verbose: rootOpts.verbose === true,
		});
		return;
	}
	if (rootOpts.kanban) {
		if (rootOpts.tui) {
			writeErr("--kanban 和 --tui 只能使用其中一个。");
			process.exitCode = 1;
			return;
		}
		if (program.args.length > 0) {
			writeErr("使用 --kanban 时不要传入提示词。");
			process.exitCode = 1;
			return;
		}
		const { launchKanban } = await import("./commands/kanban");
		process.exitCode = await launchKanban({
			preferredInstaller: getPreferredKanbanInstaller(),
		});
		return;
	}

	// Default flow: no subcommand matched, or fall-through from config/history.
	let args = commanderToParsedArgs(program);

	let resumeSessionId: string | undefined = ctx.resumeSessionId;
	if (resumeSessionId) {
		args = {
			...args,
			interactive: true,
			prompt: undefined,
		};
	}

	if (args.id !== undefined) {
		const sessionId = args.id.trim();
		if (!sessionId) {
			writeErr("--id 需要 <session-id>。");
			process.exitCode = 1;
			return;
		}
		resumeSessionId = sessionId;
		process.env.CLINE_HOOK_AGENT_RESUME = "1";
		args = {
			...args,
			interactive: true,
			prompt: undefined,
		};
	} else {
		delete process.env.CLINE_HOOK_AGENT_RESUME;
	}
	if (launchConfigView) {
		args = {
			...args,
			interactive: true,
			prompt: undefined,
		};
	}

	if (args.invalidThinkingLevel) {
		writeErr(
			`无效的推理强度 "${args.invalidThinkingLevel}"（应为 "none"、"low"、"medium"、"high" 或 "xhigh"）`,
		);
		process.exitCode = 1;
		return;
	}
	if (args.invalidCompactionMode) {
		writeErr(
			`无效的压缩模式 "${args.invalidCompactionMode}"（应为 ${CLI_COMPACTION_MODE_EXPECTED_TEXT}）`,
		);
		process.exitCode = 1;
		return;
	}
	if (args.invalidAutoApprove) {
		writeErr(
			`无效的 auto-approve 值 "${args.invalidAutoApprove}"（应为 "true" 或 "false"）`,
		);
		process.exitCode = 1;
		return;
	}
	if (args.invalidTimeoutSeconds) {
		writeErr(
			`无效的 timeout "${args.invalidTimeoutSeconds}"（应为 >= 1 的整数）`,
		);
		process.exitCode = 1;
		return;
	}
	if (args.invalidRetries) {
		writeln(
			`${c.dim}[警告] 忽略无效的 --retries 值 "${args.invalidRetries}"（应为 >= 1 的整数）${c.reset}`,
		);
	}
	if (args.hooksDir?.trim()) {
		process.env.CLINE_HOOKS_DIR = args.hooksDir.trim();
	}
	setCurrentOutputMode(args.outputMode);
	const defaultToolAutoApprove = true;
	const effectiveToolAutoApprove =
		args.autoApproveOverride ?? defaultToolAutoApprove;
	const toolPolicies: Record<string, ToolPolicy> = {
		"*": {
			autoApprove: effectiveToolAutoApprove,
		},
	};

	if (args.outputMode === "json" && (args.interactive || !args.prompt)) {
		writeErr(
			"JSON 输出模式需要提示词参数或管道 stdin（不支持交互模式）",
		);
		process.exitCode = 1;
		return;
	}

	// ACP mode: mutually exclusive with interactive/piped modes.
	// Enters the Agent Client Protocol stdio transport and never falls through.
	if (args.acpMode) {
		const { runAcpMode } = await import("./acp/index");
		await runAcpMode();
		return;
	}

	if (args.worktree) {
		if (
			!args.prompt &&
			!resumeSessionId &&
			!stdinHasPipedInput() &&
			(!process.stdin.isTTY || !process.stdout.isTTY)
		) {
			writeErr("未提供提示词时，--worktree 需要交互式终端。");
			process.exitCode = 1;
			return;
		}
		if (resumeSessionId) {
			const { getSessionRow } = await import("./session/session");
			const session = await getSessionRow(resumeSessionId);
			if (!session) {
				writeErr(`未找到会话：${resumeSessionId}`);
				process.exitCode = 1;
				return;
			}
		}
		const { createTaskWorktree } = await import("./utils/worktree");
		const sourceCwd = args.cwd ?? process.cwd();
		const result = await createTaskWorktree({ cwd: sourceCwd });
		if (!result.success || !result.path) {
			writeErr(`--worktree 失败：${result.message}`);
			process.exitCode = 1;
			return;
		}
		writeln(`已在 ${result.path} 创建 worktree`);
		args = {
			...args,
			cwd: result.path,
		};
	}

	const cwd = args.cwd ?? process.cwd();
	const workspaceRoot = resolveWorkspaceRoot(cwd);
	// Sandbox mode is enabled implicitly whenever --data-dir is provided, or
	// when CLINE_SANDBOX=1 is set in the environment (in which case the data
	// dir falls back to $CLINE_SANDBOX_DATA_DIR or /tmp/cline-sandbox).
	const sandboxEnabled =
		!!args.dataDir || process.env.CLINE_SANDBOX?.trim() === "1";
	const sandboxDataDir = configureSandboxEnvironment({
		enabled: sandboxEnabled,
		cwd,
		explicitDir: args.dataDir,
	});

	// Keep command-style subcommands on a narrow path. Runtime-only imports pull
	// in provider resolution, config services, and session startup wiring that
	// should only load when the CLI is actually starting an agent session.
	const providerSettingsManager = await createProviderSettingsManager();
	const {
		coreServer,
		coreServer: { createUserInstructionConfigService },
		resolveSystemPrompt,
		runAgent,
	} = await loadCliRuntimeModules();

	const userInstructionService = createUserInstructionConfigService({
		skills: { directories: [] },
		rules: { workspacePath: workspaceRoot },
		workflows: { workspacePath: workspaceRoot },
	});
	await userInstructionService.start().catch(() => {});
	let userInstructionServiceDisposed = false;
	const stopUserInstructionService = () => {
		if (userInstructionServiceDisposed) {
			return;
		}
		userInstructionServiceDisposed = true;
		userInstructionService.stop();
	};
	registerDisposable(stopUserInstructionService);
	try {
			const explicitProvider = args.provider?.trim();
			const provider = explicitProvider
				? normalizeProviderId(explicitProvider)
				: THIRD_PARTY_PROVIDER_ID;
			let selectedProviderSettings =
				providerSettingsManager.getProviderSettings(provider);
		const persistedApiKey = getPersistedProviderApiKey(
			provider,
			selectedProviderSettings,
		);
		const providedApiKey = args.key?.trim() || undefined;
		let apiKey = providedApiKey || persistedApiKey || undefined;

		const isYoloMode = args.mode === "yolo";
		const isZenMode = args.mode === "zen";

		// In headless mode (yolo / json / piped stdin without --tui),
		// don't attempt browser-based OAuth. Authentication may still resolve at
		// runtime from environment-based provider auth or persisted OAuth tokens.
		const isHeadless =
			isYoloMode ||
			isZenMode ||
			args.outputMode === "json" ||
			(!process.stdin.isTTY && !args.interactive);
		const isInteractive = (args.interactive || !args.prompt) && !isHeadless;

		if (!apiKey && isOAuthProvider(provider) && !isHeadless && !isInteractive) {
			const oauthResult = await ensureOAuthProviderApiKey({
				providerId: provider,
				currentApiKey: apiKey,
				existingSettings: selectedProviderSettings,
				providerSettingsManager,
				io: { writeln, writeErr },
			});
			selectedProviderSettings =
				oauthResult?.selectedProviderSettings ?? selectedProviderSettings;
			apiKey = oauthResult?.apiKey ?? apiKey;
		}

		let knownModels: Config["knownModels"];
		try {
			const persistedProviderConfig = providerSettingsManager.getProviderConfig(
				provider,
				{
					includeKnownModels: false,
				},
			);
			const catalogOptions = isInteractive
				? {
						loadLatestOnInit: true,
						loadPrivateOnAuth: true,
						failOnError: false,
					}
				: undefined;
			const resolvedProviderConfig = await coreServer.resolveProviderConfig(
				provider,
				catalogOptions,
				persistedProviderConfig,
			);
			knownModels = resolvedProviderConfig?.knownModels;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			writeln(
				`${c.dim}[model-catalog] 模型目录解析失败（${message}）${c.reset}`,
			);
		}
		const knownModelIds = knownModels ? Object.keys(knownModels) : [];
		const persistedReasoning = selectedProviderSettings?.reasoning;
		const persistedReasoningEffort = persistedReasoning?.effort;
		const reasoningEffortFromSettings =
			persistedReasoning?.enabled === false
				? "none"
				: persistedReasoningEffort && persistedReasoningEffort !== "none"
					? persistedReasoningEffort
					: persistedReasoning?.enabled === true
						? "medium"
						: "none";
		const effectiveReasoningEffort = args.thinkingExplicitlySet
			? (args.reasoningEffort ?? "none")
			: (args.reasoningEffort ?? reasoningEffortFromSettings);
		const { createCliLoggerAdapter } = await import("./logging/adapter");
		const loggerAdapter = createCliLoggerAdapter({
			runtime: "cli",
			component: "main",
		});
		loggerAdapter.core.log("CLI run started", {
			interactive: args.interactive === true,
			hasPrompt: !!args.prompt?.trim(),
			cwd,
		});

		const modelId =
			args.model ??
			selectedProviderSettings?.model ??
			knownModelIds[0] ??
			(provider === THIRD_PARTY_PROVIDER_ID
				? "gpt-4o"
				: "anthropic/claude-sonnet-4.6");

		const config: Config = {
			providerId: provider,
			modelId,
			apiKey: apiKey ?? "",
			knownModels,
			systemPrompt: await resolveSystemPrompt({
				cwd,
				explicitSystemPrompt: args.systemPrompt,
				providerId: provider,
				modelId,
				mode: args.mode ?? "act",
			}),
			execution: {
				maxConsecutiveMistakes: args.retries ?? 3,
			},
			checkpoint: CLI_DEFAULT_CHECKPOINT_CONFIG,
			compaction: buildCliCompactionConfig(args.compactionMode),
			timeoutSeconds: args.timeoutSeconds,
			sandbox: sandboxEnabled,
			sandboxDataDir,
			verbose: args.verbose,
			thinking: effectiveReasoningEffort !== "none",
			reasoningEffort:
				effectiveReasoningEffort === "none"
					? undefined
					: effectiveReasoningEffort,
			outputMode: args.outputMode,
			mode: args.mode,
			logger: loggerAdapter.core,
			loggerConfig: loggerAdapter.runtimeConfig,
			telemetry: getCliTelemetryService(loggerAdapter.core),
			defaultToolAutoApprove,
			toolPolicies,
			enableSpawnAgent: !isYoloMode,
			enableAgentTeams: !isYoloMode,
			enableTools: true,
			cwd,
			workspaceRoot,
			extensionContext: {
				client: { name: "cline-cli" },
				workspace: {
					rootPath: workspaceRoot,
					cwd,
					workspaceName: basename(cwd),
					ide: "Terminal Shell",
					platform: process.platform,
				},
				logger: loggerAdapter.core,
			},
			teamName: !isYoloMode ? args.teamName?.trim() || undefined : undefined,
		};
		try {
			// For OAuth providers, don't write the resolved key into apiKey;
			// the token lives in auth.accessToken and apiKey is reserved for
			// migrated/manual keys.
			const persistApiKey =
				// Persist explicit `-k/--key` even for OAuth-capable providers.
				providedApiKey
					? { apiKey: providedApiKey }
					: apiKey && !isOAuthProvider(provider)
						? { apiKey }
						: {};
			providerSettingsManager.saveProviderSettings({
				...(selectedProviderSettings ?? {}),
				provider,
				model: config.modelId,
				...persistApiKey,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			writeln(
				`${c.dim}[provider-settings] 保存选择失败（${message}）${c.reset}`,
			);
		}
		// Check for piped input (skip when stdin is not a real pipe/file, e.g. headless CI).
		// Guard `isTTY` first so we never block on fd 0 when stdin is a terminal (and avoid
		// redundant fstat work). `stdinHasPipedInput` also checks `isTTY`, but callers may hit
		// inconsistent state in tests or embedded hosts.
		if (!process.stdin.isTTY && stdinHasPipedInput() && !args.interactive) {
			const chunks: Buffer[] = [];
			for await (const chunk of process.stdin) {
				chunks.push(chunk as Buffer);
			}
			const pipedInput = Buffer.concat(chunks).toString("utf-8").trim();

			if (pipedInput) {
				const prompt = args.prompt
					? `${args.prompt}\n\n${pipedInput}`
					: pipedInput;
				const rewrittenTeamPrompt = rewriteTeamPrompt(prompt);
				if (rewrittenTeamPrompt.kind === "usage") {
					writeln(TEAM_COMMAND_USAGE);
					return;
				}
				const pipedEffectivePrompt =
					rewrittenTeamPrompt.kind === "rewritten"
						? rewrittenTeamPrompt.prompt
						: prompt;
				if (isZenMode) {
					const { runZen } = await import("./runtime/run-zen");
					await runZen(pipedEffectivePrompt, config, userInstructionService);
					return;
				}
				await runAgent(pipedEffectivePrompt, config, userInstructionService);
				return;
			}
		}

		// Interactive mode: zen is incompatible because there is no terminal UI
		// to surface results and nothing waits for the background task.
		if (args.interactive || !args.prompt) {
			if (isZenMode) {
				writeErr(
					args.interactive
						? "--zen 不兼容交互模式。"
						: "--zen 需要提示词。",
				);
				process.exitCode = 1;
				return;
			}
			const runInteractive = await loadInteractiveRuntimeModule();
			let initialView: "chat" | "config" | undefined;
			if (launchConfigView) {
				initialView = "config";
			} else if (resumeSessionId) {
				initialView = "chat";
			}
			const initialClineProviderSettings =
				provider === "cline" ? selectedProviderSettings : undefined;
			let initialNotice:
				| import("./kanban-migration/notice").CliMigrationNotice
				| undefined;
			let markInitialNoticeShown:
				| ((
						notice: import("./kanban-migration/notice").CliMigrationNotice,
				  ) => void)
				| undefined;
			if (!launchConfigView && process.stdin.isTTY && process.stdout.isTTY) {
				const { getClineCliMigrationNotice, markClineCliMigrationNoticeShown } =
					await import("./kanban-migration/notice");
				initialNotice = getClineCliMigrationNotice();
				if (initialNotice) {
					markInitialNoticeShown = () => {
						markClineCliMigrationNoticeShown();
					};
				}
			}
			await runInteractive(config, userInstructionService, resumeSessionId, {
				initialPrompt: args.prompt,
				clineApiBaseUrl: initialClineProviderSettings?.baseUrl,
				clineProviderSettings: initialClineProviderSettings,
				initialView,
				initialNotice,
				onInitialNoticeShown: markInitialNoticeShown,
			});
			return;
		}

		// Single prompt mode
		const rewrittenTeamPrompt = rewriteTeamPrompt(args.prompt);
		if (rewrittenTeamPrompt.kind === "usage") {
			writeln(TEAM_COMMAND_USAGE);
			return;
		}
		const effectivePrompt =
			rewrittenTeamPrompt.kind === "rewritten"
				? rewrittenTeamPrompt.prompt
				: args.prompt;

		// Zen mode: dispatch the task to the background hub and exit. The CLI
		// does not stay connected to stream output; completion is delivered via
		// the hub's existing ui.notify broadcast (picked up by the menubar app
		// when installed).
		if (isZenMode) {
			const { runZen } = await import("./runtime/run-zen");
			await runZen(effectivePrompt, config, userInstructionService);
			return;
		}

		await runAgent(effectivePrompt, config, userInstructionService);
		// Exit once agent is done in non-interactive mode
		return;
	} finally {
		stopUserInstructionService();
	}
}
