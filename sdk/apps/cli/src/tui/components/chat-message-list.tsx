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

	const runWheelScroll = useCallback(
		(direction: "up" | "down", delta = 1) => {
			const scrollbox = scrollboxRef.current;
			if (!scrollbox) return;

			const amount = Math.max(1, delta) * (direction === "up" ? -1 : 1);
			scrollbox.scrollBy(amount);
		},
		[],
	);

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
		<box flexDirection="column" width="100%" paddingX={1} paddingY={1} gap={1}>
			{props.entries.map((entry, i) => {
				const key = `${i}:${entry.kind}`;
				return (
					<ChatEntryView
						key={key}
						entry={entry}
						accent={accent}
						terminalTheme={terminalTheme}
					/>
				);
			})}
			{props.isStreaming && (
				<box flexDirection="row" gap={1}>
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
