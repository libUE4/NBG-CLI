// @jsxImportSource @opentui/react

import type { SessionHistoryRecord } from "@cline/core";
import {
	formatDisplayUserInput,
	formatHumanReadableDate,
	truncateStr,
} from "@cline/shared";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { ChoiceContext } from "@opentui-ui/dialog";
import { useDialogKeyboard } from "@opentui-ui/dialog/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listSessions } from "../../session/session";
import { mergeHistoryStatusRows } from "../../utils/history-format";
import { formatUsd } from "../../utils/output";
import { shouldShowCliUsageCost } from "../../utils/usage-cost-display";
import {
	isNextNavigationKey,
	isPreviousNavigationKey,
	navigationHint,
} from "../hooks/navigation-keys";
import { palette } from "../palette";

function hasForkMetadata(row: SessionHistoryRecord): boolean {
	const fork = row.metadata?.fork;
	return typeof fork === "object" && fork !== null && !Array.isArray(fork);
}

function formatTitle(row: SessionHistoryRecord, maxLen: number): string {
	const raw = row.metadata?.title?.trim() || row.prompt?.trim() || "未命名";
	const forkTitle =
		hasForkMetadata(row) && !raw.endsWith(" (fork)") ? `${raw} (fork)` : raw;
	const normalized = formatDisplayUserInput(forkTitle);
	return truncateStr(normalized.replace(/\s+/g, " "), maxLen);
}

function formatRelativeDate(dateStr: string): string {
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return dateStr;
	const now = Date.now();
	const diffMs = now - date.getTime();
	const diffMins = Math.floor(diffMs / 60_000);
	if (diffMins < 1) return "刚刚";
	if (diffMins < 60) return `${diffMins} 分钟前`;
	const diffHours = Math.floor(diffMins / 60);
	if (diffHours < 24) return `${diffHours} 小时前`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays} 天前`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
	return formatHumanReadableDate(dateStr);
}

const MAX_VISIBLE = 12;
const DEFAULT_REFRESH_INTERVAL_MS = 2000;

type HistoryListActions = {
	onResolve: (sessionId: string) => void;
	onDismiss: () => void;
	onExport?: (sessionId: string) => Promise<string | undefined>;
	onDelete?: (sessionId: string) => Promise<boolean>;
};

type HistoryKeyEvent = {
	name?: string;
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
};

type HistoryListContentProps = HistoryListActions & {
	initialRows?: SessionHistoryRecord[];
	emptyMessage?: string;
	footerText?: string;
	title?: string;
	loadRows?: boolean;
	refreshRows?: () => Promise<SessionHistoryRecord[]>;
	refreshIntervalMs?: number;
	registerKeyHandler?: (
		handler: (key: HistoryKeyEvent | undefined) => void,
	) => void;
};

function HistoryListContent({
	initialRows,
	onResolve,
	onDismiss,
	onExport,
	onDelete,
	emptyMessage = "未找到会话",
	footerText = `${navigationHint()}，Enter 恢复，Esc 关闭`,
	title = "会话历史",
	loadRows = false,
	refreshRows,
	refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
	registerKeyHandler,
}: HistoryListContentProps) {
	const { width } = useTerminalDimensions();
	const [rows, setRows] = useState<SessionHistoryRecord[]>(
		() => initialRows ?? [],
	);
	const [selected, setSelected] = useState(0);
	const [loading, setLoading] = useState(loadRows);
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const handlerRef = useRef<(key: HistoryKeyEvent | undefined) => void>(
		() => {},
	);

	useEffect(() => {
		const loadInitialRows = () => listSessions(50, { hydrate: true });
		const loadRefreshRows =
			refreshRows ?? (() => listSessions(50, { hydrate: false }));
		let disposed = false;
		let refreshInFlight = false;
		let interval: ReturnType<typeof setInterval> | undefined;

		const refresh = async (
			showLoading: boolean,
			load: () => Promise<SessionHistoryRecord[]>,
		) => {
			if (refreshInFlight) {
				return;
			}
			refreshInFlight = true;
			if (showLoading) {
				setLoading(true);
			}
			try {
				const refreshedRows = await load();
				if (disposed) {
					return;
				}
				setRows((currentRows) =>
					currentRows.length === 0
						? refreshedRows
						: mergeHistoryStatusRows(currentRows, refreshedRows),
				);
				setSelected((currentSelected) =>
					Math.min(currentSelected, Math.max(0, refreshedRows.length - 1)),
				);
			} catch {
				// Keep the last visible history snapshot when a background refresh fails.
			} finally {
				refreshInFlight = false;
				if (!disposed && showLoading) {
					setLoading(false);
				}
			}
		};

		if (!loadRows && !refreshRows) {
			setRows(initialRows ?? []);
			setLoading(false);
			return;
		}

		if (loadRows) {
			void refresh(true, loadInitialRows);
		} else {
			setRows(initialRows ?? []);
			setLoading(false);
		}

		if (refreshIntervalMs > 0) {
			interval = setInterval(() => {
				void refresh(false, loadRefreshRows);
			}, refreshIntervalMs);
		}

		return () => {
			disposed = true;
			if (interval) {
				clearInterval(interval);
			}
		};
	}, [initialRows, loadRows, refreshIntervalMs, refreshRows]);

	const safeSelected = Math.min(selected, Math.max(0, rows.length - 1));
	const titleMaxLen = Math.max(20, width - 44);

	const rowsRef = useRef(rows);
	rowsRef.current = rows;
	const selectedRef = useRef(safeSelected);
	selectedRef.current = safeSelected;

	const window = useMemo(() => {
		if (rows.length <= MAX_VISIBLE) {
			return { items: rows, startIndex: 0 };
		}
		const half = Math.floor(MAX_VISIBLE / 2);
		let start = Math.max(0, safeSelected - half);
		const end = Math.min(rows.length, start + MAX_VISIBLE);
		if (end - start < MAX_VISIBLE) start = Math.max(0, end - MAX_VISIBLE);
		return { items: rows.slice(start, end), startIndex: start };
	}, [rows, safeSelected]);

	handlerRef.current = (key: HistoryKeyEvent | undefined) => {
		if (!key) {
			return;
		}
		if (key.ctrl && key.name === "c") {
			onDismiss();
			return;
		}
		if (confirmDelete) {
			if (key.name === "y" || (key.shift && key.name === "y")) {
				const sessionId = confirmDelete;
				setConfirmDelete(null);
				setStatusMessage(`正在删除 ${sessionId}...`);
				void onDelete?.(sessionId)
					.then((deleted) => {
						if (!deleted) {
							setStatusMessage(`未找到会话 ${sessionId}`);
							return;
						}
						setRows((currentRows) => {
							const nextRows = currentRows.filter(
								(row) => row.sessionId !== sessionId,
							);
							setSelected((currentSelected) =>
								Math.min(currentSelected, Math.max(0, nextRows.length - 1)),
							);
							return nextRows;
						});
						setStatusMessage(`已删除 ${sessionId}`);
					})
					.catch((error) => {
						setStatusMessage(
							error instanceof Error ? error.message : String(error),
						);
					});
			} else {
				setConfirmDelete(null);
			}
			return;
		}

		if (key.name === "escape") {
			onDismiss();
			return;
		}
		if (key.name === "return" || key.name === "enter") {
			const currentRows = rowsRef.current;
			const row = currentRows[selectedRef.current];
			if (row) onResolve(row.sessionId);
			return;
		}
		if (isPreviousNavigationKey(key)) {
			setStatusMessage(null);
			setSelected((s) => {
				const len = rowsRef.current.length;
				return s <= 0 ? len - 1 : s - 1;
			});
			return;
		}
		if (isNextNavigationKey(key)) {
			setStatusMessage(null);
			setSelected((s) => {
				const len = rowsRef.current.length;
				return s >= len - 1 ? 0 : s + 1;
			});
			return;
		}
		if (key.name === "left") {
			const row = rowsRef.current[selectedRef.current];
			if (row?.sessionId && onDelete) {
				setConfirmDelete(row.sessionId);
			}
			return;
		}
		if (key.name === "right") {
			const row = rowsRef.current[selectedRef.current];
			if (row?.sessionId && onExport) {
				setStatusMessage(`正在导出 ${row.sessionId}...`);
				void onExport(row.sessionId)
					.then((path) => {
						setStatusMessage(
							path
								? `已导出 ${row.sessionId} 到 ${path}`
								: `已导出 ${row.sessionId}`,
						);
					})
					.catch((error) => {
						setStatusMessage(
							error instanceof Error ? error.message : String(error),
						);
					});
			}
		}
	};

	useEffect(() => {
		registerKeyHandler?.((key) => handlerRef.current(key));
	}, [registerKeyHandler]);

	if (loading) {
		return (
			<box flexDirection="column" paddingX={1}>
				<text fg="gray">正在加载会话历史...</text>
			</box>
		);
	}

	if (rows.length === 0) {
		return (
			<box flexDirection="column" paddingX={1} gap={1}>
				<text>{title}</text>
				<text fg="gray">{emptyMessage}</text>
				<text fg="gray">
					<em>按 Esc 关闭</em>
				</text>
			</box>
		);
	}

	const aboveCount = window.startIndex;
	const belowCount = rows.length - window.startIndex - window.items.length;

	return (
		<box flexDirection="column" paddingX={1}>
			<text fg={confirmDelete ? "red" : undefined}>
				{confirmDelete ? "删除此会话？(y/n)" : title}
			</text>

			<box flexDirection="column" marginTop={1}>
				{aboveCount > 0 && (
					<text fg="gray">
						{"\u25b2 "}
						还有 {aboveCount} 条
					</text>
				)}

				{window.items.map((row, i) => {
					const absIdx = window.startIndex + i;
					const isSel = absIdx === safeSelected;
					const cost = row.metadata?.totalCost;
					const showCost = shouldShowCliUsageCost(row.provider);
					const title = formatTitle(row, titleMaxLen);
					const date = formatRelativeDate(row.startedAt);

					return (
						<box
							key={row.sessionId}
							flexDirection="row"
							paddingX={1}
							backgroundColor={isSel ? palette.selection : undefined}
							onMouseDown={() => onResolve(row.sessionId)}
							overflow="hidden"
							height={1}
						>
							<text
								fg={isSel ? palette.textOnSelection : "gray"}
								flexShrink={0}
							>
								{isSel ? "\u276f " : "  "}
							</text>
							<text
								fg={isSel ? palette.textOnSelection : undefined}
								flexGrow={1}
							>
								{title}
							</text>
							{showCost && cost != null && cost > 0 && (
								<text
									fg={isSel ? palette.textOnSelection : "gray"}
									flexShrink={0}
								>
									{"  "}
									{formatUsd(cost, 2)}
								</text>
							)}
							<text
								fg={isSel ? palette.textOnSelection : "gray"}
								flexShrink={0}
							>
								{"  "}
								{date}
							</text>
						</box>
					);
				})}

				{belowCount > 0 && (
					<text fg="gray">
						{"\u25bc "}
						还有 {belowCount} 条
					</text>
				)}
			</box>

			{statusMessage && (
				<text
					fg={
						statusMessage.startsWith("已导出") ||
						statusMessage.startsWith("正在导出") ||
						statusMessage.startsWith("已删除") ||
						statusMessage.startsWith("正在删除")
							? palette.success
							: "red"
					}
					marginTop={1}
				>
					{statusMessage}
				</text>
			)}

			<text fg="gray" marginTop={1}>
				<em>{footerText}</em>
			</text>
		</box>
	);
}

export function HistoryDialogContent(props: ChoiceContext<string>) {
	const { resolve, dismiss, dialogId } = props;
	const [keyHandler, setKeyHandler] = useState<
		((key: HistoryKeyEvent | undefined) => void) | undefined
	>();
	const registerKeyHandler = useCallback(
		(handler: (key: HistoryKeyEvent | undefined) => void) => {
			setKeyHandler(() => handler);
		},
		[],
	);

	useDialogKeyboard((key) => keyHandler?.(key), dialogId);

	return (
		<HistoryListContent
			loadRows
			onResolve={resolve}
			onDismiss={dismiss}
			registerKeyHandler={registerKeyHandler}
		/>
	);
}

export function HistoryStandaloneContent(
	props: HistoryListActions & {
		rows: SessionHistoryRecord[];
		title?: string;
		footerText?: string;
		refreshRows?: () => Promise<SessionHistoryRecord[]>;
		refreshIntervalMs?: number;
	},
) {
	const [keyHandler, setKeyHandler] = useState<
		((key: HistoryKeyEvent | undefined) => void) | undefined
	>();
	const registerKeyHandler = useCallback(
		(handler: (key: HistoryKeyEvent | undefined) => void) => {
			setKeyHandler(() => handler);
		},
		[],
	);

	useKeyboard((key) => keyHandler?.(key));

	return (
		<HistoryListContent
			initialRows={props.rows}
			onResolve={props.onResolve}
			onDismiss={props.onDismiss}
			onExport={props.onExport}
			onDelete={props.onDelete}
			refreshRows={props.refreshRows}
			refreshIntervalMs={props.refreshIntervalMs}
			title={props.title ?? "历史"}
			footerText={
				props.footerText ??
				"\u2191/\u2193 导航，Enter 恢复，\u2190 删除，\u2192 导出，Esc 关闭"
			}
			registerKeyHandler={registerKeyHandler}
		/>
	);
}
