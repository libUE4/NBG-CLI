import { createAnthropic } from "@ai-sdk/anthropic";
import type {
	GatewayProviderContext,
	GatewayResolvedProviderConfig,
} from "@cline/shared";
import { resolveApiKey } from "../http";
import type { ProviderFactoryResult } from "./types";

const INTERNAL_AUTH_METHOD_HEADER = "x-cline-auth-method";

function normalizeAnthropicBaseUrl(baseUrl: string | undefined): string | undefined {
	if (!baseUrl) {
		return undefined;
	}
	try {
		const url = new URL(baseUrl);
		url.search = "";
		url.hash = "";
		const pathname = url.pathname.replace(/\/+$/, "");
		if (!pathname.endsWith("/v1")) {
			url.pathname = `${pathname === "" || pathname === "/" ? "" : pathname}/v1`;
		}
		return url.toString();
	} catch {
		return baseUrl;
	}
}

function resolveAnthropicHeaders(headers: Record<string, string> | undefined): {
	headers?: Record<string, string>;
	authMethod: "api-key" | "bearer";
} {
	const next: Record<string, string> = {};
	let authMethod: "api-key" | "bearer" = "api-key";

	for (const [key, value] of Object.entries(headers ?? {})) {
		if (key.toLowerCase() === INTERNAL_AUTH_METHOD_HEADER) {
			authMethod = value.toLowerCase() === "bearer" ? "bearer" : "api-key";
			continue;
		}
		next[key] = value;
	}

	return {
		headers: Object.keys(next).length > 0 ? next : undefined,
		authMethod,
	};
}

export async function createAnthropicProviderModule(
	config: GatewayResolvedProviderConfig,
	context: GatewayProviderContext,
): Promise<ProviderFactoryResult> {
	const apiKey = await resolveApiKey(config);
	const { headers, authMethod } = resolveAnthropicHeaders(config.headers);
	const provider = createAnthropic({
		...(authMethod === "bearer" ? { authToken: apiKey } : { apiKey }),
		...(config.baseUrl
			? { baseURL: normalizeAnthropicBaseUrl(config.baseUrl) }
			: {}),
		headers,
		fetch: config.fetch,
		name: context.provider.id,
	});
	return {
		model: (modelId) => provider(modelId),
	};
}
