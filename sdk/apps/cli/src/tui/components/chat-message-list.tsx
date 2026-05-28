import "opentui-spinner/react";
import type { AgentMode } from "@cline/core";
import type { MouseEvent, ScrollBoxRenderable } from "@opentui/core";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
} from "react";
import type { TranscriptCommand } from "../hooks/transcript-keybinds";
import { useTerminalTheme } from "../hooks/use-terminal-background";
import { shouldUseNativeTerminalScrollback } from "../opentui-env";
import { getModeAccent } from "../palette";
import type { ChatEntry } from "../types";
import {
	groupTranscriptEntries,
	shouldInsertTranscriptEntrySpacer,
} from "../utils/transcript-layout";
import { ChatEntryView } from "./chat-entry";

export interface TranscriptScrollHandle {
	runTranscriptCommand: (command: TranscriptCommand) => void;
	runWheelScroll: (direction: "up" | "down", delta?: number) => void;
}

interface ChatMessageListProps {
	entries: ChatEntry[];
	isStreaming?: boolean;
	uiMode?: AgentMode;
}

export const ChatMessageList = forwardRef<
	TranscriptScrollHandle,
	ChatMessageListProps
>(function ChatMessageList(props, ref) {
	const scrollboxRef = useRef<ScrollBoxRenderable | null>(null);
	const lastEntry = props.entries.at(-1);
	const terminalTheme = useTerminalTheme();
	const accent = getModeAccent(props.uiMode ?? "act", terminalTheme);
	const useNativeScrollback = shouldUseNativeTerminalScrollback();
	const userSubmissionScrollKey =
		lastEntry?.kind === "user_submitted" ? props.entries.length : 0;
	const groups = groupTranscriptEntries(props.entries);

	const runTranscriptCommand = useCallback((command: TranscriptCommand) => {
		const scrollbox = scrollboxRef.current;
		if (!scrollbox) return;

		switch (command) {
			case "messages_page_up":
				scrollbox.scrollBy(-scrollbox.height / 2);
				return;
			case "messages_page_down":
				scrollbox.scrollBy(scrollbox.height / 2);
				return;
			case "messages_half_page_up":
				scrollbox.scrollBy(-scrollbox.height / 4);
				return;
			case "messages_half_page_down":
				scrollbox.scrollBy(scrollbox.height / 4);
				return;
			case "messages_first":
				scrollbox.scrollTo(0);
				return;
			case "messages_last":
				scrollbox.scrollTo(scrollbox.scrollHeight);
				return;
		}
	}, []);

	const runWheelScroll = useCallback((direction: "up" | "down", delta = 1) => {
		const scrollbox = scrollboxRef.current;
		if (!scrollbox) return;

		const amount = Math.max(1, delta) * (direction === "up" ? -1 : 1);
		scrollbox.scrollBy(amount);
	}, []);

	useImperativeHandle(
		ref,
		() => ({
			runTranscriptCommand,
			runWheelScroll,
		}),
		[runTranscriptCommand, runWheelScroll],
	);

	useEffect(() => {
		if (!userSubmissionScrollKey) return;

		const scrollToBottom = () => {
			const scrollbox = scrollboxRef.current;
			if (!scrollbox) return;

			scrollbox.scrollTo(scrollbox.scrollHeight);
		};

		scrollToBottom();
		queueMicrotask(scrollToBottom);
		const timeout = setTimeout(scrollToBottom, 0);
		return () => clearTimeout(timeout);
	}, [userSubmissionScrollKey]);

	const transcript = (
		<box flexDirection="column" width="100%" paddingX={1} paddingY={1}>
			{groups.map((group, groupIndex) => (
				<box
					key={`group:${groupIndex}`}
					flexDirection="column"
					width="100%"
					marginTop={groupIndex === 0 ? 0 : group.startsWithUser ? 2 : 1}
				>
					{group.entries.map((entry, entryIndex) => {
						const previous = group.entries[entryIndex - 1];
						const key =
							entry.entryId ?? `${groupIndex}:${entryIndex}:${entry.kind}`;
						return (
							<box
								key={key}
								width="100%"
								marginTop={
									previous && shouldInsertTranscriptEntrySpacer(previous, entry)
										? 1
										: 0
								}
							>
								<ChatEntryView
									entry={entry}
									accent={accent}
									terminalTheme={terminalTheme}
								/>
							</box>
						);
					})}
				</box>
			))}
			{props.isStreaming && (
				<box flexDirection="row" gap={1} marginTop={1}>
					<spinner name="dots" color={accent} />
					<text fg="gray">正在思考...（Esc 取消）</text>
				</box>
			)}
		</box>
	);

	if (useNativeScrollback) {
		return transcript;
	}

	return (
		<scrollbox
			ref={scrollboxRef}
			flexGrow={1}
			width="100%"
			stickyScroll
			stickyStart="bottom"
			onMouseScroll={(event: MouseEvent) => event.stopPropagation()}
		>
			{transcript}
		</scrollbox>
	);
});
