function parseModelIdList(input: unknown): string[] {
	if (!Array.isArray(input)) return [];
	return input
		.map((item) => {
			if (typeof item === "string") return item.trim();
			if (item && typeof item === "object") {
				const entry = item as { id?: unknown; name?: unknown; model?: unknown };
				for (const value of [entry.id, entry.name, entry.model]) {
					if (typeof value === "string" && value.trim()) {
						return value.trim();
					}
				}
			}
			return "";
		})
		.filter((id) => id.length > 0);
}

export function extractModelIdsFromPayload(
	payload: unknown,
	providerId: string,
): string[] {
	const rootArray = parseModelIdList(payload);
	if (rootArray.length > 0) return rootArray;
	if (!payload || typeof payload !== "object") return [];

	const data = payload as {
		data?: unknown;
		models?: unknown;
		providers?: Record<string, unknown>;
	};

	const direct = parseModelIdList(data.data ?? data.models);
	if (direct.length > 0) return direct;

	if (
		data.models &&
		typeof data.models === "object" &&
		!Array.isArray(data.models)
	) {
		const keys = Object.keys(data.models).filter((k) => k.trim().length > 0);
		if (keys.length > 0) return keys;
	}

	const scoped = data.providers?.[providerId];
	if (scoped && typeof scoped === "object") {
		const nested = scoped as { models?: unknown };
		const list = parseModelIdList(nested.models ?? scoped);
		if (list.length > 0) return list;
	}

	return [];
}

export interface FetchModelIdsFromSourceOptions {
	apiKey?: string | null;
	headers?: Record<string, string> | null;
	timeoutMs?: number | null;
}

function formatResponseBodySnippet(value: string): string {
	const normalized = value.replace(/\s+/g, " ").trim();
	return normalized.length > 180
		? `${normalized.slice(0, 180)}...`
		: normalized;
}

export async function fetchModelIdsFromSource(
	url: string,
	providerId: string,
	options: FetchModelIdsFromSourceOptions = {},
): Promise<string[]> {
	const headers = new Headers(options.headers ?? undefined);
	const apiKey = options.apiKey?.trim();
	if (apiKey && !headers.has("authorization")) {
		headers.set("authorization", `Bearer ${apiKey}`);
	}
	if (!headers.has("accept")) {
		headers.set("accept", "application/json");
	}

	const timeoutMs = options.timeoutMs;
	const controller =
		typeof timeoutMs === "number" && timeoutMs > 0
			? new AbortController()
			: undefined;
	const timeout =
		controller && timeoutMs
			? setTimeout(() => controller.abort(), timeoutMs)
			: undefined;
	let response: Response;
	try {
		response = await fetch(url, {
			method: "GET",
			headers,
			signal: controller?.signal,
		});
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new Error(`获取模型超时：${url}`);
		}
		throw error;
	} finally {
		if (timeout) clearTimeout(timeout);
	}
	const bodyText =
		typeof response.text === "function"
			? await response.text().catch(() => "")
			: "";
	if (!response.ok) {
		const body = formatResponseBodySnippet(bodyText);
		const detail = body ? `：${body}` : "";
		throw new Error(
			`获取模型失败：${url} 返回 HTTP ${response.status}${detail}`,
		);
	}
	let payload: unknown;
	try {
		payload = JSON.parse(bodyText);
	} catch {
		const contentType =
			typeof response.headers?.get === "function"
				? (response.headers.get("content-type") ?? "未知类型")
				: "未知类型";
		const body = formatResponseBodySnippet(bodyText);
		const detail = body ? `，响应片段：${body}` : "";
		throw new Error(
			`模型接口返回的不是 JSON（${contentType}）：${url}${detail}`,
		);
	}
	const modelIds = extractModelIdsFromPayload(payload, providerId);
	if (modelIds.length === 0) {
		throw new Error(`模型接口未返回可识别的模型 ID：${url}`);
	}
	return modelIds;
}

function trimTrailingSlash(value: string): string {
	return value.replace(/\/+$/, "");
}

export function resolveModelsSourceUrl(
	baseUrl: string | undefined,
	defaultBaseUrl: string | undefined,
	modelsSourceUrl: string | undefined,
): string | undefined {
	const source = modelsSourceUrl?.trim();
	if (!source) return undefined;
	const configuredBase = baseUrl?.trim();
	if (!configuredBase || !defaultBaseUrl?.trim()) return source;

	try {
		const sourceUrl = new URL(source);
		const defaultBase = new URL(defaultBaseUrl);
		const configured = new URL(configuredBase);
		if (sourceUrl.origin !== defaultBase.origin) return source;

		const defaultPath = trimTrailingSlash(defaultBase.pathname);
		const configuredPath = trimTrailingSlash(configured.pathname);
		if (defaultPath && sourceUrl.pathname.startsWith(`${defaultPath}/`)) {
			const suffix = sourceUrl.pathname.slice(defaultPath.length);
			configured.pathname = `${configuredPath}${suffix}`;
		} else {
			configured.pathname = sourceUrl.pathname;
		}
		configured.search = sourceUrl.search;
		configured.hash = sourceUrl.hash;
		return configured.toString();
	} catch {
		return source;
	}
}
