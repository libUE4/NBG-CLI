import { ApiConfiguration, ModelInfo, openRouterDefaultModelId } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { getModeSpecificFields } from "@/components/settings/utils/providerUtils"

export function validateApiConfiguration(currentMode: Mode, apiConfiguration?: ApiConfiguration): string | undefined {
	if (apiConfiguration) {
		const {
			apiProvider,
			openAiModelId,
			requestyModelId,
			togetherModelId,
			ollamaModelId,
			lmStudioModelId,
			vsCodeLmModelSelector,
		} = getModeSpecificFields(apiConfiguration, currentMode)

		switch (apiProvider) {
			case "anthropic":
				if (!apiConfiguration.apiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "bedrock":
				if (!apiConfiguration.awsRegion) {
					return "请为 AWS Bedrock 选择区域。"
				}
				break
			case "openrouter":
				if (!apiConfiguration.openRouterApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "vertex":
				if (!apiConfiguration.vertexProjectId || !apiConfiguration.vertexRegion) {
					return "请提供有效的 Google Cloud Project ID 和区域。"
				}
				break
			case "gemini":
				if (!apiConfiguration.geminiApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "openai-native":
				if (!apiConfiguration.openAiNativeApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "deepseek":
				if (!apiConfiguration.deepSeekApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "xai":
				if (!apiConfiguration.xaiApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "qwen":
				if (!apiConfiguration.qwenApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "doubao":
				if (!apiConfiguration.doubaoApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "mistral":
				if (!apiConfiguration.mistralApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "cline":
				break
			case "openai-codex":
				// Authentication is handled via OAuth, not API key
				// Validation happens at runtime in the handler
				break
			case "openai":
				if (
					!apiConfiguration.openAiBaseUrl ||
					(!apiConfiguration.openAiApiKey && !apiConfiguration.azureIdentity) ||
					!openAiModelId
				) {
					return "请提供有效的 Base URL、API Key 和模型 ID。"
				}
				break
			case "requesty":
				if (!apiConfiguration.requestyApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "fireworks":
				if (!apiConfiguration.fireworksApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "together":
				if (!apiConfiguration.togetherApiKey || !togetherModelId) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "ollama":
				if (!ollamaModelId) {
					return "请提供有效的模型 ID。"
				}
				break
			case "lmstudio":
				if (!lmStudioModelId) {
					return "请提供有效的模型 ID。"
				}
				break
			case "vscode-lm":
				if (!vsCodeLmModelSelector) {
					return "请提供有效的模型选择器。"
				}
				break
			case "moonshot":
				if (!apiConfiguration.moonshotApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "nebius":
				if (!apiConfiguration.nebiusApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "asksage":
				if (!apiConfiguration.asksageApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "sambanova":
				if (!apiConfiguration.sambanovaApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "sapaicore":
				if (!apiConfiguration.sapAiCoreBaseUrl) {
					return "请提供有效的 Base URL，或选择其他提供方。"
				}
				if (!apiConfiguration.sapAiCoreClientId) {
					return "请提供有效的 Client ID，或选择其他提供方。"
				}
				if (!apiConfiguration.sapAiCoreClientSecret) {
					return "请提供有效的 Client Secret，或选择其他提供方。"
				}
				if (!apiConfiguration.sapAiCoreTokenUrl) {
					return "请提供有效的认证 URL，或选择其他提供方。"
				}
				break
			case "zai":
				if (!apiConfiguration.zaiApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "dify":
				if (!apiConfiguration.difyBaseUrl) {
					return "请提供有效的 Base URL，或选择其他提供方。"
				}
				if (!apiConfiguration.difyApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "minimax":
				if (!apiConfiguration.minimaxApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
			case "hicap":
				if (!apiConfiguration.hicapApiKey) {
					return "请提供有效的 API Key。"
				}
				break
			case "wandb":
				if (!apiConfiguration.wandbApiKey) {
					return "请提供有效的 API Key，或选择其他提供方。"
				}
				break
		}
	}
	return undefined
}

export function validateModelId(
	currentMode: Mode,
	apiConfiguration?: ApiConfiguration,
	openRouterModels?: Record<string, ModelInfo>,
	clineModels?: Record<string, ModelInfo>,
): string | undefined {
	if (apiConfiguration) {
		const { apiProvider, openRouterModelId, clineModelId } = getModeSpecificFields(apiConfiguration, currentMode)
		switch (apiProvider) {
			case "openrouter":
				const modelId = openRouterModelId || openRouterDefaultModelId // in case the user hasn't changed the model id, it will be undefined by default
				if (!modelId) {
					return "请提供模型 ID。"
				}
				if (openRouterModels && !Object.keys(openRouterModels).includes(modelId)) {
					// even if the model list endpoint failed, extensionstatecontext will always have the default model info
					return "你提供的模型 ID 不可用，请选择其他模型。"
				}
				break
			case "cline":
				const clineResolvedModelId = clineModelId || openRouterDefaultModelId
				if (!clineResolvedModelId) {
					return "请提供模型 ID。"
				}
				if (clineModels && !Object.keys(clineModels).includes(clineResolvedModelId)) {
					return "你提供的模型 ID 不可用，请选择其他模型。"
				}
				break
		}
	}
	return undefined
}
