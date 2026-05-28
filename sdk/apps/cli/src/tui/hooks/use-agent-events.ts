import type { AgentEvent, TeamEvent } from "@cline/core";
import { useCallback, useRef } from "react";
import type {
	PendingPromptSnapshot,
	PendingPromptSubmittedEvent,
} from "../../runtime/session-events";
import { resolveStatusNoticeLabel } from "../../utils/events";
import {
	formatToolInput,
	formatToolOutput,
	truncate,
} from "../../utils/helpers";
import type { ChatEntry, ChatEntryId, InlineStream, TuiProps } from "../types";

interface AgentEventDeps {
	appendEntry: (entry: ChatEntry) => ChatEntryId;
	updateLastEntry: (updater: (prev: ChatEntry) => ChatEntry) => void;
	updateEntry: (updater: (entry: ChatEntry) => ChatEntry) => void;
	updateEntryById: (
		entryId: ChatEntryId,
		updater: (entry: ChatEntry) => ChatEntry,
	) => void;
	closeEntryStream: (entryId: ChatEntryId) => void;
	closeAllStreamingEntries: () => void;
	closeInlineStream: () => void;
	activeInlineStreamRef: React.MutableRefObject<InlineStream>;
	setIsRunning: (v: boolean) => void;
	setIsStreaming: (v: boolean) => void;
	addUsageDelta: (usage: {
		inputTokens?: number;
		outputTokens?: number;
		cost?: number;
	}) => void;
	onTurnErrorReported: TuiProps["onTurnErrorReported"];
	verbose: boolean;
	thinkingEnabled: boolean;
}

export function useAgentEventHandlers(deps: AgentEventDeps) {
	const {
		appendEntry,
		updateLastEntry,
		updateEntry,
		updateEntryById,
		closeEntryStream,
		closeAllStreamingEntries,
		closeInlineStream,
		activeInlineStreamRef,
		setIsRunning,
		setIsStreaming,
		addUsageDelta,
		onTurnErrorReported,
		verbose,
		thinkingEnabled,
	} = deps;
	const activeInlineEntryIdRef = useRef<ChatEntryId | undefined>(undefined);
	const toolEntryIdsByToolCallIdRef = useRef(new Map<string, ChatEntryId>());
	const anonymousToolEntryIdsRef = useRef<ChatEntryId[]>([]);

	const closeCurrentInlineStream = useCallback(() => {
		const entryId = activeInlineEntryIdRef.current;
		activeInlineEntryIdRef.current = undefined;
		activeInlineStreamRef.current = undefined;
		if (entryId) {
			closeEntryStream(entryId);
			return;
		}
		closeInlineStream();
	}, [activeInlineStreamRef, closeEntryStream, closeInlineStream]);

	const appendInlineEntry = useCallback(
		(entry: Extract<ChatEntry, { kind: "assistant_text" | "reasoning" }>) => {
			activeInlineEntryIdRef.current = appendEntry(entry);
		},
		[appendEntry],
	);

	const updateActiveInlineEntry = useCallback(
		(updater: (entry: ChatEntry) => ChatEntry) => {
			const entryId = activeInlineEntryIdRef.current;
			if (!entryId) {
				return false;
			}
			updateEntryById(entryId, updater);
			return true;
		},
		[updateEntryById],
	);

	const closeToolEntry = useCallback(
		(event: AgentEvent & { type: "content_end" }) => {
			const error = event.error ?? undefined;
			const output = event.output;
			const result = {
				outputSummary: error ? "" : formatToolOutput(output),
				rawOutput: error ? undefined : output,
				error,
			};
			if (event.toolCallId) {
				const entryId = toolEntryIdsByToolCallIdRef.current.get(
					event.toolCallId,
				);
				toolEntryIdsByToolCallIdRef.current.delete(event.toolCallId);
				if (entryId) {
					updateEntryById(entryId, (entry) => {
						if (entry.kind !== "tool_call") {
							return entry;
						}
						return { ...entry, streaming: false, result };
					});
					return;
				}
				updateEntry((entry) => {
					if (
						entry.kind !== "tool_call" ||
						entry.toolCallId !== event.toolCallId
					) {
						return entry;
					}
					return { ...entry, streaming: false, result };
				});
			} else {
				const entryId = anonymousToolEntryIdsRef.current.pop();
				if (entryId) {
					updateEntryById(entryId, (entry) => {
						if (entry.kind !== "tool_call") {
							return entry;
						}
						return { ...entry, streaming: false, result };
					});
					return;
				}
				updateLastEntry((prev) => {
					if (prev.kind !== "tool_call" || !prev.streaming) return prev;
					return { ...prev, streaming: false, result };
				});
			}
		},
		[updateEntry, updateEntryById, updateLastEntry],
	);

	const turnErrorReportedRef = useRef(false);
	const knownPendingPromptIdsRef = useRef(new Set<string>());
	const sawVisibleReasoningRef = useRef(false);
	const sawAssistantTextRef = useRef(false);

	const handleAgentEvent = useCallback(
		(event: AgentEvent) => {
			switch (event.type) {
				case "iteration_start":
					setIsRunning(true);
					setIsStreaming(true);
					closeAllStreamingEntries();
					activeInlineEntryIdRef.current = undefined;
					activeInlineStreamRef.current = undefined;
					toolEntryIdsByToolCallIdRef.current.clear();
					anonymousToolEntryIdsRef.current = [];
					sawVisibleReasoningRef.current = false;
					sawAssistantTextRef.current = false;
					break;
				case "iteration_end":
					closeCurrentInlineStream();
					if (
						thinkingEnabled &&
						sawAssistantTextRef.current &&
						!sawVisibleReasoningRef.current
					) {
						appendEntry({
							kind: "reasoning",
							text: "已请求思考，但上游没有返回可见思考内容。",
							streaming: false,
						});
					}
					break;
				case "content_start": {
					setIsStreaming(false);
					switch (event.contentType) {
						case "text": {
							const text = event.text ?? "";
							if (!text) {
								break;
							}
							if (text.trim()) {
								sawAssistantTextRef.current = true;
							}
							if (activeInlineStreamRef.current !== "text") {
								closeCurrentInlineStream();
								activeInlineStreamRef.current = "text";
								appendInlineEntry({
									kind: "assistant_text",
									text,
									streaming: true,
								});
							} else {
								const updated = updateActiveInlineEntry((entry) =>
									entry.kind === "assistant_text"
										? { ...entry, text: entry.text + text }
										: entry,
								);
								if (!updated) {
									appendInlineEntry({
										kind: "assistant_text",
										text,
										streaming: true,
									});
								}
							}
							break;
						}
						case "reasoning": {
							const chunk =
								event.redacted && !event.reasoning
									? "[redacted]"
									: (event.reasoning ?? "");
							if (chunk.trim()) {
								sawVisibleReasoningRef.current = true;
							}
							if (activeInlineStreamRef.current !== "reasoning") {
								closeCurrentInlineStream();
								activeInlineStreamRef.current = "reasoning";
								appendInlineEntry({
									kind: "reasoning",
									text: chunk,
									streaming: true,
								});
							} else {
								const updated = updateActiveInlineEntry((entry) =>
									entry.kind === "reasoning"
										? { ...entry, text: entry.text + chunk }
										: entry,
								);
								if (!updated) {
									appendInlineEntry({
										kind: "reasoning",
										text: chunk,
										streaming: true,
									});
								}
							}
							break;
						}
						case "tool": {
							closeCurrentInlineStream();
							const toolName = event.toolName ?? "unknown_tool";
							const entryId = appendEntry({
								kind: "tool_call",
								toolCallId: event.toolCallId,
								toolName,
								inputSummary: formatToolInput(toolName, event.input),
								rawInput: event.input,
								streaming: true,
							});
							if (event.toolCallId) {
								toolEntryIdsByToolCallIdRef.current.set(
									event.toolCallId,
									entryId,
								);
							} else {
								anonymousToolEntryIdsRef.current.push(entryId);
							}
							break;
						}
					}
					break;
				}
				case "content_end": {
					switch (event.contentType) {
						case "text":
						case "reasoning":
							closeCurrentInlineStream();
							break;
						case "tool": {
							closeCurrentInlineStream();
							closeToolEntry(event);
							break;
						}
					}
					break;
				}
				case "done":
					setIsRunning(false);
					setIsStreaming(false);
					closeAllStreamingEntries();
					activeInlineEntryIdRef.current = undefined;
					activeInlineStreamRef.current = undefined;
					toolEntryIdsByToolCallIdRef.current.clear();
					anonymousToolEntryIdsRef.current = [];
					break;
				case "error":
					setIsRunning(false);
					setIsStreaming(false);
					closeAllStreamingEntries();
					activeInlineEntryIdRef.current = undefined;
					activeInlineStreamRef.current = undefined;
					toolEntryIdsByToolCallIdRef.current.clear();
					anonymousToolEntryIdsRef.current = [];
					turnErrorReportedRef.current = true;
					onTurnErrorReported(true);
					if (!event.recoverable || verbose) {
						appendEntry({ kind: "error", text: event.error.message });
					}
					break;
				case "notice":
					if (event.displayRole === "status") {
						closeCurrentInlineStream();
						const label = resolveStatusNoticeLabel(event);
						if (label) {
							appendEntry({ kind: "status", text: label });
						}
					}
					break;
				case "usage":
					addUsageDelta({
						inputTokens: event.inputTokens,
						outputTokens: event.outputTokens,
						cost: event.cost,
					});
					break;
			}
		},
		[
			appendEntry,
			closeAllStreamingEntries,
			activeInlineStreamRef,
			setIsRunning,
			setIsStreaming,
			addUsageDelta,
			onTurnErrorReported,
			verbose,
			thinkingEnabled,
			closeToolEntry,
			appendInlineEntry,
			updateActiveInlineEntry,
			closeCurrentInlineStream,
		],
	);

	const handleTeamEvent = useCallback(
		(event: TeamEvent) => {
			const team = (text: string) => {
				closeCurrentInlineStream();
				appendEntry({ kind: "team", text });
			};
			switch (event.type) {
				case "teammate_spawned":
					team(`[团队] 已启动队友：${event.agentId}`);
					break;
				case "teammate_shutdown":
					team(`[团队] 队友已关闭：${event.agentId}`);
					break;
				case "team_task_updated":
					team(`[团队任务] ${event.task.id} -> ${event.task.status}`);
					break;
				case "team_message":
					team(
						`[邮箱] ${event.message.fromAgentId} -> ${event.message.toAgentId}: ${event.message.subject}`,
					);
					break;
				case "team_mission_log":
					team(
						`[任务记录] ${event.entry.agentId}: ${truncate(event.entry.summary, 90)}`,
					);
					break;
				case "run_queued":
					team(`[团队运行] 已入队 ${event.run.id} -> ${event.run.agentId} ...`);
					break;
				case "run_started":
					team(`[团队运行] 已开始 ${event.run.id} -> ${event.run.agentId} ...`);
					break;
				case "run_progress":
					if (event.message === "heartbeat") break;
					team(`[团队运行] 进度 ${event.run.id}: ${event.message}`);
					break;
				case "run_completed":
					team(`[团队运行] 已完成 ${event.run.id}`);
					break;
				case "run_failed":
					team(
						`[团队运行] 失败 ${event.run.id}: ${event.run.error ?? "未知错误"}`,
					);
					break;
				case "run_cancelled":
					team(`[团队运行] 已取消 ${event.run.id}`);
					break;
				case "run_interrupted":
					team(`[团队运行] 已中断 ${event.run.id}`);
					break;
				case "outcome_created":
					team(`[团队成果] 已创建 ${event.outcome.id}: ${event.outcome.title}`);
					break;
				case "outcome_fragment_attached":
					team(
						`[团队成果] 片段 ${event.fragment.id} 已附加到 ${event.fragment.section}`,
					);
					break;
				case "outcome_fragment_reviewed":
					team(
						`[team outcome] fragment ${event.fragment.id} -> ${event.fragment.status}`,
					);
					break;
				case "outcome_finalized":
					team(`[team outcome] finalized ${event.outcome.id}`);
					break;
				case "task_start":
				case "task_end":
				case "agent_event":
					break;
			}
		},
		[appendEntry, closeCurrentInlineStream],
	);

	const handlePendingPrompts = useCallback((event: PendingPromptSnapshot) => {
		knownPendingPromptIdsRef.current = new Set(event.prompts.map((e) => e.id));
	}, []);

	const handlePendingPromptSubmitted = useCallback(
		(event: PendingPromptSubmittedEvent) => {
			knownPendingPromptIdsRef.current.delete(event.id);
			appendEntry({ kind: "user_submitted", text: event.prompt });
		},
		[appendEntry],
	);

	return {
		handleAgentEvent,
		handleTeamEvent,
		handlePendingPrompts,
		handlePendingPromptSubmitted,
		turnErrorReportedRef,
	};
}
