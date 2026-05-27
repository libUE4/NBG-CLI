import {
	captureProviderConfigured,
	getLocalProviderModels,
	getProviderConfigFields,
	listLocalProviders,
	type ProviderConfigFieldKey,
	type ProviderConfigFields,
	ProviderSettingsManager,
	refreshProviderModelsFromSource,
	resolveProviderConfig,
	saveLocalProviderSettings,
} from "@cline/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type ClaudeCodeLoginSession,
	type CodexCliStatus,
	checkLocalCliInstalled,
	getLocalCliProviderInfo,
	isLocalCliProvider,
	startClaudeCodeLogin,
} from "../../../utils/codex-cli";
import { getPersistedProviderApiKey } from "../../../utils/provider-auth";
import { getCliTelemetryService } from "../../../utils/telemetry";
import {
	loadThirdPartyProviderModels,
	THIRD_PARTY_PROVIDER_ID,
	THIRD_PARTY_PROVIDER_NAME,
} from "../../../utils/third-party-api";
import {
	buildClineModelEntries,
	type ClineModelPickerEntry,
	useClineRecommendedModels,
} from "../../components/model-selector/cline-model-picker";
import {
	type SearchableItem,
	useSearchableList,
} from "../../components/searchable-list";
import { palette } from "../../palette";
import { getProviderSection } from "../../utils/provider-sections";
import {
	getDefaultAwsRegion,
	resolveProviderConfigAwsRegion,
	updateProviderConfigValue,
	type ProviderConfigValues,
} from "../../utils/provider-config-values";
import {
	isOnboardingOAuthProviderId,
	type OnboardingOAuthProviderId,
	runDeviceCodeAuthFlow,
	runOAuthAuthFlow,
} from "./auth";
import { FIELD_ORDER } from "./fields";
import { useOnboardingKeyboard } from "./keyboard";
import {
	type ModelEntry,
	type OnboardingResult,
	type OnboardingStep,
	type ProviderEntry,
	type ReasoningEffort,
	type ThinkingLevel,
	toModelEntriesFromKnownModels,
	toModelEntry,
	toProviderEntry,
} from "./model";

const CUSTOM_MODEL_ID_ACTION = "__custom_model_id__";

export interface OnboardingControllerProps {
	onComplete: (result: OnboardingResult) => void;
	onExit: () => void;
	providerSettingsManager?: ProviderSettingsManager;
}

export function useOnboardingController(props: OnboardingControllerProps) {
	const { onComplete } = props;
	const providerSettingsManager = useMemo(
		() => props.providerSettingsManager ?? new ProviderSettingsManager(),
		[props.providerSettingsManager],
	);
	const [step, setStep] = useState<OnboardingStep>("menu");
	const [menuSelected, setMenuSelected] = useState(0);
	const [oauthProvider, setOauthProvider] = useState("");
	const [authStatus, setAuthStatus] = useState("");
	const [authUrl, setAuthUrl] = useState("");
	const [authError, setAuthError] = useState("");
	const [activeProviderId, setActiveProviderId] = useState("");
	const [activeProviderName, setActiveProviderName] = useState("");
	const [byoFields, setByoFields] = useState<ProviderConfigFields["fields"]>(
		{},
	);
	const [byoDescription, setByoDescription] = useState<string | undefined>();
	const [byoError, setByoError] = useState("");
	const [byoSaving, setByoSaving] = useState(false);
	const [byoValues, setByoValues] = useState<ProviderConfigValues>({});
	const [byoFocusedField, setByoFocusedField] =
		useState<ProviderConfigFieldKey>("apiKey");
	const [codexCliStatus, setCodexCliStatus] = useState<
		CodexCliStatus | undefined
	>();
	const [codexCliChecking, setCodexCliChecking] = useState(false);
	const [localCliAuthUrl, setLocalCliAuthUrl] = useState("");
	const [localCliAuthStatus, setLocalCliAuthStatus] = useState("");
	const [localCliAuthError, setLocalCliAuthError] = useState("");
	const [localCliAuthCode, setLocalCliAuthCode] = useState("");
	const [localCliAuthRunning, setLocalCliAuthRunning] = useState(false);
	const localCliLoginRef = useRef<ClaudeCodeLoginSession | undefined>(
		undefined,
	);
	const authAbortRef = useRef(false);

	// Device code flow
	const [deviceUserCode, setDeviceUserCode] = useState("");
	const [deviceVerifyUrl, setDeviceVerifyUrl] = useState("");
	const [deviceStatus, setDeviceStatus] = useState("");
	const [deviceError, setDeviceError] = useState("");
	const deviceAbortRef = useRef(false);

	// Provider catalog
	const [providers, setProviders] = useState<ProviderEntry[]>([]);
	const [providersLoading, setProvidersLoading] = useState(true);

	useEffect(() => {
		listLocalProviders(providerSettingsManager)
			.then(({ providers: list }) => {
				setProviders(
					list
						.filter((provider) => provider.id === THIRD_PARTY_PROVIDER_ID)
						.map((provider) =>
							toProviderEntry({
								...provider,
								name: THIRD_PARTY_PROVIDER_NAME,
							}),
						),
				);
			})
			.catch(() => {})
			.finally(() => setProvidersLoading(false));
	}, [providerSettingsManager]);

	const providerItems: SearchableItem[] = useMemo(
		() =>
			providers
				.filter((p) => !p.isOAuth && !p.isLocalAuth)
				.map((p) => ({
					key: p.id,
					label: p.name,
					section: getProviderSection(p),
					searchText: `${p.name} ${p.id}`,
					rightLabel: p.hasAuth ? "\u25cf" : undefined,
					rightLabelColor: palette.success,
				})),
		[providers],
	);

	const providerList = useSearchableList(providerItems);

	// Model catalog for selected provider
	const [modelEntries, setModelEntries] = useState<ModelEntry[]>([]);
	const [modelsLoading, setModelsLoading] = useState(false);
	const [modelsDefaultId, setModelsDefaultId] = useState("");
	const [customModelId, setCustomModelId] = useState("");
	const [customModelError, setCustomModelError] = useState("");

	const modelItems: SearchableItem[] = useMemo(
		() =>
			modelEntries.map((m) => ({
				key: m.id,
				label: m.name,
				searchText: `${m.name} ${m.id}`,
				rightLabel: m.id === modelsDefaultId ? "（默认）" : undefined,
				rightLabelColor: "gray",
			})),
		[modelEntries, modelsDefaultId],
	);

	const createCustomModelItem = useCallback(
		(_search: string, filteredItems: SearchableItem[]) => {
			if (filteredItems.some((item) => item.key === CUSTOM_MODEL_ID_ACTION)) {
				return undefined;
			}
			return {
				key: CUSTOM_MODEL_ID_ACTION,
				label: "创建自定义模型 ID",
				detail: "手动输入",
				searchText: "create custom model id manual entry 自定义 模型 手动 输入",
			} satisfies SearchableItem;
		},
		[],
	);

	const modelList = useSearchableList(modelItems, createCustomModelItem);
	const setModelListSelected = modelList.setSelected;

	const syncModelListSelection = useCallback(
		(entries: ModelEntry[], defaultModelId: string) => {
			const index = entries.findIndex((entry) => entry.id === defaultModelId);
			setModelListSelected(index >= 0 ? index : 0);
		},
		[setModelListSelected],
	);

	// Cline featured model picker
	const recommended = useClineRecommendedModels();
	const clineEntries: ClineModelPickerEntry[] = useMemo(
		() => (recommended.data ? buildClineModelEntries(recommended.data) : []),
		[recommended.data],
	);
	const [clineModelSelected, setClineModelSelected] = useState(0);
	const [clineModelReasoningIds, setClineModelReasoningIds] = useState<
		Set<string>
	>(new Set());
	const [clineKnownModels, setClineKnownModels] = useState<
		Record<string, unknown> | undefined
	>(undefined);

	useEffect(() => {
		getLocalProviderModels("cline")
			.then(({ models }) => {
				const ids = new Set<string>();
				for (const m of models) {
					if (m.supportsReasoning) ids.add(m.id);
				}
				setClineModelReasoningIds(ids);
			})
			.catch(() => {});
		resolveProviderConfig("cline")
			.then((resolved) => {
				if (resolved?.knownModels) setClineKnownModels(resolved.knownModels);
			})
			.catch(() => {});
	}, []);

	// Thinking level
	const [thinkingSelected, setThinkingSelected] = useState(0);
	const [selectedModelName, setSelectedModelName] = useState("");
	const [selectedModelId, setSelectedModelId] = useState("");
	const [selectedThinking, setSelectedThinking] = useState(false);
	const [selectedReasoningEffort, setSelectedReasoningEffort] = useState<
		ReasoningEffort | undefined
	>(undefined);

	const loadModelsForProvider = useCallback(
		async (providerId: string): Promise<ModelEntry[]> => {
			setModelsLoading(true);
			setModelEntries([]);
			try {
				const settings =
					providerSettingsManager.getProviderSettings(providerId);
				if (providerId === THIRD_PARTY_PROVIDER_ID) {
					const baseUrl = settings?.baseUrl?.trim();
					if (!baseUrl) throw new Error("请输入三方接口地址");
					const { models, defaultModelId } = await loadThirdPartyProviderModels(
						providerSettingsManager,
					);
					const entries = models.map(toModelEntry);
					setModelsDefaultId(defaultModelId);
					setModelEntries(entries);
					syncModelListSelection(entries, defaultModelId);
					return entries;
				} else {
					await refreshProviderModelsFromSource(
						providerSettingsManager,
						providerId,
					);
				}
				const providerConfig = providerSettingsManager.getProviderConfig(
					providerId,
					{ includeKnownModels: false },
				);
				const resolved = await resolveProviderConfig(
					providerId,
					{
						loadLatestOnInit: true,
						loadPrivateOnAuth: true,
						failOnError: false,
					},
					providerConfig,
				);
				const resolvedModels = toModelEntriesFromKnownModels(
					resolved?.knownModels,
				);
				if (resolvedModels.length > 0) {
					setModelsDefaultId(resolved?.modelId ?? "");
					setModelEntries(resolvedModels);
					syncModelListSelection(resolvedModels, resolved?.modelId ?? "");
					return resolvedModels;
				}
				const { models } = await getLocalProviderModels(
					providerId,
					providerConfig,
				);
				const entries = models.map(toModelEntry);
				setModelEntries(entries);
				syncModelListSelection(entries, "");
				return entries;
			} finally {
				setModelsLoading(false);
			}
		},
		[providerSettingsManager, syncModelListSelection],
	);

	const transitionToModelPicker = useCallback(
		(providerId: string) => {
			setActiveProviderId(providerId);
			const provider = providers.find((p) => p.id === providerId);
			setActiveProviderName(provider?.name ?? providerId);
			setModelsDefaultId(provider?.defaultModelId ?? "");
			if (providerId === "cline") {
				setClineModelSelected(0);
				setStep("cline_model");
			} else if (providerId === THIRD_PARTY_PROVIDER_ID) {
				setStep("model_picker");
				loadModelsForProvider(providerId);
			} else {
				setStep("model_picker");
				loadModelsForProvider(providerId);
			}
		},
		[providers, loadModelsForProvider, providerSettingsManager],
	);

	const resetAuth = useCallback(() => {
		setAuthStatus("");
		setAuthUrl("");
		setAuthError("");
		authAbortRef.current = false;
	}, []);

	const startDeviceCodeFlow = useCallback(
		(providerId: OnboardingOAuthProviderId) => {
			deviceAbortRef.current = false;
			setDeviceUserCode("");
			setDeviceVerifyUrl("");
			setDeviceError("");
			setDeviceStatus("正在请求设备验证码...");
			setOauthProvider(providerId);
			setStep("device_code");

			runDeviceCodeAuthFlow({
				providerId,
				providerSettingsManager,
				isAborted: () => deviceAbortRef.current,
				setUserCode: setDeviceUserCode,
				setVerifyUrl: setDeviceVerifyUrl,
				setStatus: setDeviceStatus,
				setError: setDeviceError,
				onComplete: transitionToModelPicker,
				telemetry: getCliTelemetryService(),
			});
		},
		[providerSettingsManager, transitionToModelPicker],
	);

	const startOAuthFlow = useCallback(
		(providerId: OnboardingOAuthProviderId) => {
			if (providerId === "cline") {
				startDeviceCodeFlow(providerId);
				return;
			}

			resetAuth();
			setOauthProvider(providerId);
			setStep("oauth_pending");
			setAuthStatus("正在打开浏览器...");

			runOAuthAuthFlow({
				providerId,
				providerSettingsManager,
				isAborted: () => authAbortRef.current,
				setStatus: setAuthStatus,
				setAuthUrl,
				setError: setAuthError,
				onComplete: transitionToModelPicker,
				telemetry: getCliTelemetryService(),
			});
		},
		[
			providerSettingsManager,
			resetAuth,
			transitionToModelPicker,
			startDeviceCodeFlow,
		],
	);

	const refreshCodexCliStatus = useCallback(
		(providerId = activeProviderId) => {
			setCodexCliStatus(undefined);
			setCodexCliChecking(true);
			return checkLocalCliInstalled(providerId)
				.then((status) => {
					setCodexCliStatus(status);
					return status;
				})
				.catch((error: unknown) => {
					const status: CodexCliStatus = {
						installed: false,
						reason: error instanceof Error ? error.message : String(error),
					};
					setCodexCliStatus(status);
					return status;
				})
				.finally(() => setCodexCliChecking(false));
		},
		[activeProviderId],
	);

	const cancelLocalCliAuth = useCallback(() => {
		localCliLoginRef.current?.cancel();
		localCliLoginRef.current = undefined;
		setLocalCliAuthRunning(false);
		setLocalCliAuthCode("");
	}, []);

	const startLocalCliAuth = useCallback(
		(providerId = activeProviderId) => {
			if (providerId !== "claude-code") return;
			localCliLoginRef.current?.cancel();
			setLocalCliAuthUrl("");
			setLocalCliAuthError("");
			setLocalCliAuthCode("");
			setLocalCliAuthRunning(true);
			setLocalCliAuthStatus("正在启动 Claude 官方验证...");
			localCliLoginRef.current = startClaudeCodeLogin({
				onUrl: (url) => {
					setLocalCliAuthUrl(url);
				},
				onStatus: setLocalCliAuthStatus,
				onError: (message) => {
					localCliLoginRef.current = undefined;
					setLocalCliAuthRunning(false);
					setLocalCliAuthError(message);
					setLocalCliAuthStatus("Claude 官方验证失败");
					refreshCodexCliStatus("claude-code");
				},
				onDone: () => {
					localCliLoginRef.current = undefined;
					setLocalCliAuthRunning(false);
					setLocalCliAuthCode("");
					setLocalCliAuthStatus("Claude 官方验证成功，正在重新检查...");
					refreshCodexCliStatus("claude-code");
				},
			});
		},
		[activeProviderId, refreshCodexCliStatus],
	);

	const submitLocalCliAuthCode = useCallback(() => {
		const code = localCliAuthCode.trim();
		if (!code) return;
		localCliLoginRef.current?.submitCode(code);
		setLocalCliAuthCode("");
		setLocalCliAuthStatus("已提交授权码，正在等待 Claude Code 确认...");
	}, [localCliAuthCode]);

	const selectProvider = useCallback(
		(providerId: string) => {
			if (providerId === "byo") {
				const config = getProviderConfigFields(THIRD_PARTY_PROVIDER_ID);
				const existing = providerSettingsManager.getProviderSettings(
					THIRD_PARTY_PROVIDER_ID,
				);
				setActiveProviderId(THIRD_PARTY_PROVIDER_ID);
				setActiveProviderName(THIRD_PARTY_PROVIDER_NAME);
				setByoFields({
					baseUrl: {
						label: "三方接口地址",
						placeholder: "https://api.example.com/v1",
						defaultValue: config.fields.baseUrl?.defaultValue,
					},
					apiKey: {
						label: "API Key",
						placeholder: "sk-...",
					},
				});
				setByoDescription(
					"填写 OpenAI 兼容接口地址和 API Key。提交后会立即获取模型列表。",
				);
				setByoValues({
					baseUrl:
						existing?.baseUrl?.trim() ??
						config.fields.baseUrl?.defaultValue ??
						"",
					apiKey: existing?.apiKey?.trim() ?? "",
				});
				setByoFocusedField("baseUrl");
				setByoError("");
				setByoSaving(false);
				setStep("byo_apikey");
				return;
			}
			if (isLocalCliProvider(providerId)) {
				const provider = providers.find((p) => p.id === providerId);
				const cliInfo = getLocalCliProviderInfo(providerId);
				setActiveProviderId(providerId);
				setActiveProviderName(provider?.name ?? cliInfo.displayName);
				setCodexCliStatus(undefined);
				setLocalCliAuthUrl("");
				setLocalCliAuthError("");
				setLocalCliAuthCode("");
				setLocalCliAuthStatus("");
				setLocalCliAuthRunning(false);
				setStep("codex_cli_setup");
				refreshCodexCliStatus(providerId).then((status) => {
					if (
						providerId === "claude-code" &&
						status.installed === false &&
						status.authRequired
					) {
						startLocalCliAuth(providerId);
					}
				});
				return;
			}
			const provider = providers.find((p) => p.id === providerId);
			if (!provider) return;
			if (provider.isOAuth) {
				if (isOnboardingOAuthProviderId(provider.id)) {
					startOAuthFlow(provider.id);
				}
				return;
			}
			if (provider.isLocalAuth) {
				setActiveProviderId(provider.id);
				setActiveProviderName(provider.name);
				setCodexCliStatus(undefined);
				setLocalCliAuthUrl("");
				setLocalCliAuthError("");
				setLocalCliAuthCode("");
				setLocalCliAuthStatus("");
				setLocalCliAuthRunning(false);
				setStep("codex_cli_setup");
				refreshCodexCliStatus(provider.id).then((status) => {
					if (
						provider.id === "claude-code" &&
						status.installed === false &&
						status.authRequired
					) {
						startLocalCliAuth(provider.id);
					}
				});
				return;
			}
			const config = getProviderConfigFields(provider.id);
			setActiveProviderId(provider.id);
			setActiveProviderName(provider.name);
			setByoFields(config.fields);
			setByoDescription(config.description);
			setByoError("");
			setByoSaving(false);

			// Build initial values from existing settings
			const existing = providerSettingsManager.getProviderSettings(provider.id);
			const initialValues: ProviderConfigValues = {};
			if (config.fields.baseUrl) {
				initialValues.baseUrl =
					existing?.baseUrl?.trim() ??
					config.fields.baseUrl?.defaultValue ??
					"";
			}
			if (config.fields.awsRegion) {
				const existingProfile = existing?.aws?.profile?.trim() ?? "";
				initialValues.awsRegion =
					existing?.aws?.region?.trim() || getDefaultAwsRegion(existingProfile);
			}
			if (config.fields.apiKey) {
				initialValues.apiKey = existing?.apiKey?.trim() ?? "";
			}
			if (config.fields.awsProfile) {
				initialValues.awsProfile = existing?.aws?.profile?.trim() ?? "";
			}
			setByoValues(initialValues);

			// Focus the first visible field
			const firstField = FIELD_ORDER.find(
				(k) => config.fields[k] !== undefined,
			);
			setByoFocusedField(firstField ?? "apiKey");
			setStep("byo_apikey");
		},
		[
			providers,
			startOAuthFlow,
			refreshCodexCliStatus,
			startLocalCliAuth,
			providerSettingsManager,
		],
	);

	const saveCodexCliConfig = useCallback(() => {
		if (!codexCliStatus?.installed) {
			return;
		}
		cancelLocalCliAuth();
		saveLocalProviderSettings(providerSettingsManager, {
			providerId: activeProviderId,
		});
		transitionToModelPicker(activeProviderId);
	}, [
		activeProviderId,
		cancelLocalCliAuth,
		codexCliStatus,
		providerSettingsManager,
		transitionToModelPicker,
	]);

	const saveByoConfig = useCallback(async () => {
		const apiKey = byoValues.apiKey?.trim();
		const baseUrl = byoValues.baseUrl?.trim();
		const awsProfile = byoValues.awsProfile?.trim();
		const hasAwsFields = byoFields.awsRegion || byoFields.awsProfile;
		if (activeProviderId === THIRD_PARTY_PROVIDER_ID) {
			if (!baseUrl) {
				setByoError("请输入三方接口地址");
				setByoFocusedField("baseUrl");
				return;
			}
			if (!apiKey) {
				setByoError("请输入 API Key");
				setByoFocusedField("apiKey");
				return;
			}
		}
		setByoSaving(true);
		setByoError("");

		saveLocalProviderSettings(providerSettingsManager, {
			providerId: activeProviderId,
			apiKey: byoFields.apiKey ? apiKey : undefined,
			baseUrl: byoFields.baseUrl ? baseUrl : undefined,
			aws: hasAwsFields
				? {
						region: resolveProviderConfigAwsRegion(byoValues),
						authentication: apiKey ? "api-key" : "profile",
						profile: apiKey ? undefined : awsProfile || undefined,
					}
				: undefined,
		});
		captureProviderConfigured(getCliTelemetryService(), activeProviderId);
		if (activeProviderId === THIRD_PARTY_PROVIDER_ID) {
			try {
				const models = await loadModelsForProvider(activeProviderId);
				if (models.length === 0) {
					const existing = providerSettingsManager.getProviderSettings(
						activeProviderId,
					);
					setCustomModelId(existing?.model?.trim() ?? "");
					setCustomModelError("自动获取模型失败，可手动输入模型 ID 继续。");
					setStep("custom_model_id");
					return;
				}
				setStep("model_picker");
			} catch (error) {
				const message =
					error instanceof Error
						? error.message
						: "获取模型失败，请检查三方接口地址和 API Key";
				const existing = providerSettingsManager.getProviderSettings(
					activeProviderId,
				);
				setCustomModelId(existing?.model?.trim() ?? "");
				setCustomModelError(`自动获取模型失败，可手动输入模型 ID 继续。${message}`);
				setStep("custom_model_id");
			} finally {
				setByoSaving(false);
			}
			return;
		}
		setByoSaving(false);
		transitionToModelPicker(activeProviderId);
	}, [
		byoValues,
		byoFields,
		activeProviderId,
		providerSettingsManager,
		transitionToModelPicker,
		loadModelsForProvider,
	]);

	const completeModelSelection = useCallback(
		(modelId: string) => {
			const existing =
				providerSettingsManager.getProviderSettings(activeProviderId);
			providerSettingsManager.saveProviderSettings(
				{ ...(existing ?? { provider: activeProviderId }), model: modelId },
				{ setLastUsed: true },
			);
			setSelectedModelId(modelId);
			const entry = modelEntries.find((m) => m.id === modelId);
			const supportsReasoning =
				entry?.supportsReasoning === true ||
				activeProviderId === THIRD_PARTY_PROVIDER_ID;
			if (supportsReasoning) {
				setSelectedModelName(entry?.name ?? modelId);
				setThinkingSelected(0);
				setStep("thinking_level");
			} else {
				setStep("done");
			}
		},
		[activeProviderId, modelEntries, providerSettingsManager],
	);

	const selectModelItem = useCallback(
		(item: SearchableItem | undefined) => {
			if (!item) return;
			if (item.key === CUSTOM_MODEL_ID_ACTION) {
				setCustomModelId("");
				setCustomModelError("");
				setStep("custom_model_id");
				return;
			}
			completeModelSelection(item.key);
		},
		[completeModelSelection],
	);

	const saveModelSelection = useCallback(() => {
		selectModelItem(modelList.selectedItem);
	}, [modelList.selectedItem, selectModelItem]);

	const saveCustomModelId = useCallback(() => {
		const modelId = customModelId.trim();
		if (!modelId) {
			setCustomModelError("请输入模型 ID");
			return;
		}
		completeModelSelection(modelId);
	}, [customModelId, completeModelSelection]);

	const saveClineModelSelection = useCallback(
		(modelId: string, modelName: string) => {
			const existing =
				providerSettingsManager.getProviderSettings(activeProviderId);
			providerSettingsManager.saveProviderSettings(
				{
					...(existing ?? { provider: activeProviderId }),
					model: modelId,
				},
				{ setLastUsed: true },
			);
			setSelectedModelId(modelId);
			if (clineModelReasoningIds.has(modelId)) {
				setSelectedModelName(modelName);
				setThinkingSelected(0);
				setStep("thinking_level");
			} else {
				setStep("done");
			}
		},
		[activeProviderId, clineModelReasoningIds, providerSettingsManager],
	);

	const saveThinkingLevel = useCallback(
		(level: ThinkingLevel) => {
			const existing =
				providerSettingsManager.getProviderSettings(activeProviderId);
			if (level === "none") {
				providerSettingsManager.saveProviderSettings({
					...(existing ?? { provider: activeProviderId }),
					reasoning: { enabled: false },
				});
				setSelectedThinking(false);
				setSelectedReasoningEffort(undefined);
			} else {
				providerSettingsManager.saveProviderSettings({
					...(existing ?? { provider: activeProviderId }),
					reasoning: { enabled: true, effort: level },
				});
				setSelectedThinking(true);
				setSelectedReasoningEffort(level);
			}
			setStep("done");
		},
		[activeProviderId, providerSettingsManager],
	);

	useEffect(() => {
		if (step !== "done") return undefined;
		const timer = setTimeout(() => {
			const providerSettings =
				providerSettingsManager.getProviderSettings(activeProviderId);
			onComplete({
				providerId: activeProviderId,
				modelId: selectedModelId,
				apiKey: getPersistedProviderApiKey(activeProviderId, providerSettings),
				thinking: selectedThinking,
				reasoningEffort: selectedReasoningEffort,
			});
		}, 500);
		return () => clearTimeout(timer);
	}, [
		step,
		onComplete,
		activeProviderId,
		selectedModelId,
		selectedThinking,
		selectedReasoningEffort,
		providerSettingsManager,
	]);

	useOnboardingKeyboard({
		step,
		onExit: props.onExit,
		oauthProvider,
		activeProviderId,
		menuSelected,
		providerList,
		modelList,
		clineEntries,
		clineModelSelected,
		thinkingSelected,
		setStep,
		setMenuSelected,
		resetByoFields: () => {
			setByoFields({});
			setByoValues({});
			setByoDescription(undefined);
		},
		byoFields,
		byoFocusedField,
		setByoFocusedField,
		setDeviceUserCode,
		setDeviceVerifyUrl,
		setDeviceError,
		setDeviceStatus,
		setClineModelSelected,
		setThinkingSelected,
		abortOAuth: () => {
			authAbortRef.current = true;
		},
		abortDeviceCode: () => {
			deviceAbortRef.current = true;
		},
		cancelLocalCliAuth,
		resetAuth,
		refreshCodexCliStatus,
		startLocalCliAuth,
		submitLocalCliAuthCode,
		startOAuthFlow,
		startDeviceCodeFlow,
		selectProvider,
		loadModelsForProvider,
		saveClineModelSelection,
		saveCodexCliConfig,
		saveByoConfig,
		saveModelSelection,
		saveThinkingLevel,
	});

	return {
		activeProviderId,
		activeProviderName,
		authError,
		authStatus,
		authUrl,
		byoDescription,
		byoError,
		byoFields,
		byoFocusedField,
		byoSaving,
		byoValues,
		codexCliChecking,
		codexCliStatus,
		handleLocalCliAuthCodeInput: (value: string) => {
			setLocalCliAuthCode(value);
			setLocalCliAuthError("");
		},
		clineEntries,
		clineKnownModels,
		clineModelSelected,
		deviceError,
		deviceStatus,
		deviceUserCode,
		deviceVerifyUrl,
		customModelError,
		customModelId,
		customModelTitle:
			activeProviderId === THIRD_PARTY_PROVIDER_ID
				? "设置模型 ID"
				: "创建自定义模型 ID",
		handleByoFieldInput: (field: ProviderConfigFieldKey, value: string) => {
			setByoError("");
			setByoValues((prev) => updateProviderConfigValue(prev, field, value));
		},
		handleCustomModelIdInput: (value: string) => {
			setCustomModelId(value);
			setCustomModelError("");
		},
		handleModelItemSelect: selectModelItem,
		menuSelected,
		modelItems,
		modelList,
		modelsLoading,
		localCliAuthCode,
		localCliAuthError,
		localCliAuthRunning,
		localCliAuthStatus,
		localCliAuthUrl,
		oauthProvider,
		providerList,
		providersLoading,
		recommendedLoading: recommended.loading,
		saveByoConfig,
		saveCodexCliConfig,
		saveCustomModelId,
		setByoFocusedField,
		submitLocalCliAuthCode,
		selectedModelName,
		step,
		thinkingSelected,
	};
}
