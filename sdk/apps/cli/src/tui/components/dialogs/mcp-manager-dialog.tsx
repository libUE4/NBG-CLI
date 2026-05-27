import {
	resolveDefaultMcpSettingsPath,
	setMcpServerDisabled,
} from "@cline/core";
import type { ChoiceContext } from "@opentui-ui/dialog";
import { useDialogKeyboard } from "@opentui-ui/dialog/react";
import { useState } from "react";
import {
	isNextNavigationKey,
	isPreviousNavigationKey,
	navigationHint,
} from "../../hooks/navigation-keys";
import { palette } from "../../palette";

export interface McpEntry {
	name: string;
	path: string;
	enabled?: boolean;
}

export type McpServerToggleResult =
	| { ok: true; server: McpEntry }
	| { ok: false; message: string };

function stringifyError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function getMcpManagerFooterText(hasServers: boolean): string {
	return hasServers
		? `${navigationHint()}，Space 切换所选项，Esc 返回`
		: "Esc 返回";
}

export function toggleMcpServer(server: McpEntry): McpServerToggleResult {
	try {
		const currentlyEnabled = server.enabled !== false;
		setMcpServerDisabled({
			filePath: server.path,
			name: server.name,
			disabled: currentlyEnabled,
		});
		return {
			ok: true,
			server: {
				...server,
				enabled: !currentlyEnabled,
			},
		};
	} catch (error) {
		return {
			ok: false,
			message: `无法切换 MCP 服务器 "${server.name}"：${stringifyError(error)}`,
		};
	}
}

export function McpManagerContent(
	props: ChoiceContext<boolean> & {
		servers: McpEntry[];
	},
) {
	const [selected, setSelected] = useState(0);
	const [servers, setServers] = useState(props.servers);
	const [changed, setChanged] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const settingsPath = servers[0]?.path ?? resolveDefaultMcpSettingsPath();
	const itemCount = servers.length;

	useDialogKeyboard((key) => {
		if (key.name === "escape") {
			if (changed) {
				props.resolve(true);
			} else {
				props.dismiss();
			}
			return;
		}
		if (itemCount > 0) {
			if (isPreviousNavigationKey(key)) {
				setError(null);
				setSelected((s) => (s > 0 ? s - 1 : itemCount - 1));
				return;
			}
			if (isNextNavigationKey(key)) {
				setError(null);
				setSelected((s) => (s < itemCount - 1 ? s + 1 : 0));
				return;
			}
			if (key.name === "space") {
				const target = servers[selected];
				const result = target ? toggleMcpServer(target) : undefined;
				if (result?.ok) {
					setServers((current) =>
						current.map((server, index) =>
							index === selected ? result.server : server,
						),
					);
					setChanged(true);
					setError(null);
				} else if (result) {
					setError(result.message);
				}
				return;
			}
		}
	}, props.dialogId);

	return (
		<box flexDirection="column" paddingX={1}>
			<text fg="cyan">MCP 服务器</text>

			<text fg="gray" marginTop={1}>
				设置文件：
			</text>
			<text selectable>{settingsPath}</text>

			<text fg="gray" marginTop={1}>
				运行 nbg mcp 可添加、编辑或移除服务器。
			</text>

			{servers.length > 0 && (
				<box flexDirection="column" marginTop={1}>
					{servers.map((srv, i) => {
						const isSel = i === selected;
						const enabled =
							typeof srv.enabled === "boolean" ? srv.enabled : true;
						const enabledIcon =
							typeof srv.enabled === "boolean" ? (enabled ? "● " : "○ ") : "";
						const rowColor =
							enabled && typeof srv.enabled === "boolean"
								? palette.success
								: isSel
									? "cyan"
									: "gray";
						return (
							<box key={srv.name} flexDirection="row">
								<text fg={rowColor}>
									{isSel ? "\u25b8 " : "  "}
									{enabledIcon}
									{srv.name}
								</text>
							</box>
						);
					})}
				</box>
			)}

			{servers.length === 0 && (
				<text fg="gray" marginTop={1}>
					尚未配置服务器。
				</text>
			)}

			{error && (
				<text fg={palette.error} marginTop={1}>
					{error}
				</text>
			)}

			<text fg="gray" marginTop={1}>
				<em>{getMcpManagerFooterText(servers.length > 0)}</em>
			</text>
		</box>
	);
}
