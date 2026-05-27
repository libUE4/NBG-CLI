import { useTerminalDimensions } from "@opentui/react";
import type { ChoiceContext } from "@opentui-ui/dialog";
import { useDialog } from "@opentui-ui/dialog/react";
import { useCallback } from "react";
import type { SlashCommandRegistry } from "../commands/slash-command-registry";
import { resolveSlashCommand } from "../commands/slash-command-registry";
import { ForkConfirmContent } from "../components/dialogs/fork-confirm";
import { HelpDialogContent } from "../components/dialogs/help-dialog";
import { withLoadingDialog } from "../components/dialogs/loading-dialog";
import { useSession } from "../contexts/session-context";
import type { AppView, TuiProps } from "../types";
import { formatCompactionStatus } from "../utils/compaction-status";
import { hydrateSessionMessages } from "../utils/hydrate-messages";
import { HistoryDialogContent } from "../views/history-view";
import { runLocalSlashCommandAction } from "./local-command-actions";

export function useLocalCommandActions(input: {
	slashCommandRegistry: SlashCommandRegistry;
	canForkSession: boolean;
	openConfig: () => void;
	openMcpManager: () => Promise<boolean>;
	openModelSelector: () => void;
	refocusTextarea: () => void;
	setAppView: (view: AppView) => void;
	onClearConversation: () => Promise<void>;
	onResumeSession: TuiProps["onResumeSession"];
	onCompact: TuiProps["onCompact"];
	onFork: TuiProps["onFork"];
	onUndo: () => Promise<void>;
	onExit: TuiProps["onExit"];
}) {
	const dialog = useDialog();
	const session = useSession();
	const { height: termHeight } = useTerminalDimensions();
	const {
		slashCommandRegistry,
		canForkSession,
		openConfig,
		openMcpManager,
		openModelSelector,
		refocusTextarea,
		setAppView,
		onClearConversation,
		onResumeSession,
		onCompact,
		onFork,
		onUndo,
		onExit,
	} = input;

	const openHistory = useCallback(async () => {
		const sessionId = await dialog.choice<string>({
			size: "large",
			style: { maxHeight: termHeight - 2 },
			content: (ctx: ChoiceContext<string>) => (
				<HistoryDialogContent {...ctx} />
			),
		});
		if (sessionId) {
			try {
				await withLoadingDialog(dialog, "正在加载会话...", async () => {
					const result = await onResumeSession(sessionId);
					const { messages } = result;
					const entries = hydrateSessionMessages(messages);
					if (entries.length === 0) {
						session.appendEntry({
							kind: "error",
							text: `会话 ${sessionId} 没有可恢复的消息。`,
						});
					} else {
						session.clearEntries();
						for (const entry of entries) {
							session.appendEntry(entry);
						}
						if (typeof result.currentContextSize === "number") {
							session.setLastTotalTokens(result.currentContextSize);
						}
						if (typeof result.totalCost === "number") {
							session.setLastTotalCost(result.totalCost);
						}
						session.setHasSubmitted(true);
						setAppView("chat");
					}
				});
			} catch (error) {
				session.appendEntry({
					kind: "error",
					text: `恢复会话失败：${error instanceof Error ? error.message : String(error)}`,
				});
			}
		}
		refocusTextarea();
	}, [
		dialog,
		onResumeSession,
		refocusTextarea,
		session,
		setAppView,
		termHeight,
	]);

	const openHelp = useCallback(async () => {
		await dialog.choice<void>({
			size: "large",
			style: { maxHeight: termHeight - 2 },
			content: (ctx: ChoiceContext<void>) => <HelpDialogContent {...ctx} />,
		});
		refocusTextarea();
	}, [dialog, refocusTextarea, termHeight]);

	const runCompact = useCallback(async () => {
		session.appendEntry({
			kind: "status",
			text: "正在压缩上下文...",
		});
		try {
			const result = await onCompact();
			session.updateLastEntry(() => ({
				kind: "status",
				text: formatCompactionStatus(result),
			}));
		} catch (error) {
			session.appendEntry({
				kind: "error",
				text: `压缩失败：${error instanceof Error ? error.message : String(error)}`,
			});
		}
	}, [onCompact, session]);

	const runFork = useCallback(async () => {
		if (!canForkSession) {
			session.appendEntry({
				kind: "status",
				text: "当前会话产生消息后才能分叉。",
			});
			return;
		}
		const confirmed = await dialog.choice<boolean>({
			closeOnEscape: true,
			content: (ctx: ChoiceContext<boolean>) => <ForkConfirmContent {...ctx} />,
		});
		refocusTextarea();
		if (!confirmed) return;
		session.appendEntry({
			kind: "status",
			text: "正在创建分叉会话...",
		});
		try {
			const result = await onFork();
			if (result) {
				session.updateLastEntry(() => ({
					kind: "status",
					text: `已分叉到新会话 ${result.newSessionId}。它现在是活动会话。使用 /history 可切换会话。`,
				}));
			} else {
				session.updateLastEntry(() => ({
					kind: "error",
					text: "分叉失败：无法读取当前会话的消息。",
				}));
			}
		} catch (error) {
			session.updateLastEntry(() => ({
				kind: "error",
				text: `分叉失败：${error instanceof Error ? error.message : String(error)}`,
			}));
		}
	}, [canForkSession, dialog, onFork, refocusTextarea, session]);

	const handleSlashCommand = useCallback(
		(command: string) => {
			const resolved = resolveSlashCommand(slashCommandRegistry, command);
			if (!resolved || resolved.execution !== "local") {
				return false;
			}
			return runLocalSlashCommandAction({
				name: resolved.name,
				openConfig,
				openMcpManager,
				openModelSelector,
				runCompact,
				runFork,
				runUndo: onUndo,
				clearConversation: onClearConversation,
				openHelp,
				openHistory,
				exitCline: onExit,
			});
		},
		[
			onClearConversation,
			onExit,
			onUndo,
			openConfig,
			openMcpManager,
			openHelp,
			openHistory,
			openModelSelector,
			runCompact,
			runFork,
			slashCommandRegistry,
		],
	);

	return { handleSlashCommand };
}
