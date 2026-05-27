// @jsxImportSource @opentui/react
import type { ChoiceContext } from "@opentui-ui/dialog";
import { useDialogKeyboard } from "@opentui-ui/dialog/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	isNextNavigationKey,
	isPreviousNavigationKey,
	navigationHint,
} from "../../hooks/navigation-keys";
import { palette } from "../../palette";
import type { ClineModelPickerEntry } from "./cline-model-picker";
import { CHANGE_PROVIDER_ACTION } from "./model-selector";
import { ProviderRow } from "./provider-row";

export const BROWSE_ALL_ACTION = "__browse_all__";

type ClineModelEntriesState =
	| { status: "loading"; message: string }
	| { status: "loaded"; entries: ClineModelPickerEntry[] }
	| { status: "error"; message: string };

function tagColor(tag: string): string {
	if (tag === "FREE") return palette.success;
	if (tag === "BEST") return "magenta";
	return "cyan";
}

function resolveDisplayName(
	modelId: string,
	knownModels?: Record<string, unknown>,
): string {
	if (knownModels) {
		const candidates = [modelId, modelId.split("/").pop()];
		for (const key of candidates) {
			if (!key) continue;
			const hit = knownModels[key] as { name?: string } | undefined;
			if (hit?.name) return hit.name;
		}
	}
	return modelId.includes("/")
		? (modelId.split("/").pop() ?? modelId)
		: modelId;
}

export function ClineModelSelectorContent(
	props: ChoiceContext<string> & {
		currentModel: string;
		currentProviderName: string;
		knownModels?: Record<string, unknown>;
		entries: ClineModelPickerEntry[];
	},
) {
	const {
		resolve,
		dismiss,
		dialogId,
		currentModel,
		currentProviderName,
		knownModels,
		entries,
	} = props;
	const [selected, setSelected] = useState(0);
	const [onProvider, setOnProvider] = useState(false);

	const displayRows = useMemo(() => {
		const rows: {
			key: string;
			kind: "header" | "model" | "browse";
			label: string;
			tags: string[];
			isCurrent: boolean;
			entryIndex: number;
		}[] = [];
		let lastTier: string | null = null;
		for (let i = 0; i < entries.length; i++) {
			const entry = entries[i];
			if (!entry) continue;
			if (entry.kind === "model") {
				if (entry.tier !== lastTier) {
					lastTier = entry.tier;
					rows.push({
						key: `tier-${entry.tier}`,
						kind: "header",
						label: entry.tier === "recommended" ? "推荐" : "免费",
						tags: [],
						isCurrent: false,
						entryIndex: -1,
					});
				}
				rows.push({
					key: entry.model.id,
					kind: "model",
					label: resolveDisplayName(entry.model.id, knownModels),
					tags: entry.model.tags,
					isCurrent: currentModel === entry.model.id,
					entryIndex: i,
				});
			} else {
				rows.push({
					key: "browse-all",
					kind: "browse",
					label: "浏览全部模型...",
					tags: [],
					isCurrent: false,
					entryIndex: i,
				});
			}
		}
		return rows;
	}, [entries, knownModels, currentModel]);

	useDialogKeyboard((key) => {
		if (key.name === "escape") {
			dismiss();
			return;
		}
		if (key.name === "return" || key.name === "enter") {
			if (onProvider) {
				resolve(CHANGE_PROVIDER_ACTION);
				return;
			}
			const entry = entries[selected];
			if (!entry) return;
			if (entry.kind === "model") {
				resolve(entry.model.id);
			} else {
				resolve(BROWSE_ALL_ACTION);
			}
			return;
		}
		const total = entries.length;
		if (total === 0) return;
		if (isPreviousNavigationKey(key)) {
			if (onProvider) {
				setOnProvider(false);
			} else if (selected <= 0) {
				setOnProvider(true);
			} else {
				setSelected((s) => (s <= 0 ? total - 1 : s - 1));
			}
			return;
		}
		if (isNextNavigationKey(key)) {
			if (onProvider) {
				setOnProvider(false);
			} else {
				setSelected((s) => (s >= total - 1 ? 0 : s + 1));
			}
			return;
		}
	}, dialogId);

	return (
		<box flexDirection="column" gap={1}>
			<text>
				<strong>选择模型</strong>
			</text>

			<ProviderRow providerName={currentProviderName} focused={onProvider} />

			<box flexDirection="column">
				{displayRows.map((row, idx) => {
					if (row.kind === "header") {
						const isFirst = idx === 0;
						return (
							<box key={row.key} paddingX={1} marginTop={isFirst ? 0 : 1}>
								<text fg="gray">{row.label}</text>
							</box>
						);
					}
					const isSel = row.entryIndex === selected && !onProvider;
					const isGray = row.kind === "browse";
					return (
						<box
							key={row.key}
							paddingX={1}
							flexDirection="row"
							gap={1}
							backgroundColor={isSel ? palette.selection : undefined}
							marginTop={row.kind === "browse" ? 1 : 0}
						>
							<text
								fg={isSel ? palette.textOnSelection : "gray"}
								flexShrink={0}
							>
								{isSel ? "\u276f" : " "}
							</text>
							<text
								fg={
									isSel ? palette.textOnSelection : isGray ? "gray" : undefined
								}
							>
								{row.label}
							</text>
							{row.tags.map((t) => (
								<text
									key={t}
									fg={isSel ? palette.textOnSelection : tagColor(t)}
									flexShrink={0}
								>
									{t}
								</text>
							))}
							{row.isCurrent && (
								<text
									fg={isSel ? palette.textOnSelection : "gray"}
									flexShrink={0}
								>
									（当前）
								</text>
							)}
						</box>
					);
				})}
			</box>

			<text fg="gray">
				{navigationHint()}，Enter 选择，Esc 返回
			</text>
		</box>
	);
}

export function ClineModelSelectorDialogContent(
	props: ChoiceContext<string> & {
		currentModel: string;
		currentProviderName: string;
		knownModels?: Record<string, unknown>;
		loadEntries: () => Promise<ClineModelPickerEntry[]>;
	},
) {
	const { dismiss, dialogId, loadEntries } = props;
	const [state, setState] = useState<ClineModelEntriesState>({
		status: "loading",
		message: "正在加载 NBG 模型...",
	});
	const generation = useRef(0);

	const reload = useCallback(async () => {
		const currentGeneration = generation.current + 1;
		generation.current = currentGeneration;
		setState({ status: "loading", message: "正在加载 NBG 模型..." });
		try {
			const entries = await loadEntries();
			if (generation.current === currentGeneration) {
				setState({ status: "loaded", entries });
			}
		} catch (error) {
			if (generation.current === currentGeneration) {
				setState({
					status: "error",
					message: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}, [loadEntries]);

	useEffect(() => {
		void reload();
	}, [reload]);

	useDialogKeyboard((key) => {
		if (state.status === "loaded") {
			return;
		}
		if (key.name === "escape") {
			dismiss();
			return;
		}
		if (state.status === "error" && key.name === "r") {
			void reload();
		}
	}, dialogId);

	if (state.status === "loaded") {
		return <ClineModelSelectorContent {...props} entries={state.entries} />;
	}

	if (state.status === "error") {
		return (
			<box flexDirection="column" gap={1}>
				<text fg="cyan">选择模型</text>
				<ProviderRow providerName={props.currentProviderName} focused={false} />
				<text fg="red">{state.message}</text>
				<text fg="gray">R 重试，Esc 返回</text>
			</box>
		);
	}

	return (
		<box flexDirection="column" gap={1}>
			<text fg="cyan">选择模型</text>
			<ProviderRow providerName={props.currentProviderName} focused={false} />
			<text fg="gray">{state.message}</text>
			<text fg="gray">Esc 返回</text>
		</box>
	);
}
