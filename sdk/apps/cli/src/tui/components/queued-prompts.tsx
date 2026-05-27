import "opentui-spinner/react";
import { useEffect, useState } from "react";
import { useSession } from "../contexts/session-context";
import { mainNavigationHint } from "../hooks/navigation-keys";
import { useTouchInputFocus } from "../hooks/use-touch-input-focus";
import { palette } from "../palette";
import type { QueuedPromptItem } from "../types";

function truncatePrompt(prompt: string): string {
	return prompt.length > 64 ? `${prompt.slice(0, 64)}...` : prompt;
}

function attachmentLabel(count: number): string {
	if (count <= 0) return "";
	return ` ${count} 个附件`;
}

export function QueuedPrompts(props: {
	items: QueuedPromptItem[];
	selectedId: string | null;
	editingId: string | null;
	onEditConfirm: (id: string, prompt: string) => void;
}) {
	const session = useSession();
	if (props.items.length === 0) return null;

	const selected = props.selectedId
		? props.items.find((item) => item.id === props.selectedId)
		: undefined;
	const selectedIsEditing = selected?.id === props.editingId;
	const escapeHint = session.isRunning ? "Esc 取消本轮" : "Esc 返回";
	const hint = selected
		? selectedIsEditing
			? "Enter 确认，Esc 取消"
			: selected.steer
				? session.isRunning
					? `等待中。${mainNavigationHint()}，Tab 编辑，Esc 取消本轮`
					: `已设为下一条引导。${mainNavigationHint()}，Tab 编辑，${escapeHint}`
				: `${mainNavigationHint()}，Enter 引导，Tab 编辑，${escapeHint}`
		: "Alt+P 引导或编辑消息";

	return (
		<box
			flexDirection="column"
			border
			borderStyle="rounded"
			borderColor={selected ? palette.selection : "gray"}
			paddingX={1}
		>
			<text fg="gray">
				<em>排队消息：</em>
			</text>
			{props.items.map((item) => {
				const isSelected = item.id === props.selectedId;
				const isEditing = item.id === props.editingId;
				return (
					<QueuedPromptRow
						key={item.id}
						item={item}
						selected={isSelected}
						editing={isEditing}
						onEditConfirm={(prompt) => props.onEditConfirm(item.id, prompt)}
					/>
				);
			})}
			<text fg="gray">
				<em>{hint}</em>
			</text>
		</box>
	);
}

function QueuedPromptRow(props: {
	item: QueuedPromptItem;
	selected: boolean;
	editing: boolean;
	onEditConfirm: (prompt: string) => void;
}) {
	const { item, selected, editing } = props;
	const [editValue, setEditValue] = useState(item.prompt);
	const { setInputRef, requestInputFocus } = useTouchInputFocus();

	useEffect(() => {
		if (editing) {
			setEditValue(item.prompt);
		}
	}, [editing, item.prompt]);

	return (
		<box
			paddingX={1}
			flexDirection="row"
			gap={1}
			backgroundColor={selected ? palette.selection : undefined}
			onMouseDown={editing ? requestInputFocus : undefined}
		>
			{item.steer && !editing ? (
				<spinner
					name="dots"
					color={selected ? palette.textOnSelection : "gray"}
				/>
			) : (
				<text fg={selected ? palette.textOnSelection : "gray"} flexShrink={0}>
					{selected ? "❯" : " "}
				</text>
			)}
			{editing ? (
				<input
					ref={setInputRef}
					value={editValue}
					onInput={setEditValue}
					onSubmit={() => props.onEditConfirm(editValue)}
					placeholder="编辑消息..."
					backgroundColor={palette.selection}
					focusedBackgroundColor={palette.selection}
					textColor={palette.textOnSelection}
					cursorColor={palette.textOnSelection}
					placeholderColor={palette.textOnSelection}
					focused
					flexGrow={1}
				/>
			) : (
				<text fg={selected ? palette.textOnSelection : undefined} flexGrow={1}>
					{truncatePrompt(item.prompt)}
				</text>
			)}
			{!editing && item.attachmentCount > 0 && (
				<text fg={selected ? palette.textOnSelection : "gray"} flexShrink={0}>
					{attachmentLabel(item.attachmentCount)}
				</text>
			)}
		</box>
	);
}
