import {
	clearHubDiscovery,
	ensureDetachedHubServer,
	probeHubServer,
	readHubDiscovery,
	resolveSharedHubOwnerContext,
	stopLocalHubServerGracefully,
} from "@cline/core";
import { formatUptime } from "@cline/shared";
import { Command } from "commander";
import { localizeCommander } from "../utils/commander-locale";

interface HubCommandIo {
	writeln: (text?: string) => void;
	writeErr: (text: string) => void;
}

async function stopHubServer(_workspaceRoot: string): Promise<boolean> {
	const owner = resolveSharedHubOwnerContext();
	const discovery = await readHubDiscovery(owner.discoveryPath);
	if (await stopLocalHubServerGracefully()) {
		await clearHubDiscovery(owner.discoveryPath);
		return true;
	}
	const pid = discovery?.pid;
	if (pid) {
		try {
			process.kill(pid, "SIGTERM");
		} catch {
			// best effort
		}
	}
	await clearHubDiscovery(owner.discoveryPath);
	return !!pid;
}

function formatHubUptimeFromStartedAt(
	startedAt: string | undefined,
): string | undefined {
	if (!startedAt) {
		return undefined;
	}
	const timestamp = Date.parse(startedAt);
	if (Number.isNaN(timestamp)) {
		return undefined;
	}
	return formatUptime(Date.now() - timestamp);
}

export function createHubCommand(
	io: HubCommandIo,
	setExitCode: (code: number) => void,
): Command {
	let actionExitCode = 0;
	const fail = () => {
		actionExitCode = 1;
	};
	const action =
		<T extends unknown[]>(fn: (...args: T) => Promise<void>) =>
		async (...args: T) => {
			try {
				await fn(...args);
			} catch (error) {
				io.writeErr(error instanceof Error ? error.message : String(error));
				fail();
			}
		};

	const hub = localizeCommander(new Command("hub"))
		.description("管理本地 hub 守护进程")
		.exitOverride()
		.hook("postAction", () => {
			setExitCode(actionExitCode);
		})
		.option("--cwd <path>", "工作区根路径", process.cwd())
		.option("--host <host>", "Hub 主机")
		.option("--port <port>", "Hub 端口", (value) => Number.parseInt(value, 10))
		.option("--pathname <path>", "Hub WebSocket 路径");

	hub.command("ensure")
		.description("确保 hub 守护进程正在运行")
		.action(
			action(async () => {
				const opts = hub.opts<{
					cwd: string;
					host?: string;
					port?: number;
					pathname?: string;
				}>();
				const { url } = await ensureDetachedHubServer(opts.cwd, {
					host: opts.host,
					port: opts.port,
					pathname: opts.pathname,
				});
				io.writeln(url);
			}),
		);

	hub.command("start")
		.description("启动 hub 守护进程")
		.action(
			action(async () => {
				const opts = hub.opts<{
					cwd: string;
					host?: string;
					port?: number;
					pathname?: string;
				}>();
				const { url } = await ensureDetachedHubServer(opts.cwd, {
					host: opts.host,
					port: opts.port,
					pathname: opts.pathname,
				});
				io.writeln(url);
			}),
		);

	hub.command("status")
		.description("显示 hub 守护进程状态")
		.action(
			action(async () => {
				const owner = resolveSharedHubOwnerContext();
				const discovery = await readHubDiscovery(owner.discoveryPath);
				const health = discovery?.url
					? await probeHubServer(discovery.url)
					: undefined;
				const uptime = formatHubUptimeFromStartedAt(health?.startedAt);
				io.writeln(
					JSON.stringify({
						running: !!health?.url,
						url: health?.url,
						pid: health?.pid,
						startedAt: health?.startedAt,
						uptime,
					}),
				);
			}),
		);

	hub.command("stop")
		.description("停止 hub 守护进程")
		.action(
			action(async () => {
				const opts = hub.opts<{ cwd: string }>();
				const stopped = await stopHubServer(opts.cwd);
				io.writeln(JSON.stringify({ stopped }));
			}),
		);

	return hub;
}
