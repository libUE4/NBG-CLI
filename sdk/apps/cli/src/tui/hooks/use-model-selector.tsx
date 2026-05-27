import {
	fetchClineRecommendedModels,
	getProviderConfigFields,
	Llms,
	ProviderSettingsManager,
	refreshProviderModelsFromSource,
	resolveProviderConfig,
} from "@cline/core";
import type { ChoiceContext } from "@opentui-ui/dialog";
import type { DialogActions } from "@opentui-ui/dialog/react";
import { useCallback } from "react";
import { isLocalCliProvider } from "../../utils/codex-cli";
import {
	getPersistedProviderApiKey,
	isOAuthProvider,
	isProviderConfigured,
} from "../../utils/provider-auth";
import {
	loadThirdPartyProviderModels,
	providerModelsToKnownModels,
	THIRD_PARTY_PROVIDER_ID,
	THIRD_PARTY_PROVIDER_NAME,
	updateThirdPartyProviderFromModelsSource,
} from "../../utils/third-party-api";
import type { Config } from "../../utils/types";
import { withLoadingDialog } from "../components/dialogs/loading-dialog";
import {
	CodexCliStatusContent,
	type ExistingProviderAction,
	OAuthLoginContent,
	ProviderConfigInputContent,
	ProviderPickerContent,
	UseExistingOrReconfigureContent,
} from "../components/dialogs/provider-picker";
import { buildClineModelEntries } from "../components/model-selector/cline-model-picker";
import {
	BROWSE_ALL_ACTION,
	ClineModelSelectorDialogContent,
} from "../components/model-selector/cline-model-selector";
import {
	buildModelOptions,
	CHANGE_PROVIDER_ACTION,
	type ModelOption,
	ModelSelectorContent,
	type ThinkingLevel,
	ThinkingLevelContent,
} from "../components/model-selector/model-selector";

export interface OpenModelSelectorOptions {
	onCancel?: () => Promise<void> | void;
	startWithProviderChange?: boolean;
}

async function getProviderDisplayName(providerId: string): Promise<string> {
	if (providerId === THIRD_PARTY_PROVIDER_ID) {
		return THIRD_PARTY_PROVIDER_NAME;
	}
	const info = await Llms.getProvider(providerId);
	return info?.name ?? providerId;
}

async function refreshModelsForConfig(
	config: Config,
	manager: ProviderSettingsManager,
): Promise<void> {
	if (config.providerId === THIRD_PARTY_PROVIDER_ID) {
		const { models } = await loadThirdPartyProviderModels(manager);
		config.knownModels = providerModelsToKnownModels(models);
		const ids = models.map((model) => model.id);
		const settings = manager.getProviderSettings(THIRD_PARTY_PROVIDER_ID);
		const settingsModel = settings?.model;

		if (settingsModel && ids.includes(settingsModel)) {
			config.modelId = settingsModel;
			return;
		}

		if (ids.includes(config.modelId)) {
			if (settings?.model !== config.modelId) {
				manager.saveProviderSettings(
					{
						...(settings ?? { provider: THIRD_PARTY_PROVIDER_ID }),
						model: config.modelId,
					},
					{ setLastUsed: false },
				);
			}
			return;
		}

		if (ids[0]) {
			config.modelId = ids[0];
		}
		return;
	}

	await refreshProviderModelsFromSource(manager, config.providerId).catch(
		() => {},
	);
	const resolved = await resolveProviderConfig(
		config.providerId,
		{
			loadLatestOnInit: true,
			loadPrivateOnAuth: true,
			failOnError: false,
		},
		manager.getProviderConfig(config.providerId, { includeKnownModels: false }),
	);
	if (resolved?.knownModels) {
		config.knownModels = resolved.knownModels;
	}
}

async function refreshCurrentProviderModels(config: Config): Promise<void> {
	await refreshModelsForConfig(config, new ProviderSettingsManager());
}

async function verifyThirdPartyConfig(
	manager: ProviderSettingsManager,
	providerId: string,
): Promise<void> {
	if (providerId !== THIRD_PARTY_PROVIDER_ID) {
		return;
	}
	const settings = manager.getProviderSettings(THIRD_PARTY_PROVIDER_ID);
	const baseUrl = settings?.baseUrl?.trim();
	const apiKey = settings?.apiKey?.trim();
	if (!baseUrl) {
		throw new Error("请输入三方接口地址");
	}
	if (!apiKey) {
		throw new Error("请输入 API Key");
	}
	await updateThirdPartyProviderFromModelsSource(manager, {
		baseUrl,
		apiKey,
		preferredModelId: settings?.model,
	});
}

function clearReasoningConfig(config: Config): void {
	config.thinking = false;
	config.reasoningEffort = undefined;
}

function supportsReasoningForSelection(
	config: Config,
	model: ModelOption | undefined,
): boolean {
	return (
		model?.supportsReasoning === true ||
		config.providerId === THIRD_PARTY_PROVIDER_ID
	);
}

async function runProviderChange(
	dialog: DialogActions,
	config: Config,
	termHeight: number,
): Promise<boolean> {
	const newProviderId = await dialog.choice<string>({
		style: { maxHeight: termHeight - 2 },
		content: (ctx: ChoiceContext<string>) => (
			<ProviderPickerContent {...ctx} currentProviderId={config.providerId} />
		),
	});
	if (!newProviderId) return false;

	const manager = new ProviderSettingsManager();
	const displayName = await withLoadingDialog(
		dialog,
		"正在加载三方 API...",
		async () => await getProviderDisplayName(newProviderId),
	);
	const existingSettings = manager.getProviderSettings(newProviderId);

	let needsAuth = true;
	if (isProviderConfigured(newProviderId, existingSettings)) {
		const action = await dialog.choice<ExistingProviderAction>({
			style: { maxHeight: termHeight - 2 },
			content: (ctx: ChoiceContext<ExistingProviderAction>) => (
				<UseExistingOrReconfigureContent {...ctx} providerName={displayName} />
			),
		});
		if (!action) return false;
		needsAuth = action === "reconfigure";
	}

	let configureError = "";
	while (needsAuth) {
		let saved: boolean | undefined;
		if (isOAuthProvider(newProviderId)) {
			saved = await dialog.choice<boolean>({
				style: { maxHeight: termHeight - 2 },
				closeOnEscape: false,
				content: (ctx: ChoiceContext<boolean>) => (
					<OAuthLoginContent
						{...ctx}
						providerId={newProviderId}
						providerName={displayName}
					/>
				),
			});
		} else if (isLocalCliProvider(newProviderId)) {
			saved = await dialog.choice<boolean>({
				style: { maxHeight: termHeight - 2 },
				closeOnEscape: false,
				content: (ctx: ChoiceContext<boolean>) => (
					<CodexCliStatusContent
						{...ctx}
						providerId={newProviderId}
						providerName={displayName}
					/>
				),
			});
			if (saved) {
				manager.saveProviderSettings({
					...(existingSettings ?? {}),
					provider: newProviderId,
				});
			}
		} else {
			const { fields } = getProviderConfigFields(newProviderId);
			saved = await dialog.choice<boolean>({
				style: { maxHeight: termHeight - 2 },
				closeOnEscape: false,
				content: (ctx: ChoiceContext<boolean>) => (
					<ProviderConfigInputContent
						{...ctx}
						providerId={newProviderId}
						providerName={displayName}
						fields={fields}
						error={configureError}
						providerSettingsManager={manager}
					/>
				),
			});
		}
		if (!saved) return false;
		try {
			await withLoadingDialog(
				dialog,
				`正在验证 ${displayName}...`,
				async () => {
					await verifyThirdPartyConfig(manager, newProviderId);
				},
			);
			needsAuth = false;
		} catch (error) {
			configureError =
				error instanceof Error
					? error.message
					: "三方 API 验证失败，请检查接口地址和 API Key";
			needsAuth = true;
		}
	}
	try {
		await withLoadingDialog(
			dialog,
			`正在加载 ${displayName} 模型...`,
			async () => {
				const newSettings = manager.getProviderSettings(newProviderId);
				const newApiKey =
					getPersistedProviderApiKey(newProviderId, newSettings) ?? "";

				manager.saveProviderSettings(
					{
						...(newSettings ?? {}),
						provider: newProviderId,
					},
					{ setLastUsed: true },
				);

				config.providerId = newProviderId;
				config.apiKey = newApiKey;

				await refreshModelsForConfig(config, manager);
			},
		);
	} catch {
		return await runProviderChange(dialog, config, termHeight);
	}
	return true;
}

export function useModelSelector(opts: {
	dialog: DialogActions;
	config: Config;
	termHeight: number;
	onModelChange: () => Promise<void>;
	refocusTextarea: () => void;
}) {
	const { dialog, config, termHeight, onModelChange, refocusTextarea } = opts;

	const openModelSelector = useCallback(
		async (options?: OpenModelSelectorOptions) => {
			const handleCancel = async () => {
				if (options?.onCancel) {
					await options.onCancel();
					return;
				}
				refocusTextarea();
			};

			let modelOptions = buildModelOptions(
				config.knownModels as Record<string, Llms.ModelInfo>,
			);
			let providerDisplayName = config.providerId;

			const refreshProviderContext = async () => {
				modelOptions = buildModelOptions(
					config.knownModels as Record<string, Llms.ModelInfo>,
				);
				providerDisplayName = await getProviderDisplayName(config.providerId);
			};

			if (!options?.startWithProviderChange) {
				await withLoadingDialog(dialog, "正在加载模型...", async () => {
					await refreshCurrentProviderModels(config);
					await refreshProviderContext();
				});
			}

			const changeProvider = async (): Promise<boolean> => {
				const changed = await runProviderChange(
					dialog,
					config,
					termHeight,
				);
				if (changed) {
					await withLoadingDialog(dialog, "正在加载模型...", async () => {
						await refreshProviderContext();
					});
				}
				return changed;
			};

			if (options?.startWithProviderChange) {
				const changed = await changeProvider();
				if (!changed) {
					await handleCancel();
					return;
				}
			}

			let pickingModel = true;

			while (pickingModel) {
				if (config.providerId === "cline") {
					const clineResult = await dialog.choice<string>({
						style: { maxHeight: termHeight - 2 },
						content: (ctx: ChoiceContext<string>) => (
							<ClineModelSelectorDialogContent
								{...ctx}
								currentModel={config.modelId}
								currentProviderName={providerDisplayName}
								knownModels={config.knownModels as Record<string, unknown>}
								loadEntries={async () =>
									buildClineModelEntries(await fetchClineRecommendedModels())
								}
							/>
						),
					});
					if (!clineResult) {
						await handleCancel();
						return;
					}
					if (clineResult === CHANGE_PROVIDER_ACTION) {
						await changeProvider();
						continue;
					}
					if (clineResult === BROWSE_ALL_ACTION) {
						const browseResult = await dialog.choice<string>({
							style: { maxHeight: termHeight - 2 },
							content: (ctx: ChoiceContext<string>) => (
								<ModelSelectorContent
									{...ctx}
									currentModel={config.modelId}
									currentProviderName={providerDisplayName}
									models={modelOptions}
								/>
							),
						});
						if (!browseResult) continue;
						if (browseResult === CHANGE_PROVIDER_ACTION) {
							await changeProvider();
							continue;
						}
						config.modelId = browseResult;
						const browseModel = modelOptions.find(
							(m: ModelOption) => m.key === browseResult,
						);
						if (supportsReasoningForSelection(config, browseModel)) {
							const lvl: ThinkingLevel = config.reasoningEffort
								? (config.reasoningEffort as ThinkingLevel)
								: config.thinking
									? "medium"
									: "none";
							const pick = await dialog.choice<ThinkingLevel>({
								style: { maxHeight: termHeight - 2 },
								content: (ctx: ChoiceContext<ThinkingLevel>) => (
									<ThinkingLevelContent
										{...ctx}
										modelName={browseModel?.name ?? browseResult}
										currentLevel={lvl}
									/>
								),
							});
							if (pick !== undefined) {
								if (pick === "none") {
									config.thinking = false;
									config.reasoningEffort = undefined;
								} else {
									config.thinking = true;
									config.reasoningEffort = pick;
								}
							}
						}
						if (!supportsReasoningForSelection(config, browseModel)) {
							clearReasoningConfig(config);
						}
						pickingModel = false;
						continue;
					}

					config.modelId = clineResult;
					const selectedModel = modelOptions.find(
						(m: ModelOption) => m.key === clineResult,
					);
					if (supportsReasoningForSelection(config, selectedModel)) {
						const currentLevel: ThinkingLevel = config.reasoningEffort
							? (config.reasoningEffort as ThinkingLevel)
							: config.thinking
								? "medium"
								: "none";
						const thinkingLevel = await dialog.choice<ThinkingLevel>({
							style: { maxHeight: termHeight - 2 },
							content: (ctx: ChoiceContext<ThinkingLevel>) => (
								<ThinkingLevelContent
									{...ctx}
									modelName={selectedModel?.name ?? clineResult}
									currentLevel={currentLevel}
								/>
							),
						});
						if (thinkingLevel !== undefined) {
							if (thinkingLevel === "none") {
								config.thinking = false;
								config.reasoningEffort = undefined;
							} else {
								config.thinking = true;
								config.reasoningEffort = thinkingLevel;
							}
						}
					}
					if (!supportsReasoningForSelection(config, selectedModel)) {
						clearReasoningConfig(config);
					}
					pickingModel = false;
					continue;
				}

				const selectedKey = await dialog.choice<string>({
					style: { maxHeight: termHeight - 2 },
					content: (ctx: ChoiceContext<string>) => (
						<ModelSelectorContent
							{...ctx}
							currentModel={config.modelId}
							currentProviderName={providerDisplayName}
							models={modelOptions}
						/>
					),
				});
				if (!selectedKey) {
					await handleCancel();
					return;
				}

				if (selectedKey === CHANGE_PROVIDER_ACTION) {
					await changeProvider();
					continue;
				}

				config.modelId = selectedKey;

				const selectedModel = modelOptions.find(
					(m: ModelOption) => m.key === selectedKey,
				);
				if (!supportsReasoningForSelection(config, selectedModel)) {
					clearReasoningConfig(config);
					pickingModel = false;
					break;
				}

				const currentLevel: ThinkingLevel = config.reasoningEffort
					? (config.reasoningEffort as ThinkingLevel)
					: config.thinking
						? "medium"
						: "none";

				const thinkingLevel = await dialog.choice<ThinkingLevel>({
					style: { maxHeight: termHeight - 2 },
					content: (ctx: ChoiceContext<ThinkingLevel>) => (
						<ThinkingLevelContent
							{...ctx}
							modelName={selectedModel?.name ?? selectedKey}
							currentLevel={currentLevel}
						/>
					),
				});

				if (thinkingLevel === undefined) {
					continue;
				}

				if (thinkingLevel === "none") {
					config.thinking = false;
					config.reasoningEffort = undefined;
				} else {
					config.thinking = true;
					config.reasoningEffort = thinkingLevel;
				}
				pickingModel = false;
			}

			await withLoadingDialog(dialog, "正在应用模型...", async () => {
				await onModelChange();
			});
			refocusTextarea();
		},
		[dialog, config, termHeight, onModelChange, refocusTextarea],
	);

	return openModelSelector;
}
