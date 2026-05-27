import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { getLocalProviderModels, ProviderSettingsManager } from "@cline/core";
import { describe, expect, it, vi } from "vitest";
import {
	loadThirdPartyAccountBalance,
	loadThirdPartyProviderModels,
	parseThirdPartyAccountBalance,
	resolveOpenAiCompatibleModelSourceCandidates,
	resolveThirdPartyModelSourceCandidates,
	resolveThirdPartyUsageUrl,
	THIRD_PARTY_PROVIDER_ID,
	updateThirdPartyProviderFromModelsSource,
} from "./third-party-api";

function urls(input: string): string[] {
	return resolveOpenAiCompatibleModelSourceCandidates(input).map((candidate) =>
		candidate.modelsSourceUrl
	);
}

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(payload), {
		...init,
		headers: {
			"content-type": "application/json",
			...(init?.headers as Record<string, string> | undefined),
		},
	});
}

describe("third-party API model source resolution", () => {
	it("tries /v1/models before /models for a root URL", () => {
		expect(urls("https://nbgapi.com/")).toEqual([
			"https://nbgapi.com/v1/models",
			"https://nbgapi.com/models",
		]);
	});

	it("accepts a bare host and defaults to https", () => {
		expect(urls("nbgapi.com")).toEqual([
			"https://nbgapi.com/v1/models",
			"https://nbgapi.com/models",
		]);
	});

	it("keeps an explicit /v1 base URL", () => {
		expect(urls("https://nbgapi.com/v1")).toEqual([
			"https://nbgapi.com/v1/models",
		]);
	});

	it("normalizes a pasted /models endpoint back to its base", () => {
		expect(urls("https://nbgapi.com/v1/models")).toEqual([
			"https://nbgapi.com/v1/models",
		]);
	});

	it("normalizes common OpenAI request endpoints before appending /models", () => {
		expect(urls("https://nbgapi.com/v1/chat/completions")).toEqual([
			"https://nbgapi.com/v1/models",
		]);
		expect(urls("https://nbgapi.com/v1/responses")).toEqual([
			"https://nbgapi.com/v1/models",
		]);
	});

	it("normalizes common OpenAI endpoints before querying usage", () => {
		expect(resolveThirdPartyUsageUrl("https://nbgapi.com/")).toBe(
			"https://nbgapi.com/v1/usage",
		);
		expect(
			resolveThirdPartyUsageUrl("https://nbgapi.com/v1/chat/completions"),
		).toBe("https://nbgapi.com/v1/usage");
	});

	it("detects Anthropic-compatible third-party endpoints", () => {
		expect(
			resolveThirdPartyModelSourceCandidates(
				"https://api.deepseek.com/anthropic",
			),
		).toEqual([
			{
				baseUrl: "https://api.deepseek.com/anthropic/v1",
				modelsSourceUrl: "https://api.deepseek.com/anthropic/v1/models",
				client: "anthropic",
			},
			{
				baseUrl: "https://api.deepseek.com/anthropic/v1",
				modelsSourceUrl: "https://api.deepseek.com/anthropic/models",
				client: "anthropic",
			},
		]);
	});

	it("does not duplicate /v1 for Anthropic-compatible third-party endpoints", () => {
		expect(
			resolveThirdPartyModelSourceCandidates(
				"https://api.deepseek.com/anthropic/v1",
			),
		).toEqual([
			{
				baseUrl: "https://api.deepseek.com/anthropic/v1",
				modelsSourceUrl: "https://api.deepseek.com/anthropic/v1/models",
				client: "anthropic",
			},
		]);
	});
});

describe("third-party API model persistence", () => {
	it("preserves the saved model when refreshing upstream models omit it", async () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "third-party-api-test-"));
		const manager = new ProviderSettingsManager({
			filePath: path.join(dir, "providers.json"),
		});
		manager.saveProviderSettings(
			{
				provider: THIRD_PARTY_PROVIDER_ID,
				baseUrl: "https://nbgapi.example/v1",
				model: "gpt-5.5",
			},
			{ setLastUsed: false },
		);
		const fetchMock = vi.fn(async () =>
			jsonResponse({ data: [{ id: "gpt-5.4" }] }),
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			await updateThirdPartyProviderFromModelsSource(manager, {
				baseUrl: "https://nbgapi.example/",
				apiKey: "test-key",
				preferredModelId: "gpt-5.5",
			});

			expect(
				manager.getProviderSettings(THIRD_PARTY_PROVIDER_ID)?.model,
			).toBe("gpt-5.5");

			await loadThirdPartyProviderModels(manager);

			expect(
				manager.getProviderSettings(THIRD_PARTY_PROVIDER_ID)?.model,
			).toBe("gpt-5.5");

			const { models } = await getLocalProviderModels(THIRD_PARTY_PROVIDER_ID);
			expect(models).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: "gpt-5.5",
						supportsReasoning: true,
					}),
					expect.objectContaining({
						id: "gpt-5.4",
						supportsReasoning: true,
					}),
				]),
			);
		} finally {
			globalThis.fetch = originalFetch;
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("falls back from /v1/models to /models and sends the API key", async () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "third-party-api-test-"));
		const manager = new ProviderSettingsManager({
			filePath: path.join(dir, "providers.json"),
		});
		manager.saveProviderSettings(
			{
				provider: THIRD_PARTY_PROVIDER_ID,
				baseUrl: "https://relay.example/",
				apiKey: "test-key",
			},
			{ setLastUsed: false },
		);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response("<html>not found</html>", {
					status: 404,
					headers: { "content-type": "text/html" },
				}),
			)
			.mockResolvedValueOnce(
				jsonResponse({ data: [{ id: "gpt-5.5" }, { id: "gpt-5.4" }] }),
			);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			const candidate = await updateThirdPartyProviderFromModelsSource(manager, {
				baseUrl: "https://relay.example/",
				apiKey: "test-key",
				preferredModelId: "gpt-5.5",
			});

			expect(candidate).toEqual({
				baseUrl: "https://relay.example/",
				modelsSourceUrl: "https://relay.example/models",
				client: "openai-compatible",
			});
			expect(fetchMock).toHaveBeenNthCalledWith(
				1,
				"https://relay.example/v1/models",
				expect.any(Object),
			);
			expect(fetchMock).toHaveBeenNthCalledWith(
				2,
				"https://relay.example/models",
				expect.any(Object),
			);
			for (const call of fetchMock.mock.calls) {
				const init = call[1] as RequestInit;
				const headers = new Headers(init.headers);
				expect(headers.get("authorization")).toBe("Bearer test-key");
				expect(headers.get("accept")).toBe("application/json");
			}
			expect(
				manager.getProviderSettings(THIRD_PARTY_PROVIDER_ID)?.model,
			).toBe("gpt-5.5");
		} finally {
			globalThis.fetch = originalFetch;
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("infers capabilities per discovered model instead of marking every relay model as reasoning", async () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "third-party-api-test-"));
		const manager = new ProviderSettingsManager({
			filePath: path.join(dir, "providers.json"),
		});
		manager.saveProviderSettings(
			{
				provider: THIRD_PARTY_PROVIDER_ID,
				baseUrl: "https://relay.example/v1",
				apiKey: "test-key",
			},
			{ setLastUsed: false },
		);
		const fetchMock = vi.fn(async () =>
			jsonResponse({
				data: [
					{ id: "plain-chat-model" },
					{ id: "claude-sonnet-4-6" },
					{ id: "kimi-k2.6" },
					{ id: "deepseek-v4-pro" },
				],
			}),
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			await updateThirdPartyProviderFromModelsSource(manager, {
				baseUrl: "https://relay.example/v1",
				apiKey: "test-key",
				preferredModelId: "plain-chat-model",
			});

			const { models } = await getLocalProviderModels(THIRD_PARTY_PROVIDER_ID);
			const byId = Object.fromEntries(models.map((model) => [model.id, model]));
			expect(byId["plain-chat-model"]?.supportsReasoning).toBe(false);
			expect(byId["plain-chat-model"]?.supportsVision).toBe(false);
			expect(byId["claude-sonnet-4-6"]?.supportsReasoning).toBe(true);
			expect(byId["kimi-k2.6"]?.supportsReasoning).toBe(true);
			expect(byId["deepseek-v4-pro"]?.supportsReasoning).toBe(true);
		} finally {
			globalThis.fetch = originalFetch;
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("persists Anthropic-compatible third-party endpoints with the Anthropic client", async () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "third-party-api-test-"));
		const manager = new ProviderSettingsManager({
			filePath: path.join(dir, "providers.json"),
		});
		manager.saveProviderSettings(
			{
				provider: THIRD_PARTY_PROVIDER_ID,
				baseUrl: "https://api.deepseek.com/anthropic",
				apiKey: "test-key",
			},
			{ setLastUsed: false },
		);
		const fetchMock = vi.fn(async () =>
			jsonResponse({ data: [{ id: "claude-sonnet-4-5" }] }),
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			const candidate = await updateThirdPartyProviderFromModelsSource(manager, {
				baseUrl: "https://api.deepseek.com/anthropic",
				apiKey: "test-key",
				preferredModelId: "claude-sonnet-4-5",
			});

			expect(candidate.client).toBe("anthropic");
			expect(fetchMock).toHaveBeenCalledWith(
				"https://api.deepseek.com/anthropic/v1/models",
				expect.any(Object),
			);
			expect(manager.getProviderSettings(THIRD_PARTY_PROVIDER_ID)).toMatchObject({
				client: "anthropic",
				protocol: "anthropic",
				baseUrl: "https://api.deepseek.com/anthropic/v1",
				model: "claude-sonnet-4-5",
				headers: { "x-cline-auth-method": "x-api-key" },
			});
		} finally {
			globalThis.fetch = originalFetch;
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("uses generic fallback models when an Anthropic-compatible relay has no models API", async () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "third-party-api-test-"));
		const manager = new ProviderSettingsManager({
			filePath: path.join(dir, "providers.json"),
		});
		manager.saveProviderSettings(
			{
				provider: THIRD_PARTY_PROVIDER_ID,
				baseUrl: "https://api.deepseek.com/anthropic",
				apiKey: "test-key",
			},
			{ setLastUsed: false },
		);
		const fetchMock = vi.fn(async () =>
			new Response("not found", {
				status: 404,
				headers: { "content-type": "text/plain" },
			}),
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			const candidate = await updateThirdPartyProviderFromModelsSource(manager, {
				baseUrl: "https://api.deepseek.com/anthropic",
				apiKey: "test-key",
			});

			expect(candidate).toEqual({
				baseUrl: "https://api.deepseek.com/anthropic/v1",
				modelsSourceUrl: "",
				client: "anthropic",
			});
			expect(fetchMock).toHaveBeenCalledTimes(2);
			expect(manager.getProviderSettings(THIRD_PARTY_PROVIDER_ID)).toMatchObject({
				client: "anthropic",
				protocol: "anthropic",
				baseUrl: "https://api.deepseek.com/anthropic/v1",
				model: "claude-sonnet-4-6",
				headers: { "x-cline-auth-method": "x-api-key" },
			});
			const { models } = await getLocalProviderModels(THIRD_PARTY_PROVIDER_ID);
			expect(models.map((model) => model.id)).toEqual([
				"claude-haiku-4-5",
				"claude-opus-4-7",
				"claude-sonnet-4-6",
				"deepseek-v4-flash",
				"deepseek-v4-pro",
				"glm-5.1",
				"gpt-5.3-codex",
				"gpt-5.4",
				"kimi-k2.6",
				"qwen3.6-coder",
			]);
			expect(models).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: "claude-sonnet-4-6",
						supportsReasoning: true,
					}),
					expect.objectContaining({
						id: "gpt-5.3-codex",
						supportsReasoning: true,
					}),
					expect.objectContaining({
						id: "deepseek-v4-pro",
						supportsReasoning: true,
					}),
				]),
			);
		} finally {
			globalThis.fetch = originalFetch;
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("uses generic fallback models when discovery fails for an unknown relay", async () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "third-party-api-test-"));
		const manager = new ProviderSettingsManager({
			filePath: path.join(dir, "providers.json"),
		});
		manager.saveProviderSettings(
			{
				provider: THIRD_PARTY_PROVIDER_ID,
				baseUrl: "https://broken.example/",
				apiKey: "test-key",
			},
			{ setLastUsed: false },
		);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response("<html>login</html>", {
					status: 200,
					headers: { "content-type": "text/html" },
				}),
			)
			.mockResolvedValueOnce(jsonResponse({ data: [] }));
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			const candidate = await updateThirdPartyProviderFromModelsSource(manager, {
				baseUrl: "https://broken.example/",
				apiKey: "test-key",
			});

			expect(candidate).toEqual({
				baseUrl: "https://broken.example/v1",
				modelsSourceUrl: "",
				client: "openai-compatible",
			});
			expect(manager.getProviderSettings(THIRD_PARTY_PROVIDER_ID)).toMatchObject({
				client: "openai-compatible",
				protocol: "openai-chat",
				baseUrl: "https://broken.example/v1",
				model: "gpt-5.4",
			});
			const { models } = await getLocalProviderModels(THIRD_PARTY_PROVIDER_ID);
			expect(models.map((model) => model.id)).toEqual([
				"claude-haiku-4-5",
				"claude-opus-4-7",
				"claude-sonnet-4-6",
				"deepseek-v4-flash",
				"deepseek-v4-pro",
				"glm-5.1",
				"gpt-5.3-codex",
				"gpt-5.4",
				"kimi-k2.6",
				"qwen3.6-coder",
			]);
		} finally {
			globalThis.fetch = originalFetch;
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("third-party API balance", () => {
	it("parses direct and nested balance payloads", () => {
		expect(
			parseThirdPartyAccountBalance({
				data: { balance: "12.3456" },
			}),
		).toEqual({ balance: 12.3456, sourceUrl: "" });
		expect(
			parseThirdPartyAccountBalance({
				data: { quota: 20, used_quota: 7.5 },
			}),
		).toEqual({ balance: 12.5, sourceUrl: "" });
	});

	it("loads /v1/usage with the saved third-party API key", async () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "third-party-api-test-"));
		const manager = new ProviderSettingsManager({
			filePath: path.join(dir, "providers.json"),
		});
		manager.saveProviderSettings(
			{
				provider: THIRD_PARTY_PROVIDER_ID,
				baseUrl: "https://nbgapi.example/v1/chat/completions",
				apiKey: "test-key",
			},
			{ setLastUsed: false },
		);
		const fetchMock = vi.fn(async () =>
			jsonResponse({ data: { balance: 3.25 } }),
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock as typeof fetch;

		try {
			await expect(loadThirdPartyAccountBalance(manager)).resolves.toEqual({
				balance: 3.25,
				sourceUrl: "https://nbgapi.example/v1/usage",
			});
			expect(fetchMock).toHaveBeenCalledWith(
				"https://nbgapi.example/v1/usage",
				expect.objectContaining({
					headers: expect.objectContaining({
						authorization: "Bearer test-key",
						"x-api-key": "test-key",
					}),
				}),
			);
		} finally {
			globalThis.fetch = originalFetch;
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
