import {
	AutocompleteDropdown,
	type AutocompleteDropdownProps,
} from "../components/autocomplete-dropdown";
import {
	ChatMessageList,
	type TranscriptScrollHandle,
} from "../components/chat-message-list";
import type { MouseEvent } from "@opentui/core";
import { InputBar, type TextareaHandle } from "../components/input-bar";
import { InlineToolResponse } from "../components/inline-tool-response";
import { QueuedPrompts } from "../components/queued-prompts";
import {
	resolveModelDisplayName,
	resolveModelMaxInputTokens,
	StatusBar,
} from "../components/status-bar";
import { useSession } from "../contexts/session-context";
import {
	useTerminalBackground,
	useTerminalTheme,
} from "../hooks/use-terminal-background";
import { shouldUseNativeTerminalScrollback } from "../opentui-env";
import {
	getModeAccent,
	getModeInputBackground,
	getModeInputForeground,
	getModeInputPlaceholder,
} from "../palette";
import type {
	QueuedPromptItem,
	RuntimeToolInteraction,
	TuiProps,
} from "../types";

export function ChatView(props: {
	config: TuiProps["config"];
	inputValue: string;
	inputKey: number;
	onSubmit: () => void;
	onContentChange: (text: string) => void;
	onImagePaste: (dataUrl: string) => string;
	onLargeTextPaste: (text: string) => string;
	onInputFocusRequest?: () => void;
	repoStatus: {
		branch: string | null;
		diffStats: {
			files: number;
			additions: number;
			deletions: number;
		} | null;
	};
	textareaRef?: React.MutableRefObject<TextareaHandle | null>;
	transcriptScrollRef?: React.Ref<TranscriptScrollHandle>;
	autocomplete?: AutocompleteDropdownProps;
	accountBalance?: string;
	queuedPrompts?: QueuedPromptItem[];
	selectedQueuedPromptId?: string | null;
	editingQueuedPrompt?: QueuedPromptItem;
	onQueuedPromptEditConfirm: (id: string, prompt: string) => void;
	onToggleMode: () => void;
	runtimeInteraction?: RuntimeToolInteraction | null;
	onResolveToolApproval: (id: number, approved: boolean) => void;
	onResolveAskQuestion: (id: number, answer: string | null) => void;
}) {
	const {
		config,
		inputValue,
		inputKey,
		onSubmit,
		onContentChange,
		onImagePaste,
		onLargeTextPaste,
		repoStatus,
	} = props;
	const session = useSession();
	const terminalBg = useTerminalBackground();
	const terminalTheme = useTerminalTheme();
	const accent = getModeAccent(session.uiMode, terminalTheme);
	const inputBackground = getModeInputBackground(session.uiMode, terminalBg);
	const inputForeground = getModeInputForeground(session.uiMode, terminalBg);
	const inputPlaceholder = getModeInputPlaceholder(session.uiMode, terminalBg);
	const placeholder = session.uiMode === "plan" ? "输入要规划的任务..." : "输入任何问题...";
	const modelDisplayName = resolveModelDisplayName(config);
	const maxInputTokens = resolveModelMaxInputTokens(config);
	const runtimeInteraction = props.runtimeInteraction ?? null;
	const useNativeScrollback = shouldUseNativeTerminalScrollback();
	const handleMouseScroll = (event: MouseEvent) => {
		const direction = event.scroll?.direction;
		if (direction !== "up" && direction !== "down") return;

		const ref =
			typeof props.transcriptScrollRef === "object"
				? props.transcriptScrollRef
				: null;
		ref?.current?.runWheelScroll(direction, event.scroll?.delta);
		event.preventDefault();
	};

	return (
		<box
			flexDirection="column"
			width="100%"
			height={useNativeScrollback ? undefined : "100%"}
			onMouseScroll={useNativeScrollback ? undefined : handleMouseScroll}
		>
			<ChatMessageList
				ref={props.transcriptScrollRef}
				entries={session.entries}
				isStreaming={session.isStreaming}
				uiMode={session.uiMode}
			/>

			<box flexDirection="column" flexShrink={0} width="100%">
				{runtimeInteraction ? (
					<box marginBottom={1} width="100%">
						<InlineToolResponse
							key={runtimeInteraction.id}
							interaction={runtimeInteraction}
							accent={accent}
							inputBackground={inputBackground}
							inputForeground={inputForeground}
							inputPlaceholder={inputPlaceholder}
							onResolveToolApproval={props.onResolveToolApproval}
							onResolveAskQuestion={props.onResolveAskQuestion}
						/>
					</box>
				) : (
					<>
						{props.autocomplete && (
							<AutocompleteDropdown {...props.autocomplete} accent={accent} />
						)}

						{props.queuedPrompts && props.queuedPrompts.length > 0 && (
							<QueuedPrompts
								items={props.queuedPrompts}
								selectedId={props.selectedQueuedPromptId ?? null}
								editingId={props.editingQueuedPrompt?.id ?? null}
								onEditConfirm={props.onQueuedPromptEditConfirm}
							/>
						)}

						<box marginBottom={1} width="100%">
							<InputBar
								accent={accent}
								inputBackground={inputBackground}
								inputForeground={inputForeground}
								inputPlaceholder={inputPlaceholder}
								placeholder={placeholder}
								initialValue={inputValue}
								inputKey={inputKey}
								onSubmit={onSubmit}
								onContentChange={onContentChange}
								onImagePaste={onImagePaste}
								onLargeTextPaste={onLargeTextPaste}
								onFocusRequest={props.onInputFocusRequest}
								textareaRef={props.textareaRef}
							/>
						</box>
					</>
				)}

				<StatusBar
					providerId={config.providerId}
					modelId={modelDisplayName}
					totalTokens={session.lastTotalTokens}
					totalCost={session.lastTotalCost}
					maxInputTokens={maxInputTokens}
					accountBalance={props.accountBalance}
					uiMode={session.uiMode}
					autoApproveAll={session.autoApproveAll}
					workspaceName={
						config.workspaceRoot
							? (config.workspaceRoot.split("/").pop() ?? "")
							: ""
					}
					gitBranch={repoStatus.branch}
					gitDiffStats={repoStatus.diffStats}
					onToggleMode={props.onToggleMode}
					variant="chat"
				/>
			</box>
		</box>
	);
}
