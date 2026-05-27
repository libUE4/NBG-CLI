import {
	buildGatewayConfig,
	createGateway,
	MODEL_COLLECTIONS_BY_PROVIDER_ID,
	resolveProviderRegistrationSync,
} from "@cline/llms";
import type {
	AgentConfig,
	AgentModel,
	BasicLogger,
	ITelemetryService,
	ModelInfo,
} from "@cline/shared";
import type { ProviderConfig } from "./provider-settings";

export function resolveKnownModelsFromConfig(
	config: AgentConfig,
): Record<string, ModelInfo> | undefined {
	const pc = config.providerConfig as ProviderConfig | undefined;
	if (pc?.knownModels) {
		return pc.knownModels;
	}
	if (config.knownModels) {
		return config.knownModels;
	}
	return (
		MODEL_COLLECTIONS_BY_PROVIDER_ID[config.providerId]?.models ?? undefined
	);
}

export function createAgentModelFromConfig(
	config: AgentConfig,
	logger: BasicLogger | undefined,
	telemetry?: ITelemetryService,
): AgentModel {
	const pc = config.providerConfig as ProviderConfig | undefined;
	const baseProviderConfig =
		pc?.providerId === config.providerId ? pc : undefined;
	const normalizedProviderConfig: ProviderConfig = {
		...(baseProviderConfig ?? {}),
		providerId: config.providerId,
		modelId: config.modelId,
		apiKey: config.apiKey ?? baseProviderConfig?.apiKey,
		baseUrl: config.baseUrl ?? baseProviderConfig?.baseUrl,
		headers: config.headers ?? baseProviderConfig?.headers,
		knownModels: resolveKnownModelsFromConfig(config),
		maxOutputTokens: config.maxTokensPerTurn,
		reasoningEffort: config.reasoningEffort,
		thinkingBudgetTokens: config.thinkingBudgetTokens,
		thinking: config.thinking,
		logger,
		extensionContext: config.extensionContext,
	};
	const customProviderRegistration = resolveProviderRegistrationSync(
		normalizedProviderConfig,
	);
	return createGateway({
		providers: customProviderRegistration
			? [customProviderRegistration]
			: undefined,
		providerConfigs: [buildGatewayConfig(normalizedProviderConfig)],
		logger,
		telemetry:
			telemetry ?? config.telemetry ?? config.extensionContext?.telemetry,
	}).createAgentModel(
		{
			providerId: normalizedProviderConfig.providerId,
			modelId: normalizedProviderConfig.modelId,
		},
		{ maxTokens: normalizedProviderConfig.maxOutputTokens },
	);
}
