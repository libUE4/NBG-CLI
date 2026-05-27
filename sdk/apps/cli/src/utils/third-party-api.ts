import {
	getLocalProviderModels,
	type Llms,
	type ProviderSettingsManager,
	refreshProviderModelsFromSource,
	updateLocalProvider,
} from "@cline/core";
import { formatCreditBalance } from "./output";

export const THIRD_PARTY_PROVIDER_ID = "openai-compatible";
export const THIRD_PARTY_PROVIDER_NAME = "三方 API";

const MODEL_FETCH_TIMEOUT_MS = 30_000;
const USAGE_FETCH_TIMEOUT_MS = 10_000;
const THIRD_PARTY_ANTHROPIC_AUTH_METHOD = "x-api-key";

export interface OpenAiCompatibleModelSourceCandidate {
	baseUrl: string;
	modelsSourceUrl: string;
	client: "openai-compatible" | "anthropic";
}

export type LocalProviderModels = Awaited<
	ReturnType<typeof getLocalProviderModels>
>["models"];

export interface ThirdPartyAccountBalance {
	balance: number;
	sourceUrl: string;
}

const GENERIC_THIRD_PARTY_FALLBACK_MODELS = [
	"gpt-5.4",
	"gpt-5.3-codex",
	"claude-sonnet-4-6",
	"claude-opus-4-7",
	"claude-haiku-4-5",
	"deepseek-v4-pro",
	"deepseek-v4-flash",
	"kimi-k2.6",
	"qwen3.6-coder",
	"glm-5.1",
] as const;
const GENERIC_THIRD_PARTY_DEFAULT_MODEL =
	GENERIC_THIRD_PARTY_FALLBACK_MODELS[0];
const GENERIC_THIRD_PARTY_ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-6";

function parseUserUrl(value: string | URL): URL {
	const raw = value.toString().trim();
	if (!raw) throw new Error("请输入三方接口地址");
	const candidates = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
		? [raw]
		: [`https://${raw}`, `http://${raw}`];
	for (const candidate of candidates) {
		try {
			return new URL(candidate);
		} catch {
			continue;
		}
	}
	throw new Error("请输入有效的三方接口地址");
}

function cloneCleanUrl(value: string | URL): URL {
	let url: URL;
	try {
		url =
			value instanceof URL ? new URL(value.toString()) : parseUserUrl(value);
	} catch {
		throw new Error("请输入有效的三方接口地址");
	}
	url.search = "";
	url.hash = "";
	const pathname = url.pathname.replace(/\/+$/, "");
	url.pathname = pathname || "/";
	return url;
}

function removeModelsSuffix(url: URL): URL {
	const next = cloneCleanUrl(url);
	if (next.pathname.endsWith("/models")) {
		next.pathname =
			next.pathname.slice(0, -"/models".length).replace(/\/+$/, "") || "/";
	}
	if (next.pathname.endsWith("/chat/completions")) {
		next.pathname =
			next.pathname.slice(0, -"/chat/completions".length).replace(/\/+$/, "") ||
			"/";
	}
	if (next.pathname.endsWith("/responses")) {
		next.pathname =
			next.pathname.slice(0, -"/responses".length).replace(/\/+$/, "") || "/";
	}
	return next;
}

function appendPathSegment(url: URL, segment: string): string {
	const next = cloneCleanUrl(url);
	const pathname = next.pathname.replace(/\/+$/, "");
	next.pathname = `${pathname === "/" ? "" : pathname}/${segment}`;
	return next.toString();
}

export function resolveThirdPartyUsageUrl(baseUrl: string | URL): string {
	const source = resolveOpenAiCompatibleModelSourceCandidates(baseUrl)[0];
	if (source) {
		return source.modelsSourceUrl.replace(/\/models$/, "/usage");
	}
	return appendPathSegment(removeModelsSuffix(cloneCleanUrl(baseUrl)), "usage");
}

function finiteNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Number(value.trim());
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}
	return undefined;
}

function findNumberByKeys(
	value: unknown,
	keys: readonly string[],
	depth = 0,
): number | undefined {
	if (!value || typeof value !== "object" || depth > 3) {
		return undefined;
	}
	const record = value as Record<string, unknown>;
	for (const key of keys) {
		const direct = finiteNumber(record[key]);
		if (direct !== undefined) {
			return direct;
		}
	}
	for (const nested of Object.values(record)) {
		const hit = findNumberByKeys(nested, keys, depth + 1);
		if (hit !== undefined) {
			return hit;
		}
	}
	return undefined;
}

export function parseThirdPartyAccountBalance(
	payload: unknown,
	sourceUrl = "",
): ThirdPartyAccountBalance | undefined {
	const balance = findNumberByKeys(payload, [
		"balance",
		"remaining_balance",
		"remain_balance",
		"available_balance",
		"credit_available",
		"credits_available",
		"total_available",
		"quota_remaining",
		"remaining_quota",
		"remain_quota",
	]);
	if (balance !== undefined) {
		return { balance, sourceUrl };
	}

	const quota = findNumberByKeys(payload, [
		"quota",
		"total_quota",
		"limit",
		"hard_limit_usd",
		"credit_granted",
		"total_granted",
	]);
	const used = findNumberByKeys(payload, [
		"used",
		"used_quota",
		"usage",
		"total_usage",
		"credit_used",
		"total_used",
	]);
	if (quota !== undefined && used !== undefined) {
		return { balance: Math.max(0, quota - used), sourceUrl };
	}

	return undefined;
}

export function formatThirdPartyAccountBalance(
	balance: ThirdPartyAccountBalance,
): string {
	return formatCreditBalance(balance.balance);
}

function isAnthropicCompatibleBaseUrl(url: URL): boolean {
	return url.pathname
		.split("/")
		.filter(Boolean)
		.some((segment) => segment.toLowerCase() === "anthropic");
}

function resolveThirdPartyClient(
	baseUrl: string | URL,
): "openai-compatible" | "anthropic" {
	const url = cloneCleanUrl(baseUrl);
	return isAnthropicCompatibleBaseUrl(url) ? "anthropic" : "openai-compatible";
}

function inferModelCapabilities(
	modelId: string,
	client: "openai-compatible" | "anthropic",
): Array<"tools" | "reasoning" | "vision"> {
	const normalized = modelId.toLowerCase();
	const capabilities = new Set<"tools" | "reasoning" | "vision">(["tools"]);
	if (
		client === "anthropic" ||
		/deepseek|kimi|qwen|glm|gpt-[45]|o[1-9]|claude|sonnet|opus|haiku|reason|think|coder|codex/.test(
			normalized,
		)
	) {
		capabilities.add("reasoning");
	}
	if (
		/vision|vl|gpt-4o|gpt-5|gemini|claude|sonnet|opus|flash|image/.test(
			normalized,
		)
	) {
		capabilities.add("vision");
	}
	return [...capabilities];
}

function mergeCapabilitiesForModels(
	models: readonly string[],
	client: "openai-compatible" | "anthropic",
): Array<"tools" | "reasoning" | "vision"> {
	const merged = new Set<"tools" | "reasoning" | "vision">(["tools"]);
	for (const model of models) {
		for (const capability of inferModelCapabilities(model, client)) {
			merged.add(capability);
		}
	}
	return [...merged];
}

function resolveAnthropicBaseUrl(baseUrl: string | URL): string {
	const url = cloneCleanUrl(baseUrl);
	if (!url.pathname.endsWith("/v1")) {
		const pathname = url.pathname.replace(/\/+$/, "");
		url.pathname = `${pathname === "" || pathname === "/" ? "" : pathname}/v1`;
	}
	return url.toString();
}

export function resolveOpenAiCompatibleModelSourceCandidates(
	baseUrl: string | URL,
): OpenAiCompatibleModelSourceCandidate[] {
	const inputUrl = cloneCleanUrl(baseUrl);
	const explicitModelsUrl = inputUrl.pathname.endsWith("/models");
	const normalizedBaseUrl = removeModelsSuffix(inputUrl);
	const candidates: OpenAiCompatibleModelSourceCandidate[] = [];
	const seen = new Set<string>();

	const addCandidate = (candidateBaseUrl: URL) => {
		const base = cloneCleanUrl(candidateBaseUrl);
		const modelsSourceUrl = appendPathSegment(base, "models");
		if (seen.has(modelsSourceUrl)) return;
		seen.add(modelsSourceUrl);
		candidates.push({
			baseUrl: base.toString(),
			modelsSourceUrl,
			client: "openai-compatible",
		});
	};

	if (!explicitModelsUrl) {
		const pathname = normalizedBaseUrl.pathname.replace(/\/+$/, "");
		if (!pathname.endsWith("/v1")) {
			const v1BaseUrl = cloneCleanUrl(normalizedBaseUrl);
			v1BaseUrl.pathname = `${pathname === "" || pathname === "/" ? "" : pathname}/v1`;
			addCandidate(v1BaseUrl);
		}
	}

	addCandidate(normalizedBaseUrl);
	return candidates;
}

export function resolveThirdPartyModelSourceCandidates(
	baseUrl: string,
): OpenAiCompatibleModelSourceCandidate[] {
	const client = resolveThirdPartyClient(baseUrl);
	if (client !== "anthropic") {
		return resolveOpenAiCompatibleModelSourceCandidates(baseUrl);
	}

	const normalizedBaseUrl = cloneCleanUrl(baseUrl);
	return resolveOpenAiCompatibleModelSourceCandidates(normalizedBaseUrl).map(
		(candidate) => ({
			...candidate,
			baseUrl: resolveAnthropicBaseUrl(normalizedBaseUrl),
			client,
		}),
	);
}

function formatModelsFetchError(
	candidates: OpenAiCompatibleModelSourceCandidate[],
	failures: { url: string; error: unknown }[],
): Error {
	const attempted = candidates.map((candidate) => candidate.modelsSourceUrl);
	const details = failures
		.map(({ url, error }) => {
			const detail = error instanceof Error ? error.message : String(error);
			return `${url}：${detail}`;
		})
		.join("；");
	return new Error(
		`获取模型失败，已尝试：${attempted.join("、")}。${details}`,
	);
}

async function registerStaticThirdPartyProvider(
	providerSettingsManager: ProviderSettingsManager,
	input: {
		baseUrl: string;
		apiKey?: string;
		models: readonly string[];
		defaultModelId: string;
		client: "openai-compatible" | "anthropic";
	},
): Promise<OpenAiCompatibleModelSourceCandidate> {
	const models = [...input.models];
	await updateLocalProvider(providerSettingsManager, {
		providerId: THIRD_PARTY_PROVIDER_ID,
		name: THIRD_PARTY_PROVIDER_NAME,
		baseUrl: input.baseUrl,
		apiKey: input.apiKey,
		models,
		modelsSourceUrl: null,
		defaultModelId: input.defaultModelId,
		client: input.client,
		protocol: input.client === "anthropic" ? "anthropic" : "openai-chat",
		capabilities: mergeCapabilitiesForModels(input.models, input.client),
		modelCapabilities: Object.fromEntries(
			models.map((model) => [
				model,
				inferModelCapabilities(model, input.client),
			]),
		),
		timeoutMs: MODEL_FETCH_TIMEOUT_MS,
		headers:
			input.client === "anthropic"
				? { "x-cline-auth-method": THIRD_PARTY_ANTHROPIC_AUTH_METHOD }
				: undefined,
	});
	return {
		baseUrl: input.baseUrl,
		modelsSourceUrl: "",
		client: input.client,
	};
}

function resolveFallbackModelSet(input: {
	preferredModelId?: string;
	client: "openai-compatible" | "anthropic";
}): { models: string[]; defaultModelId: string } {
	const preferredModelId = input.preferredModelId?.trim();
	const defaultModelId =
		preferredModelId ||
		(input.client === "anthropic"
			? GENERIC_THIRD_PARTY_ANTHROPIC_DEFAULT_MODEL
			: GENERIC_THIRD_PARTY_DEFAULT_MODEL);
	return {
		defaultModelId,
		models: [
			defaultModelId,
			...GENERIC_THIRD_PARTY_FALLBACK_MODELS.filter(
				(model) => model !== defaultModelId,
			),
		],
	};
}

export async function updateThirdPartyProviderFromModelsSource(
	providerSettingsManager: ProviderSettingsManager,
	input: {
		baseUrl: string;
		apiKey?: string;
		preferredModelId?: string;
	},
): Promise<OpenAiCompatibleModelSourceCandidate> {
	if (!providerSettingsManager.getProviderSettings(THIRD_PARTY_PROVIDER_ID)) {
		providerSettingsManager.saveProviderSettings(
			{
				provider: THIRD_PARTY_PROVIDER_ID,
				baseUrl: input.baseUrl,
				apiKey: input.apiKey,
				model: input.preferredModelId,
			},
			{ setLastUsed: false },
		);
	}
	const candidates = resolveThirdPartyModelSourceCandidates(input.baseUrl);
	const failures: { url: string; error: unknown }[] = [];
	for (const candidate of candidates) {
		try {
			await updateLocalProvider(providerSettingsManager, {
				providerId: THIRD_PARTY_PROVIDER_ID,
				name: THIRD_PARTY_PROVIDER_NAME,
				baseUrl: candidate.baseUrl,
				apiKey: input.apiKey,
				models: input.preferredModelId ? [input.preferredModelId] : undefined,
				modelsSourceUrl: candidate.modelsSourceUrl,
				defaultModelId: input.preferredModelId,
				client: candidate.client,
				protocol:
					candidate.client === "anthropic" ? "anthropic" : "openai-chat",
				capabilities: mergeCapabilitiesForModels(
					input.preferredModelId ? [input.preferredModelId] : [],
					candidate.client,
				),
				modelCapabilities: input.preferredModelId
					? {
							[input.preferredModelId]: inferModelCapabilities(
								input.preferredModelId,
								candidate.client,
							),
						}
					: undefined,
				timeoutMs: MODEL_FETCH_TIMEOUT_MS,
				headers:
					candidate.client === "anthropic"
						? { "x-cline-auth-method": THIRD_PARTY_ANTHROPIC_AUTH_METHOD }
						: undefined,
			});
			return candidate;
		} catch (error) {
			failures.push({ url: candidate.modelsSourceUrl, error });
		}
	}
	const firstCandidate = candidates[0];
	if (failures.length === candidates.length) {
		const client =
			firstCandidate?.client ?? resolveThirdPartyClient(input.baseUrl);
		const fallback = resolveFallbackModelSet({
			preferredModelId: input.preferredModelId,
			client,
		});
		return await registerStaticThirdPartyProvider(providerSettingsManager, {
			baseUrl: firstCandidate?.baseUrl ?? input.baseUrl,
			apiKey: input.apiKey,
			models: fallback.models,
			defaultModelId: fallback.defaultModelId,
			client,
		});
	}
	throw formatModelsFetchError(candidates, failures);
}

export async function loadThirdPartyProviderModels(
	providerSettingsManager: ProviderSettingsManager,
): Promise<{
	models: LocalProviderModels;
	defaultModelId: string;
}> {
	const settings = providerSettingsManager.getProviderSettings(
		THIRD_PARTY_PROVIDER_ID,
	);
	const baseUrl = settings?.baseUrl?.trim();
	if (baseUrl) {
		await updateThirdPartyProviderFromModelsSource(providerSettingsManager, {
			baseUrl,
			apiKey: settings?.apiKey,
			preferredModelId: settings?.model,
		});
	} else {
		await refreshProviderModelsFromSource(
			providerSettingsManager,
			THIRD_PARTY_PROVIDER_ID,
		).catch(() => {});
	}
	return readThirdPartyProviderModels(providerSettingsManager);
}

export async function loadThirdPartyAccountBalance(
	providerSettingsManager: ProviderSettingsManager,
): Promise<ThirdPartyAccountBalance | undefined> {
	const settings = providerSettingsManager.getProviderSettings(
		THIRD_PARTY_PROVIDER_ID,
	);
	const baseUrl = settings?.baseUrl?.trim();
	const apiKey = settings?.apiKey?.trim();
	if (!baseUrl || !apiKey) {
		return undefined;
	}

	const sourceUrl = resolveThirdPartyUsageUrl(baseUrl);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), USAGE_FETCH_TIMEOUT_MS);
	try {
		const response = await fetch(sourceUrl, {
			headers: {
				authorization: `Bearer ${apiKey}`,
				"x-api-key": apiKey,
			},
			signal: controller.signal,
		});
		if (!response.ok) {
			return undefined;
		}
		const payload = await response.json();
		return parseThirdPartyAccountBalance(payload, sourceUrl);
	} catch {
		return undefined;
	} finally {
		clearTimeout(timeout);
	}
}

export async function readThirdPartyProviderModels(
	providerSettingsManager: ProviderSettingsManager,
): Promise<{
	models: LocalProviderModels;
	defaultModelId: string;
}> {
	const { models } = await getLocalProviderModels(THIRD_PARTY_PROVIDER_ID);
	const defaultModelId =
		providerSettingsManager.getProviderSettings(THIRD_PARTY_PROVIDER_ID)
			?.model ??
		models[0]?.id ??
		"";
	return { models, defaultModelId };
}

export function providerModelsToKnownModels(
	models: LocalProviderModels,
): Record<string, Llms.ModelInfo> {
	return Object.fromEntries(
		models.map((model) => [
			model.id,
			{
				id: model.id,
				name: model.name || model.id,
				capabilities: [
					...(model.supportsVision ? (["images"] as const) : []),
					...(model.supportsReasoning ? (["reasoning"] as const) : []),
					"tools" as const,
				],
			},
		]),
	);
}
