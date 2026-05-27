import type {
	AgentMessage,
	AgentModelEvent,
	AgentModelFinishReason,
	GatewayProviderContext,
	GatewayProviderFactory,
	GatewayResolvedProviderConfig,
	GatewayStreamRequest,
} from "@cline/shared";
import {
	type AiSdkFormatterMessage,
	type AiSdkFormatterPart,
	captureSdkError,
	formatMessagesForAiSdk,
	sanitizeSurrogates,
} from "@cline/shared";
import { jsonSchema, streamText } from "ai";
import { nanoid } from "nanoid";
import { z } from "zod";
import { extractErrorMessage } from "./format";
import { isAnthropicCompatibleModel, resolveModelFamily } from "./model-facts";
import {
	applyPromptCacheToLastTextPart,
	shouldApplyPromptCache,
} from "./routing/anthropic-compatible";
import {
	type AiSdkProviderOptionsTarget,
	composeAiSdkProviderOptions,
} from "./routing/provider-options";
import type {
	AiSdkStreamPart,
	AiSdkStreamResult,
	AiSdkStreamTotalUsage,
	AiSdkStreamUsage,
	ProviderFactoryResult,
} from "./vendors/types";

interface GatewayNormalizedUsage {
	inputTokens: number;
	outputTokens: number;
	cacheReadTokens: number;
	cacheWriteTokens: number;
	totalCost?: number;
}
type ProviderModuleKind = AiSdkProviderOptionsTarget;

function buildCachedAiSdkMessages(
	request: GatewayStreamRequest,
	context: GatewayProviderContext,
	systemPrompt?: string,
) {
	const aiMessages = toAiSdkMessages(request.messages, systemPrompt) as Array<
		Record<string, unknown>
	>;
	const includeAnthropic = isAnthropicCompatibleModel({
		modelId: request.modelId,
		family: resolveModelFamily(context),
	});

	for (let i = aiMessages.length - 1; i >= 0; i--) {
		if (aiMessages[i]?.role === "user") {
			applyPromptCacheToLastTextPart(
				aiMessages[i],
				request.providerId,
				includeAnthropic,
			);
			break;
		}
	}

	return aiMessages;
}

async function ensureGatewayLangfuseTelemetry(
	providerId: string,
): Promise<boolean> {
	try {
		const runtime = await import("../services/langfuse-telemetry");
		return runtime.ensureLangfuseTelemetry(providerId);
	} catch {
		return false;
	}
}

function toAiSdkMessages(
	messages: readonly AgentMessage[],
	systemPrompt?: string,
) {
	const normalizedMessages: AiSdkFormatterMessage[] = [];

	for (const message of messages) {
		const content: AiSdkFormatterPart[] = [];
		for (const part of message.content) {
			if (part.type === "text") {
				content.push({ type: "text", text: sanitizeSurrogates(part.text) });
				continue;
			}

			if (part.type === "reasoning") {
				const metadata = part.metadata as Record<string, unknown> | undefined;
				const signature = metadata?.signature;
				const redactedData =
					metadata?.redactedData ?? metadata?.redacted_data ?? metadata?.data;
				const thoughtSignature =
					metadata?.thoughtSignature ?? metadata?.thought_signature;
				const providerOptions: Record<string, Record<string, unknown>> = {};
				const anthropicReasoning: Record<string, unknown> = {};
				if (typeof signature === "string") {
					anthropicReasoning.signature = signature;
				}
				if (typeof redactedData === "string") {
					anthropicReasoning.redactedData = redactedData;
				}
				if (Object.keys(anthropicReasoning).length > 0) {
					providerOptions.anthropic = anthropicReasoning;
					providerOptions.bedrock = anthropicReasoning;
				}
				if (typeof thoughtSignature === "string") {
					providerOptions.google = { thoughtSignature };
				}
				content.push({
					type: "reasoning",
					text: sanitizeSurrogates(part.text),
					...(Object.keys(providerOptions).length > 0
						? { providerOptions }
						: {}),
				});
				continue;
			}

			if (part.type === "file") {
				content.push({
					type: "file",
					path: part.path,
					content: part.content,
				});
				continue;
			}

			if (part.type === "image") {
				content.push({
					type: "image",
					image: part.image,
					mediaType: part.mediaType,
				});
				continue;
			}

			if (part.type === "tool-call") {
				const metadata = part.metadata as Record<string, unknown> | undefined;
				const thoughtSignature =
					metadata?.thoughtSignature ?? metadata?.thought_signature;
				content.push({
					type: "tool-call",
					toolCallId: part.toolCallId,
					toolName: part.toolName,
					input: part.input,
					...(typeof thoughtSignature === "string"
						? {
								providerOptions: {
									google: { thoughtSignature },
								},
							}
						: {}),
				});
				continue;
			}

			if (part.type === "tool-result") {
				content.push({
					type: "tool-result",
					toolCallId: part.toolCallId,
					toolName: part.toolName,
					output: part.output,
					isError: part.isError ?? false,
				});
			}
		}

		if (content.length > 0) {
			normalizedMessages.push({ role: message.role, content });
		} else if (message.role === "user" || message.role === "assistant") {
			normalizedMessages.push({ role: message.role, content: "" });
		}
	}

	return formatMessagesForAiSdk(systemPrompt, normalizedMessages, {
		assistantToolCallArgKey: "input",
	});
}

function toAiSdkTools(
	request: GatewayStreamRequest,
): Record<string, unknown> | undefined {
	if (!request.tools?.length) {
		return undefined;
	}

	return Object.fromEntries(
		request.tools.map((definition) => [
			definition.name,
			{
				description: definition.description,
				inputSchema: jsonSchema(
					normalizeAiSdkToolInputSchema(definition.inputSchema),
					{
						validate: async (value) => {
							const result = await z
								.fromJSONSchema(definition.inputSchema)
								.safeParseAsync(value);
							return result.success
								? { success: true, value: result.data }
								: { success: false, error: result.error };
						},
					},
				) as never,
			} as unknown,
		]),
	);
}

function normalizeAiSdkToolInputSchema(
	inputSchema: Record<string, unknown>,
): Record<string, unknown> {
	if (inputSchema.type === "object") {
		return inputSchema;
	}

	return {
		type: "object",
		...inputSchema,
	};
}

function providerDisablesExternalToolExecution(
	context: GatewayProviderContext,
): boolean {
	return context.provider.capabilities?.includes("provider-tools") ?? false;
}

function mergeToolCallMetadata(
	current: unknown,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	if (!current || typeof current !== "object" || Array.isArray(current)) {
		return patch;
	}
	return {
		...(current as Record<string, unknown>),
		...patch,
	};
}

function buildToolCallMetadata(input: {
	metadata: unknown;
	request: GatewayStreamRequest;
	context: GatewayProviderContext;
}): Record<string, unknown> {
	return mergeToolCallMetadata(input.metadata, {
		toolSource: {
			providerId: input.request.providerId,
			modelId: input.request.modelId,
			executionMode: providerDisablesExternalToolExecution(input.context)
				? "provider"
				: "runtime",
		},
	});
}

function buildRecoverableToolErrorMetadata(input: {
	part: AiSdkStreamPart;
	errorMessage: string;
	request: GatewayStreamRequest;
	context: GatewayProviderContext;
	toolName: string;
}): Record<string, unknown> {
	return buildToolCallMetadata({
		metadata: mergeToolCallMetadata(extractGoogleThoughtMetadata(input.part), {
			inputParseError: `工具调用 ${input.toolName} 在执行前被拒绝：${input.errorMessage}`,
			aiSdkToolError: input.errorMessage,
		}),
		request: input.request,
		context: input.context,
	});
}

function resolveAiSdkSystemPrompt(
	request: GatewayStreamRequest,
): string | undefined {
	return request.providerId === "openai-codex"
		? undefined
		: request.systemPrompt;
}

function mapFinishReason(
	value: unknown,
	sawToolCalls: boolean,
): AgentModelFinishReason {
	if (value === "tool-calls" || value === "tool_calls" || sawToolCalls) {
		return "tool-calls";
	}
	if (value === "length" || value === "max_tokens") {
		return "max-tokens";
	}
	if (value === "error") {
		return "error";
	}
	return "stop";
}

function extractStreamPartText(
	part: AiSdkStreamPart,
	keys: readonly string[],
): string | undefined {
	for (const key of keys) {
		const value = part[key];
		if (typeof value === "string" && value.length > 0) {
			return value;
		}
	}
	const delta = part.delta;
	if (typeof delta === "string" && keys.includes("delta")) {
		return delta;
	}
	if (delta && typeof delta === "object") {
		const record = delta as Record<string, unknown>;
		for (const key of keys) {
			const value = record[key];
			if (typeof value === "string" && value.length > 0) {
				return value;
			}
		}
	}
	return undefined;
}

function isReasoningStreamPart(part: AiSdkStreamPart): boolean {
	if (
		part.type === "reasoning-delta" ||
		part.type === "reasoning" ||
		part.type === "reasoning-start" ||
		part.type === "reasoning-end"
	) {
		return true;
	}
	return (
		extractStreamPartText(part, [
			"reasoning_content",
			"reasoningContent",
			"reasoning_text",
			"reasoningText",
			"thinking",
			"thinking_delta",
			"thinkingDelta",
			"thought",
			"thoughts",
		]) !== undefined
	);
}

function parseMaybeJson(value: unknown): unknown {
	if (typeof value !== "string") {
		return undefined;
	}
	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
}

function stringifyErrorContext(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}
	if (!value || typeof value !== "object") {
		return "";
	}
	try {
		return JSON.stringify(value);
	} catch {
		return "";
	}
}

function collectErrorValues(
	value: unknown,
	values: unknown[],
	seen = new WeakSet<object>(),
	depth = 0,
): void {
	if (value === undefined || value === null || depth > 4) {
		return;
	}
	values.push(value);
	if (typeof value === "string") {
		const parsed = parseMaybeJson(value);
		if (parsed !== undefined) {
			collectErrorValues(parsed, values, seen, depth + 1);
		}
		return;
	}
	if (typeof value !== "object") {
		return;
	}
	if (seen.has(value)) {
		return;
	}
	seen.add(value);

	const record = value as Record<string, unknown>;
	for (const key of [
		"cause",
		"data",
		"error",
		"errors",
		"response",
		"responseBody",
		"body",
		"detail",
	]) {
		const nested = record[key];
		if (Array.isArray(nested)) {
			for (const item of nested) {
				collectErrorValues(item, values, seen, depth + 1);
			}
		} else {
			collectErrorValues(nested, values, seen, depth + 1);
		}
	}
}

function extractProviderStatusCode(error: unknown): number | undefined {
	const values: unknown[] = [];
	collectErrorValues(error, values);
	for (const value of values) {
		if (!value || typeof value !== "object") {
			continue;
		}
		const record = value as Record<string, unknown>;
		const status =
			record.statusCode ?? record.status ?? record.code ?? record.httpStatus;
		if (typeof status === "number" && Number.isFinite(status)) {
			return status;
		}
		if (
			typeof status === "string" &&
			/^\d{3}$/.test(status) &&
			Number.isFinite(Number(status))
		) {
			return Number(status);
		}
	}
	return undefined;
}

function translateCommonProviderDetail(detail: string): string {
	const normalized = detail.trim();
	const lower = normalized.toLowerCase();

	if (!normalized) {
		return "";
	}
	if (/invalid api key|incorrect api key|api key.*invalid/.test(lower)) {
		return "API Key 无效";
	}
	if (/you do not have access to the organization/.test(lower)) {
		return "当前 API Key 无法访问绑定的组织";
	}
	if (/insufficient_quota|insufficient quota|quota exceeded/.test(lower)) {
		return "额度不足";
	}
	if (/rate limit|too many requests/.test(lower)) {
		return "触发上游限流";
	}
	if (/model.*not found|no such model|model_not_found/.test(lower)) {
		return "模型不存在或无权限访问";
	}
	if (/instructions are required/.test(lower)) {
		return "缺少 instructions 字段";
	}
	if (/bad request/.test(lower)) {
		return "请求参数无效";
	}
	if (/unauthorized/.test(lower)) {
		return "未授权，请检查 API Key";
	}
	if (/forbidden/.test(lower)) {
		return "上游拒绝访问";
	}
	if (
		/unexpected token|unexpected end of json|failed to parse json/.test(lower)
	) {
		return "上游返回了无效 JSON";
	}
	if (/no output generated/.test(lower)) {
		return "没有生成模型输出";
	}
	if (/expected 'id' to be a string/.test(lower)) {
		return "上游工具调用缺少 id";
	}
	if (/expected 'function\.name' to be a string/.test(lower)) {
		return "上游工具调用缺少 function.name";
	}
	const invalidToolInput = normalized.match(
		/^Invalid input for tool ([^:]+): JSON parsing failed$/i,
	);
	if (invalidToolInput) {
		return `工具 ${invalidToolInput[1]} 输入无效：JSON 解析失败`;
	}

	return normalized;
}

function classifyProviderError(
	error: unknown,
	detail: string,
): string | undefined {
	const statusCode = extractProviderStatusCode(error);
	const values: unknown[] = [];
	collectErrorValues(error, values);
	const haystack = [
		detail,
		...values.map((value) => stringifyErrorContext(value)),
	]
		.join(" ")
		.toLowerCase();

	if (
		statusCode === 401 ||
		/invalid api key|incorrect api key|unauthorized|authentication/.test(
			haystack,
		)
	) {
		return "API Key 无效或无权限";
	}
	if (statusCode === 403 || /forbidden|permission denied/.test(haystack)) {
		return "上游拒绝访问，请检查 Key 权限、账号状态或模型访问权限";
	}
	if (
		statusCode === 404 ||
		/model.*not found|no such model|model_not_found/.test(haystack)
	) {
		return "模型不存在或当前 Key 无权限访问";
	}
	if (
		statusCode === 429 ||
		/rate limit|too many requests|insufficient_quota|insufficient quota|quota exceeded/.test(
			haystack,
		)
	) {
		return "额度不足或触发限流";
	}
	if (
		/unexpected token|unexpected end of json|failed to parse json|jsonparseerror/.test(
			haystack,
		)
	) {
		return "上游返回了无效 JSON";
	}
	if (
		/invalidresponsedata|invalid response data|expected 'id' to be a string|expected 'function\.name' to be a string/.test(
			haystack,
		)
	) {
		return "上游返回格式不兼容";
	}
	if (/no output generated|stream ended|premature close/.test(haystack)) {
		return "上游流式响应提前结束";
	}
	if (statusCode !== undefined && statusCode >= 500) {
		return `上游服务异常（HTTP ${statusCode}）`;
	}
	if (statusCode !== undefined && statusCode >= 400) {
		return `上游请求失败（HTTP ${statusCode}）`;
	}
	if (/timeout|timed out|etimedout|econnreset|socket hang up/.test(haystack)) {
		return "上游请求超时";
	}
	if (/aborterror|aborted|cancelled|canceled/.test(haystack)) {
		return "请求已取消";
	}

	return undefined;
}

function formatProviderErrorMessage(error: unknown): string {
	const rawDetail = extractErrorMessage(error).trim();
	const detail = translateCommonProviderDetail(rawDetail);
	const classification = classifyProviderError(error, rawDetail);

	if (!classification) {
		return detail ? `上游返回错误：${detail}` : "上游返回错误";
	}
	if (!detail || detail === classification || rawDetail === classification) {
		return classification;
	}
	if (classification.includes(detail) || detail.includes(classification)) {
		return classification;
	}
	if (
		(classification.startsWith("额度不足") && detail.startsWith("额度不足")) ||
		(classification.startsWith("模型不存在") &&
			detail.startsWith("模型不存在")) ||
		(classification.startsWith("API Key") && detail.startsWith("API Key")) ||
		(classification.startsWith("上游返回了无效 JSON") &&
			detail.startsWith("上游返回了无效 JSON"))
	) {
		return classification;
	}
	return `${classification}：${detail}`;
}

function getUsageValue(
	usage: Record<string, unknown>,
	...keys: string[]
): number {
	for (const key of keys) {
		const value = usage[key];
		if (typeof value === "number" && Number.isFinite(value)) {
			return value;
		}
		if (
			typeof value === "string" &&
			value.trim().length > 0 &&
			Number.isFinite(Number(value))
		) {
			return Number(value);
		}
	}
	return 0;
}

function getNumericValue(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (
		typeof value === "string" &&
		value.trim().length > 0 &&
		Number.isFinite(Number(value))
	) {
		return Number(value);
	}
	return undefined;
}

function getNestedUsageValue(
	usage: Record<string, unknown>,
	...path: string[]
): number {
	let current: unknown = usage;
	for (const key of path) {
		if (!current || typeof current !== "object") {
			return 0;
		}
		current = (current as Record<string, unknown>)[key];
	}
	return getNumericValue(current) ?? 0;
}

function extractProviderNestedUsage(
	value: unknown,
): Record<string, unknown> | undefined {
	if (!value || typeof value !== "object") {
		return undefined;
	}

	const providerMetadata = value as Record<string, unknown>;
	for (const nestedValue of Object.values(providerMetadata)) {
		if (!nestedValue || typeof nestedValue !== "object") {
			continue;
		}

		const nestedMetadata = nestedValue as Record<string, unknown>;
		if (nestedMetadata.usage && typeof nestedMetadata.usage === "object") {
			return nestedMetadata.usage as Record<string, unknown>;
		}
	}

	return undefined;
}

function calculateUsageCostFromPricing(
	usage: Omit<GatewayNormalizedUsage, "totalCost">,
	pricingValue: unknown,
): number | undefined {
	if (!pricingValue || typeof pricingValue !== "object") {
		return undefined;
	}

	const pricing = pricingValue as Record<string, unknown>;
	const inputPrice = getNumericValue(pricing.input);
	const outputPrice = getNumericValue(pricing.output);

	if (inputPrice === undefined || outputPrice === undefined) {
		return undefined;
	}

	const cacheReadPrice = getNumericValue(pricing.cacheRead) ?? 0;
	const cacheWritePrice =
		getNumericValue(pricing.cacheWrite) ?? inputPrice * 1.25;
	const billableInputTokens = Math.max(
		0,
		usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens,
	);

	return (
		(billableInputTokens / 1_000_000) * inputPrice +
		(usage.outputTokens / 1_000_000) * outputPrice +
		(usage.cacheReadTokens / 1_000_000) * cacheReadPrice +
		(usage.cacheWriteTokens / 1_000_000) * cacheWritePrice
	);
}

/**
 * Normalizes usage from various provider formats into a standard structure.
 * Accepts both AI SDK's normalized shapes (AiSdkStreamTotalUsage, AiSdkStreamUsage)
 * and raw provider responses. Handles multiple naming conventions (camelCase vs snake_case),
 * extracts costs from provider-specific fields, and falls back to pricing-based calculation.
 *
 * @param usageValue - AI SDK normalized usage or raw provider response object
 * @param providerMetadata - Provider-specific metadata for cost extraction
 * @param pricingValue - Fallback pricing config (per 1M tokens) when no explicit cost found
 */
export function normalizeUsage(
	usageValue:
		| AiSdkStreamUsage
		| AiSdkStreamTotalUsage
		| Record<string, unknown>
		| undefined,
	providerMetadata?: unknown,
	pricingValue?: unknown,
): GatewayNormalizedUsage {
	const usage =
		usageValue && typeof usageValue === "object"
			? (usageValue as Record<string, unknown>)
			: {};
	const providerUsage = extractProviderNestedUsage(providerMetadata);
	const providerMetadataRecord =
		providerMetadata && typeof providerMetadata === "object"
			? (providerMetadata as Record<string, unknown>)
			: {};
	const gatewayMetadata =
		providerMetadataRecord.gateway &&
		typeof providerMetadataRecord.gateway === "object"
			? (providerMetadataRecord.gateway as Record<string, unknown>)
			: {};
	const rawUsage =
		usage.raw && typeof usage.raw === "object"
			? (usage.raw as Record<string, unknown>)
			: usage;
	const upstreamInferenceCost =
		getNumericValue(
			(rawUsage.cost_details as Record<string, unknown> | undefined)
				?.upstream_inference_cost,
		) ?? getNumericValue(rawUsage.upstream_inference_cost);
	const marketCost =
		getNumericValue(rawUsage.market_cost) ??
		getNumericValue(rawUsage.marketCost) ??
		getNumericValue(gatewayMetadata.marketCost);
	const baseCost =
		getNumericValue(rawUsage.cost) ?? getNumericValue(gatewayMetadata.cost);
	const hasExplicitCost =
		marketCost !== undefined ||
		baseCost !== undefined ||
		upstreamInferenceCost !== undefined;
	const isByokUsage =
		rawUsage.is_byok === true ||
		rawUsage.isByok === true ||
		gatewayMetadata.is_byok === true ||
		gatewayMetadata.isByok === true;
	const shouldAddUpstreamCost =
		isByokUsage &&
		baseCost !== undefined &&
		upstreamInferenceCost !== undefined;
	const costOrUpstream =
		baseCost !== undefined && baseCost > 0
			? baseCost
			: (upstreamInferenceCost ?? baseCost);
	const totalCost =
		marketCost ??
		(shouldAddUpstreamCost ? baseCost + upstreamInferenceCost : costOrUpstream);
	const normalizedUsage = {
		inputTokens:
			getNestedUsageValue(usage, "inputTokens", "total") ||
			getUsageValue(usage, "inputTokens", "input_tokens", "prompt_tokens") ||
			getUsageValue(rawUsage, "promptTokenCount", "prompt_token_count"),
		outputTokens:
			getNestedUsageValue(usage, "outputTokens", "total") ||
			getUsageValue(
				usage,
				"outputTokens",
				"output_tokens",
				"completion_tokens",
			) ||
			getUsageValue(rawUsage, "candidatesTokenCount", "candidates_token_count"),
		cacheReadTokens:
			getNestedUsageValue(usage, "inputTokens", "cacheRead") ||
			getNestedUsageValue(usage, "inputTokenDetails", "cacheReadTokens") ||
			getUsageValue(
				usage,
				"cachedInputTokens",
				"cacheReadTokens",
				"cache_read_tokens",
				"cache_read_input_tokens",
			) ||
			getNestedUsageValue(usage, "prompt_tokens_details", "cached_tokens") ||
			getNestedUsageValue(rawUsage, "prompt_tokens_details", "cached_tokens") ||
			getUsageValue(rawUsage, "cachedContentTokenCount") ||
			getUsageValue(
				providerUsage ?? {},
				"cachedInputTokens",
				"cacheReadTokens",
				"cache_read_tokens",
				"cache_read_input_tokens",
			),
		cacheWriteTokens:
			getNestedUsageValue(usage, "inputTokens", "cacheWrite") ||
			getNestedUsageValue(usage, "inputTokenDetails", "cacheWriteTokens") ||
			getNestedUsageValue(
				usage,
				"prompt_tokens_details",
				"cache_write_tokens",
			) ||
			getUsageValue(
				usage,
				"cacheWriteTokens",
				"cache_write_tokens",
				"cache_creation_input_tokens",
			) ||
			getNestedUsageValue(
				rawUsage,
				"prompt_tokens_details",
				"cache_write_tokens",
			) ||
			getUsageValue(
				rawUsage,
				"cacheWriteTokens",
				"cache_write_tokens",
				"cache_creation_input_tokens",
			) ||
			getUsageValue(
				providerUsage ?? {},
				"cacheWriteTokens",
				"cache_write_tokens",
				"cache_creation_input_tokens",
			),
	};
	const resolvedTotalCost =
		totalCost !== undefined
			? totalCost
			: hasExplicitCost
				? undefined
				: calculateUsageCostFromPricing(normalizedUsage, pricingValue);

	return {
		...normalizedUsage,
		...(typeof resolvedTotalCost === "number"
			? { totalCost: resolvedTotalCost }
			: {}),
	};
}

/**
 * Suppress unhandled rejections from AI SDK stream promises (usage, finishReason, etc.)
 * that reject with NoOutputGeneratedError when the stream encounters an error.
 *
 * The AI SDK's streamText result exposes lazy promise getters (finishReason, totalUsage,
 * steps, text, usage, etc.) backed by internal DelayedPromise instances. When the stream
 * errors with 0 recorded steps, the flush callback rejects all of them. We must access
 * each getter to obtain the promise and attach a no-op rejection handler before Bun/Node
 * surfaces them as unhandled rejections.
 */
function suppressDanglingStreamPromises(
	stream: AiSdkStreamResult | undefined,
): void {
	if (!stream) return;
	const noop = () => {};
	const suppress = (val: unknown) => {
		if (val && typeof (val as Promise<unknown>).catch === "function") {
			(val as Promise<unknown>).catch(noop);
		}
	};

	// Access known lazy promise getters on the AI SDK StreamTextResult object.
	const s = stream as Record<string, unknown>;

	// Catch-all for any remaining promise-valued own properties.
	for (const key of Object.keys(stream)) {
		try {
			suppress(s[key]);
		} catch {
			// ignore
		}
	}
}

function asMetadataRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readStringMetadata(
	record: Record<string, unknown> | undefined,
	keys: readonly string[],
): string | undefined {
	if (!record) {
		return undefined;
	}
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string") {
			return value;
		}
	}
	return undefined;
}

function providerMetadataRecords(
	part: AiSdkStreamPart,
	providerIds?: readonly string[],
): Record<string, unknown>[] {
	const providerMetadata = asMetadataRecord(part.providerMetadata);
	if (!providerMetadata) {
		return [];
	}

	if (!providerIds) {
		return Object.values(providerMetadata).flatMap((value) => {
			const record = asMetadataRecord(value);
			return record ? [record] : [];
		});
	}

	return providerIds.flatMap((providerId) => {
		const record = asMetadataRecord(providerMetadata[providerId]);
		return record ? [record] : [];
	});
}

function readStringFromRecords(
	records: readonly Record<string, unknown>[],
	keys: readonly string[],
): string | undefined {
	for (const record of records) {
		const value = readStringMetadata(record, keys);
		if (value !== undefined) {
			return value;
		}
	}
	return undefined;
}

export function extractGoogleThoughtMetadata(
	part: AiSdkStreamPart,
): Record<string, unknown> | undefined {
	const metadata: Record<string, unknown> = {};
	const direct = part as Record<string, unknown>;

	if (typeof direct.thoughtSignature === "string") {
		metadata.thoughtSignature = direct.thoughtSignature;
	}
	if (typeof direct.thought_signature === "string") {
		metadata.thought_signature = direct.thought_signature;
	}

	const providerRecords = providerMetadataRecords(part);

	if (
		typeof metadata.thoughtSignature !== "string" &&
		readStringFromRecords(providerRecords, ["thoughtSignature"]) !== undefined
	) {
		metadata.thoughtSignature = readStringFromRecords(providerRecords, [
			"thoughtSignature",
		]);
	}
	if (
		typeof metadata.thought_signature !== "string" &&
		readStringFromRecords(providerRecords, ["thought_signature"]) !== undefined
	) {
		metadata.thought_signature = readStringFromRecords(providerRecords, [
			"thought_signature",
		]);
	}

	return Object.keys(metadata).length > 0 ? metadata : undefined;
}

export function extractReasoningMetadata(
	part: AiSdkStreamPart,
): Record<string, unknown> | undefined {
	const metadata: Record<string, unknown> = {};
	const direct = part as Record<string, unknown>;
	const anthropicRecords = providerMetadataRecords(part, [
		"anthropic",
		"bedrock",
	]);

	const signature =
		readStringMetadata(direct, ["signature"]) ??
		readStringFromRecords(anthropicRecords, ["signature"]);
	if (signature !== undefined) {
		metadata.signature = signature;
	}

	const redactedData =
		readStringMetadata(direct, ["redactedData", "redacted_data", "data"]) ??
		readStringFromRecords(anthropicRecords, [
			"redactedData",
			"redacted_data",
			"data",
		]);
	if (redactedData !== undefined) {
		metadata.redactedData = redactedData;
	}

	const googleMetadata = extractGoogleThoughtMetadata(part);
	if (googleMetadata) {
		Object.assign(metadata, googleMetadata);
	}

	return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function isRedactedReasoningMetadata(
	metadata: Record<string, unknown> | undefined,
): boolean | undefined {
	return typeof metadata?.redactedData === "string" ? true : undefined;
}

async function* emitAiSdkEvents(
	stream: AiSdkStreamResult,
	request: GatewayStreamRequest,
	context: GatewayProviderContext,
	pricingValue?: unknown,
	capturedError?: { current: string | undefined },
): AsyncIterable<AgentModelEvent> {
	let sawToolCalls = false;
	const emittedToolCallIds = new Set<string>();
	let finishReason: unknown;
	let streamError: string | undefined;
	let finishUsage: unknown;
	let finishProviderMetadata: unknown;

	try {
		if (stream.fullStream) {
			for await (const part of stream.fullStream) {
				if (isReasoningStreamPart(part)) {
					const text = extractStreamPartText(part, [
						"textDelta",
						"text",
						"reasoning",
						"delta",
						"reasoning_content",
						"reasoningContent",
						"reasoning_text",
						"reasoningText",
						"thinking",
						"thinking_delta",
						"thinkingDelta",
						"thought",
						"thoughts",
					]);
					const metadata = extractReasoningMetadata(part);
					if (text || metadata) {
						yield {
							type: "reasoning-delta",
							text: text ?? "",
							...(isRedactedReasoningMetadata(metadata)
								? { redacted: true }
								: {}),
							metadata,
						};
					}
					continue;
				}

				if (part.type === "text-delta") {
					const text = extractStreamPartText(part, [
						"textDelta",
						"text",
						"content",
						"delta",
					]);
					if (text) {
						yield { type: "text-delta", text };
					}
					continue;
				}

				if (part.type === "tool-call") {
					sawToolCalls = true;
					const toolCallId =
						(part.toolCallId as string | undefined) ??
						(part.id as string | undefined) ??
						`tool_${nanoid()}`;
					emittedToolCallIds.add(toolCallId);
					const input = (part.input ?? part.args ?? {}) as unknown;
					const inputText =
						typeof input === "string" ? input : JSON.stringify(input);
					yield {
						type: "tool-call-delta",
						toolCallId,
						toolName:
							(part.toolName as string | undefined) ??
							(part.name as string | undefined) ??
							"tool",
						input: typeof input === "string" ? undefined : input,
						inputText,
						metadata: buildToolCallMetadata({
							metadata: extractGoogleThoughtMetadata(part),
							request,
							context,
						}),
					};
					continue;
				}

				if (part.type === "tool-error") {
					sawToolCalls = true;
					const toolCallId =
						(part.toolCallId as string | undefined) ??
						(part.id as string | undefined) ??
						`tool_${nanoid()}`;
					const alreadyEmitted = emittedToolCallIds.has(toolCallId);
					emittedToolCallIds.add(toolCallId);
					const toolName =
						(part.toolName as string | undefined) ??
						(part.name as string | undefined) ??
						"tool";
					const input = (part.input ?? part.args ?? {}) as unknown;
					const inputText =
						typeof input === "string" ? input : JSON.stringify(input);
					const errorMessage =
						part.error === undefined
							? "模型适配器拒绝了工具输入"
							: formatProviderErrorMessage(part.error);
					yield {
						type: "tool-call-delta",
						toolCallId,
						toolName,
						input: alreadyEmitted
							? undefined
							: typeof input === "string"
								? undefined
								: input,
						inputText: alreadyEmitted ? undefined : inputText,
						metadata: buildRecoverableToolErrorMetadata({
							part,
							errorMessage,
							request,
							context,
							toolName,
						}),
					};
					continue;
				}

				if (part.type === "finish") {
					finishUsage = part.usage ?? part.totalUsage;
					finishProviderMetadata = part.providerMetadata;
					finishReason =
						part.finishReason ?? part.rawFinishReason ?? part.reason;
				}

				if (part.type === "error") {
					streamError =
						capturedError?.current ?? formatProviderErrorMessage(part.error);
					break;
				}

				if (part.type === "abort") {
					// abort
					break;
				}
			}
		} else if (stream.textStream) {
			for await (const text of stream.textStream) {
				yield { type: "text-delta", text };
			}
		}
	} catch (error) {
		// Prefer the real provider error from onError over the generic
		// NoOutputGeneratedError the AI SDK throws when 0 steps are recorded.
		streamError = capturedError?.current ?? formatProviderErrorMessage(error);
	}

	// Prefer stream.usage (has raw cost data) over finish part usage.
	// stream.usage may be undefined in mocked/test scenarios, fall back to finish part + its providerMetadata.
	let usageToEmit: unknown;
	let metadataToUse: unknown;
	if (streamError) {
		usageToEmit = finishUsage;
		metadataToUse = finishProviderMetadata;
	} else if (stream.usage) {
		try {
			usageToEmit = await stream.usage;
		} catch (error) {
			if (!streamError) {
				streamError =
					capturedError?.current ?? formatProviderErrorMessage(error);
			}
			usageToEmit = finishUsage;
			metadataToUse = finishProviderMetadata;
		}
	} else {
		usageToEmit = finishUsage;
		metadataToUse = finishProviderMetadata;
	}

	if (usageToEmit) {
		yield {
			type: "usage",
			usage: normalizeUsage(usageToEmit, metadataToUse, pricingValue),
		};
	}

	yield {
		type: "finish",
		reason: streamError ? "error" : mapFinishReason(finishReason, sawToolCalls),
		error: streamError,
	};
}

async function createProviderModule(
	kind: ProviderModuleKind,
	config: GatewayResolvedProviderConfig,
	context: GatewayProviderContext,
): Promise<ProviderFactoryResult> {
	switch (kind) {
		case "openai": {
			const { createOpenAIProviderModule } = await import("./vendors/openai");
			return createOpenAIProviderModule(config, context);
		}
		case "openai-compatible": {
			const { createOpenAICompatibleProviderModule } = await import(
				"./vendors/openai-compatible"
			);
			return createOpenAICompatibleProviderModule(config, context);
		}
		case "anthropic": {
			const { createAnthropicProviderModule } = await import(
				"./vendors/anthropic"
			);
			return createAnthropicProviderModule(config, context);
		}
		case "google": {
			const { createGoogleProviderModule } = await import("./vendors/google");
			return createGoogleProviderModule(config, context);
		}
		case "vertex": {
			const { createVertexProviderModule } = await import("./vendors/vertex");
			return createVertexProviderModule(config, context);
		}
		case "bedrock": {
			const { createBedrockProviderModule } = await import("./vendors/bedrock");
			return createBedrockProviderModule(config);
		}
		case "mistral": {
			const { createMistralProviderModule } = await import("./vendors/mistral");
			return createMistralProviderModule(config);
		}
		case "claude-code": {
			const { createClaudeCodeProviderModule } = await import(
				"./vendors/community"
			);
			return createClaudeCodeProviderModule(config);
		}
		case "openai-codex": {
			const { createOpenAICodexProviderModule } = await import(
				"./vendors/community"
			);
			return createOpenAICodexProviderModule(config);
		}
		case "opencode": {
			const { createOpenCodeProviderModule } = await import(
				"./vendors/community"
			);
			return createOpenCodeProviderModule(config);
		}
		case "dify": {
			const { createDifyProviderModule } = await import("./vendors/community");
			return createDifyProviderModule(config);
		}
	}
}

function createAiSdkProvider(kind: ProviderModuleKind): GatewayProviderFactory {
	return async (config) => ({
		async *stream(request, context) {
			const log = context.logger;
			let stream: AiSdkStreamResult | undefined;
			const capturedError: { current: string | undefined } = {
				current: undefined,
			};
			try {
				const provider = await createProviderModule(kind, config, context);
				const langfuse = await ensureGatewayLangfuseTelemetry(
					config.providerId,
				);
				const tools = providerDisablesExternalToolExecution(context)
					? undefined
					: toAiSdkTools(request);
				const systemPrompt = resolveAiSdkSystemPrompt(request);
				const useSystemOption =
					typeof systemPrompt === "string" && systemPrompt.trim().length > 0;
				const messagesSystemPrompt = useSystemOption ? undefined : systemPrompt;
				stream = streamText({
					model: provider.model(context.model.id) as never,
					messages: (shouldApplyPromptCache(request, context)
						? buildCachedAiSdkMessages(request, context, messagesSystemPrompt)
						: toAiSdkMessages(request.messages, messagesSystemPrompt)) as never,
					...(useSystemOption ? { system: systemPrompt } : {}),
					tools: tools as never,
					temperature: request.temperature,
					...(request.maxTokens !== undefined
						? { maxOutputTokens: request.maxTokens }
						: {}),
					abortSignal: request.signal,
					experimental_telemetry: {
						isEnabled: langfuse,
					},
					providerOptions: composeAiSdkProviderOptions(
						request,
						context,
						kind,
					) as never,
					onError: ({ error: streamError }) => {
						const msg = formatProviderErrorMessage(streamError);
						capturedError.current = msg;
						if (log?.error) {
							log.error("[ai-sdk] stream error", {
								providerId: request.providerId,
								error: streamError,
								severity: "error",
							});
						} else if (log) {
							log.log(`[ai-sdk] stream error: ${msg}`, {
								providerId: request.providerId,
								severity: "error",
							});
						}
						captureSdkError(context.telemetry, {
							component: "llms",
							operation: "provider.stream",
							error: streamError,
							severity: "error",
							handled: true,
							context: {
								providerId: request.providerId,
								modelId: request.modelId,
								providerKind: kind,
							},
						});
					},
				}) as unknown as AiSdkStreamResult;

				// Suppress dangling promise rejections (finishReason, totalUsage, steps, etc.)
				// BEFORE iterating. The AI SDK rejects these DelayedPromises inside the stream's
				// flush callback, which runs during iteration, so we must attach .catch() handlers
				// upfront or Bun/Node will surface them as unhandled rejections.
				suppressDanglingStreamPromises(stream);

				yield* emitAiSdkEvents(
					stream,
					request,
					context,
					context.model.metadata?.pricing,
					capturedError,
				);
			} catch (error) {
				suppressDanglingStreamPromises(stream);
				// Prefer the real provider error captured in onError over the generic
				// NoOutputGeneratedError that the AI SDK throws when 0 steps are recorded.
				const msg = capturedError.current ?? formatProviderErrorMessage(error);
				if (log?.error) {
					log.error("[ai-sdk] provider error", {
						providerId: request.providerId,
						error,
						severity: "error",
					});
				} else if (log) {
					log.log(`[ai-sdk] provider error: ${msg}`, {
						providerId: request.providerId,
						severity: "error",
					});
				}
				captureSdkError(context.telemetry, {
					component: "llms",
					operation: "provider.create_or_stream",
					error,
					severity: "error",
					handled: true,
					context: {
						providerId: request.providerId,
						modelId: request.modelId,
						providerKind: kind,
					},
				});
				yield {
					type: "finish",
					reason: "error",
					error: msg,
				};
			}
		},
	});
}

export const createOpenAIProvider = createAiSdkProvider("openai");
export const createOpenAICompatibleProvider =
	createAiSdkProvider("openai-compatible");
export const createAnthropicProvider = createAiSdkProvider("anthropic");
export const createGoogleProvider = createAiSdkProvider("google");
export const createVertexProvider = createAiSdkProvider("vertex");
export const createBedrockProvider = createAiSdkProvider("bedrock");
export const createMistralProvider = createAiSdkProvider("mistral");
export const createClaudeCodeProvider = createAiSdkProvider("claude-code");
export const createOpenAICodexProvider = createAiSdkProvider("openai-codex");
export const createOpenCodeProvider = createAiSdkProvider("opencode");
export const createDifyProvider = createAiSdkProvider("dify");
