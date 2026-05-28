import type { AgentMode } from "@cline/core";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
} from "react";
import { getCliCompactionMode } from "../../utils/compaction-mode";
import type { CliCompactionMode } from "../../utils/types";
import type { ChatEntry, ChatEntryId, InlineStream, TuiProps } from "../types";
import { MAX_BUFFERED_LINES } from "../types";

interface SessionContextValue {
	entries: ChatEntry[];
	isRunning: boolean;
	isStreaming: boolean;
	abortRequested: boolean;
	hasSubmitted: boolean;
	uiMode: AgentMode;
	autoApproveAll: boolean;
	compactionMode: CliCompactionMode;
	lastTotalTokens: number;
	lastTotalCost: number;
	isExitRequested: boolean;

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
	setAbortRequested: (v: boolean) => void;
	setHasSubmitted: (v: boolean) => void;
	setLastTotalTokens: (v: number) => void;
	setLastTotalCost: (v: number) => void;
	addUsageDelta: (usage: UsageDelta) => void;
	setUiMode: (mode: AgentMode) => void;
	toggleMode: () => void;
	toggleAutoApprove: () => void;
	setCompactionMode: (mode: CliCompactionMode) => void;
	requestExit: () => void;
	clearEntries: () => void;
	replaceEntries: (entries: ChatEntry[]) => void;
}

type UsageDelta = {
	inputTokens?: number;
	outputTokens?: number;
	cost?: number;
};

const SessionContext = createContext<SessionContextValue | null>(null);
let nextChatEntryId = 0;

function createChatEntryId(): ChatEntryId {
	nextChatEntryId += 1;
	return `entry:${nextChatEntryId}`;
}

export function ensureChatEntryId(entry: ChatEntry): ChatEntry {
	return entry.entryId ? entry : { ...entry, entryId: createChatEntryId() };
}

function ensureChatEntryIds(entries: ChatEntry[]): ChatEntry[] {
	return entries.map(ensureChatEntryId);
}

function preserveChatEntryId(
	previous: ChatEntry,
	updated: ChatEntry,
): ChatEntry {
	if (updated.entryId === previous.entryId) {
		return updated;
	}
	return { ...updated, entryId: previous.entryId ?? updated.entryId };
}

function isStreamingChatEntry(
	entry: ChatEntry,
): entry is Extract<
	ChatEntry,
	{ kind: "assistant_text" | "reasoning" | "tool_call"; streaming: boolean }
> {
	return (
		(entry.kind === "assistant_text" ||
			entry.kind === "reasoning" ||
			entry.kind === "tool_call") &&
		entry.streaming
	);
}

export function updateChatEntryById(
	entries: ChatEntry[],
	entryId: ChatEntryId,
	updater: (entry: ChatEntry) => ChatEntry,
): ChatEntry[] {
	let changed = false;
	const next = entries.map((entry) => {
		if (entry.entryId !== entryId) {
			return entry;
		}
		const updated = ensureChatEntryId(updater(entry));
		if (updated.entryId !== entry.entryId) {
			changed = true;
			return preserveChatEntryId(entry, updated);
		}
		if (updated !== entry) {
			changed = true;
		}
		return updated;
	});
	return changed ? next : entries;
}

export function closeChatEntryStream(
	entries: ChatEntry[],
	entryId: ChatEntryId,
): ChatEntry[] {
	return updateChatEntryById(entries, entryId, (entry) => {
		if (!isStreamingChatEntry(entry)) {
			return entry;
		}
		return { ...entry, streaming: false } as ChatEntry;
	});
}

export function closeAllStreamingChatEntries(
	entries: ChatEntry[],
): ChatEntry[] {
	let changed = false;
	const next = entries.map((entry) => {
		if (!isStreamingChatEntry(entry)) {
			return entry;
		}
		changed = true;
		return { ...entry, streaming: false } as ChatEntry;
	});
	return changed ? next : entries;
}

export function useSession(): SessionContextValue {
	const ctx = useContext(SessionContext);
	if (!ctx) throw new Error("useSession must be within SessionProvider");
	return ctx;
}

export function nextUsageTokenDisplay(
	previousTotalTokens: number,
	usage: UsageDelta,
): number {
	const inputTokens = Math.max(0, usage.inputTokens ?? 0);
	return inputTokens > 0 ? inputTokens : previousTotalTokens;
}

export function SessionProvider(props: {
	config: TuiProps["config"];
	initialEntries?: ChatEntry[];
	initialUsage?: {
		totalTokens: number;
		totalCost: number;
	};
	onRunningChange: TuiProps["onRunningChange"];
	onAutoApproveChange: TuiProps["onAutoApproveChange"];
	onCompactionModeChange: TuiProps["onCompactionModeChange"];
	onExit: TuiProps["onExit"];
	children: React.ReactNode;
}) {
	const {
		config,
		initialEntries,
		initialUsage,
		onRunningChange,
		onAutoApproveChange,
		onCompactionModeChange,
		onExit,
	} = props;

	const [entries, setEntries] = useState<ChatEntry[]>(() =>
		initialEntries && initialEntries.length > MAX_BUFFERED_LINES
			? ensureChatEntryIds(
					initialEntries.slice(initialEntries.length - MAX_BUFFERED_LINES),
				)
			: ensureChatEntryIds(initialEntries ?? []),
	);
	const [isRunning, _setIsRunning] = useState(false);
	const [isStreaming, setIsStreaming] = useState(false);
	const [abortRequested, setAbortRequested] = useState(false);
	const [hasSubmitted, setHasSubmitted] = useState(
		(initialEntries?.length ?? 0) > 0,
	);
	const [uiMode, setUiMode] = useState<AgentMode>(
		config.mode === "plan" ? "plan" : "act",
	);
	const [autoApproveAll, _setAutoApproveAll] = useState(
		config.toolPolicies["*"]?.autoApprove !== false,
	);
	const [compactionMode, _setCompactionMode] = useState<CliCompactionMode>(() =>
		getCliCompactionMode(config),
	);
	const [lastTotalTokens, setLastTotalTokens] = useState(
		() => initialUsage?.totalTokens ?? 0,
	);
	const [lastTotalCost, setLastTotalCost] = useState(
		() => initialUsage?.totalCost ?? 0,
	);
	const [isExitRequested, setIsExitRequested] = useState(false);

	const activeInlineStreamRef = useRef<InlineStream>(undefined);

	const setIsRunning = useCallback(
		(v: boolean) => {
			_setIsRunning(v);
			setAbortRequested(false);
			onRunningChange(v);
		},
		[onRunningChange],
	);

	const appendEntry = useCallback((entry: ChatEntry): ChatEntryId => {
		const entryWithId = ensureChatEntryId(entry);
		setEntries((prev) => {
			const next = [...prev, entryWithId];
			return next.length <= MAX_BUFFERED_LINES
				? next
				: next.slice(next.length - MAX_BUFFERED_LINES);
		});
		return entryWithId.entryId as ChatEntryId;
	}, []);

	const updateLastEntry = useCallback(
		(updater: (prev: ChatEntry) => ChatEntry) => {
			setEntries((prev) => {
				if (prev.length === 0) return prev;
				const next = [...prev];
				const previous = next[next.length - 1] as ChatEntry;
				next[next.length - 1] = preserveChatEntryId(
					previous,
					ensureChatEntryId(updater(previous)),
				);
				return next;
			});
		},
		[],
	);

	const updateEntry = useCallback(
		(updater: (entry: ChatEntry) => ChatEntry) => {
			setEntries((prev) => {
				let changed = false;
				const next = prev.map((entry) => {
					const updated = preserveChatEntryId(
						entry,
						ensureChatEntryId(updater(entry)),
					);
					if (updated !== entry) changed = true;
					return updated;
				});
				return changed ? next : prev;
			});
		},
		[],
	);

	const updateEntryById = useCallback(
		(entryId: ChatEntryId, updater: (entry: ChatEntry) => ChatEntry) => {
			setEntries((prev) => updateChatEntryById(prev, entryId, updater));
		},
		[],
	);

	const closeEntryStream = useCallback((entryId: ChatEntryId) => {
		setEntries((prev) => closeChatEntryStream(prev, entryId));
	}, []);

	const closeAllStreamingEntries = useCallback(() => {
		activeInlineStreamRef.current = undefined;
		setEntries(closeAllStreamingChatEntries);
	}, []);

	const closeInlineStream = useCallback(() => {
		activeInlineStreamRef.current = undefined;
		setEntries((prev) => {
			let changed = false;
			const next = prev.map((entry) => {
				if (
					(entry.kind === "assistant_text" || entry.kind === "reasoning") &&
					entry.streaming
				) {
					changed = true;
					return { ...entry, streaming: false } as ChatEntry;
				}
				return entry;
			});
			return changed ? next : prev;
		});
	}, []);

	const toggleMode = useCallback(() => {
		setUiMode((m) => (m === "act" ? "plan" : "act"));
	}, []);

	const toggleAutoApprove = useCallback(() => {
		_setAutoApproveAll((prev) => {
			const next = !prev;
			onAutoApproveChange(next);
			return next;
		});
	}, [onAutoApproveChange]);

	const setCompactionMode = useCallback(
		(mode: CliCompactionMode) => {
			_setCompactionMode(mode);
			void onCompactionModeChange(mode);
		},
		[onCompactionModeChange],
	);

	const requestExit = useCallback(() => {
		setIsExitRequested(true);
		setTimeout(() => onExit(), 0);
	}, [onExit]);

	const clearEntries = useCallback(() => {
		setEntries([]);
		setLastTotalTokens(0);
		setLastTotalCost(0);
	}, []);

	const addUsageDelta = useCallback((usage: UsageDelta) => {
		const nextTotalTokens = nextUsageTokenDisplay(0, usage);
		if (nextTotalTokens > 0) {
			setLastTotalTokens((prev) => nextUsageTokenDisplay(prev, usage));
		}
		const costDelta = usage.cost;
		if (
			typeof costDelta === "number" &&
			Number.isFinite(costDelta) &&
			costDelta > 0
		) {
			setLastTotalCost((prev) => prev + costDelta);
		}
	}, []);

	const replaceEntries = useCallback((nextEntries: ChatEntry[]) => {
		const entriesWithIds = ensureChatEntryIds(nextEntries);
		setEntries(
			entriesWithIds.length > MAX_BUFFERED_LINES
				? entriesWithIds.slice(entriesWithIds.length - MAX_BUFFERED_LINES)
				: entriesWithIds,
		);
	}, []);

	const value: SessionContextValue = {
		entries,
		isRunning,
		isStreaming,
		abortRequested,
		hasSubmitted,
		uiMode,
		autoApproveAll,
		compactionMode,
		lastTotalTokens,
		lastTotalCost,
		isExitRequested,
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
		setAbortRequested,
		setHasSubmitted,
		setLastTotalTokens,
		setLastTotalCost,
		addUsageDelta,
		setUiMode,
		toggleMode,
		toggleAutoApprove,
		setCompactionMode,
		requestExit,
		clearEntries,
		replaceEntries,
	};

	return (
		<SessionContext.Provider value={value}>
			{props.children}
		</SessionContext.Provider>
	);
}
