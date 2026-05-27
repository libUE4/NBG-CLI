import type { AgentConfig, AgentModel, ITelemetryService } from "@cline/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gatewayMock = vi.hoisted(() => {
	const createAgentModel = vi.fn();
	const anthropicRegistration = { createProvider: vi.fn(), manifest: {} };
	const buildGatewayConfig = vi.fn((config) => {
		const providerId = config.providerId;
		const models = config.knownModels
			? Object.values(config.knownModels).map((model) => ({
					id: model.id,
					name: model.name ?? model.id,
					description: model.description,
					contextWindow: model.contextWindow,
					maxInputTokens: model.maxInputTokens,
					maxOutputTokens: model.maxTokens,
					capabilities: [
						"text",
						...(model.capabilities ?? []).map((capability) =>
							capability === "structured_output"
								? "structured-output"
								: capability,
						),
					],
					metadata: {
						family: model.family,
						pricing: model.pricing,
						status: model.status,
						releaseDate: model.releaseDate,
					},
				}))
			: undefined;
		return {
			providerId,
			apiKey: config.apiKey,
			baseUrl: config.baseUrl,
			headers: config.headers,
			models,
			options: {
				region: config.region ?? config.gcp?.region,
				authentication: config.aws?.authentication,
				profile: config.aws?.profile,
				project: config.gcp?.projectId,
				projectId: config.gcp?.projectId,
				location: config.region ?? config.gcp?.region,
			},
		};
	});
	return {
		anthropicRegistration,
		buildGatewayConfig,
		createAgentModel,
		createGateway: vi.fn(() => ({ createAgentModel })),
		resolveProviderRegistrationSync: vi.fn((config) =>
			config.clientType === "anthropic" ? anthropicRegistration : undefined,
		),
	};
});

vi.mock("@cline/llms", () => ({
	buildGatewayConfig: gatewayMock.buildGatewayConfig,
	createGateway: gatewayMock.createGateway,
	MODEL_COLLECTIONS_BY_PROVIDER_ID: {},
	resolveProviderRegistrationSync: gatewayMock.resolveProviderRegistrationSync,
}));

describe("createAgentModelFromConfig", () => {
	beforeEach(() => {
		gatewayMock.createAgentModel.mockReset();
		gatewayMock.buildGatewayConfig.mockClear();
		gatewayMock.createGateway.mockClear();
		gatewayMock.resolveProviderRegistrationSync.mockClear();
		gatewayMock.createGateway.mockImplementation(() => ({
			createAgentModel: gatewayMock.createAgentModel,
		}));
	});

	it("forwards effective telemetry into the gateway", async () => {
		const { createAgentModelFromConfig } = await import("./handler-factory");
		const logger = {
			debug: vi.fn(),
			log: vi.fn(),
			error: vi.fn(),
		};
		const telemetry = {
			capture: vi.fn(),
		} as unknown as ITelemetryService;
		const model = {} as AgentModel;
		gatewayMock.createAgentModel.mockReturnValue(model);

		const result = createAgentModelFromConfig(
			{
				providerId: "mock-provider",
				modelId: "mock-model",
				apiKey: "key",
				systemPrompt: "",
				tools: [],
			},
			logger,
			telemetry,
		);

		expect(result).toBe(model);
		expect(gatewayMock.createGateway).toHaveBeenCalledWith(
			expect.objectContaining({
				logger,
				telemetry,
			}),
		);
	});

	it("falls back to config telemetry when no override is supplied", async () => {
		const { createAgentModelFromConfig } = await import("./handler-factory");
		const telemetry = {
			capture: vi.fn(),
		} as unknown as ITelemetryService;

		createAgentModelFromConfig(
			{
				providerId: "mock-provider",
				modelId: "mock-model",
				apiKey: "key",
				systemPrompt: "",
				tools: [],
				telemetry,
			},
			undefined,
		);

		expect(gatewayMock.createGateway).toHaveBeenLastCalledWith(
			expect.objectContaining({
				telemetry,
			}),
		);
	});

	it("preserves model capabilities and metadata when configuring gateway models", async () => {
		const { createAgentModelFromConfig } = await import("./handler-factory");

		createAgentModelFromConfig(
			{
				providerId: "openrouter",
				modelId: "qwen/qwen3.6-plus",
				apiKey: "test-key",
				systemPrompt: "",
				tools: [],
				knownModels: {
					"qwen/qwen3.6-plus": {
						id: "qwen/qwen3.6-plus",
						name: "Qwen3.6 Plus",
						contextWindow: 1_000_000,
						maxInputTokens: 1_000_000,
						maxTokens: 65_536,
						capabilities: [
							"tools",
							"reasoning",
							"structured_output",
							"prompt-cache",
						],
						pricing: {
							input: 0.325,
							output: 1.95,
							cacheRead: 0.0325,
							cacheWrite: 0.40625,
						},
						releaseDate: "2026-04-02",
						family: "qwen",
					},
				},
			} satisfies AgentConfig,
			undefined,
		);

		const gatewayConfig = (
			gatewayMock.createGateway.mock.calls as unknown as Array<
				[
					{
						providerConfigs: Array<{
							models: Array<Record<string, unknown>>;
						}>;
					},
				]
			>
		)[0][0];
		const model = gatewayConfig.providerConfigs[0].models[0];
		expect(model).toMatchObject({
			id: "qwen/qwen3.6-plus",
			name: "Qwen3.6 Plus",
			contextWindow: 1_000_000,
			maxInputTokens: 1_000_000,
			maxOutputTokens: 65_536,
			capabilities: expect.arrayContaining([
				"text",
				"tools",
				"reasoning",
				"structured-output",
				"prompt-cache",
			]),
			metadata: {
				family: "qwen",
				pricing: {
					input: 0.325,
					output: 1.95,
					cacheRead: 0.0325,
					cacheWrite: 0.40625,
				},
				releaseDate: "2026-04-02",
			},
		});
	});

	it("registers custom providers with the configured client type", async () => {
		const { createAgentModelFromConfig } = await import("./handler-factory");

		createAgentModelFromConfig(
			{
				providerId: "openai-compatible",
				modelId: "claude-sonnet-4-5",
				apiKey: "test-key",
				systemPrompt: "",
				tools: [],
				providerConfig: {
					providerId: "openai-compatible",
					modelId: "claude-sonnet-4-5",
					clientType: "anthropic",
					baseUrl: "https://api.deepseek.com/anthropic",
					knownModels: {
						"claude-sonnet-4-5": {
							id: "claude-sonnet-4-5",
							name: "Claude Sonnet 4.5",
							capabilities: ["tools", "reasoning"],
						},
					},
				},
			},
			undefined,
		);

		expect(gatewayMock.resolveProviderRegistrationSync).toHaveBeenCalledWith(
			expect.objectContaining({
				providerId: "openai-compatible",
				clientType: "anthropic",
				baseUrl: "https://api.deepseek.com/anthropic",
			}),
		);
		expect(gatewayMock.createGateway).toHaveBeenLastCalledWith(
			expect.objectContaining({
				providers: [
					expect.objectContaining({
						manifest: expect.objectContaining({
							id: "openai-compatible",
							defaultModelId: "claude-sonnet-4-5",
							models: [
								expect.objectContaining({
									id: "claude-sonnet-4-5",
									providerId: "openai-compatible",
								}),
							],
						}),
						createProvider: gatewayMock.anthropicRegistration.createProvider,
					}),
				],
			}),
		);
	});

	it("forwards Bedrock AWS settings as gateway provider options", async () => {
		const { createAgentModelFromConfig } = await import("./handler-factory");

		createAgentModelFromConfig(
			{
				providerId: "bedrock",
				modelId: "anthropic.claude-sonnet-4-5-20250929-v1:0",
				systemPrompt: "",
				tools: [],
				providerConfig: {
					providerId: "bedrock",
					modelId: "anthropic.claude-sonnet-4-5-20250929-v1:0",
					region: "us-west-2",
					aws: {
						authentication: "profile",
						profile: "dev-profile",
					},
				},
			},
			undefined,
		);

		expect(gatewayMock.createGateway).toHaveBeenLastCalledWith(
			expect.objectContaining({
				providerConfigs: [
					expect.objectContaining({
						providerId: "bedrock",
						options: expect.objectContaining({
							region: "us-west-2",
							authentication: "profile",
							profile: "dev-profile",
						}),
					}),
				],
			}),
		);
	});

	it("forwards Vertex GCP settings as gateway provider options", async () => {
		const { createAgentModelFromConfig } = await import("./handler-factory");

		createAgentModelFromConfig(
			{
				providerId: "vertex",
				modelId: "gemini-3-flash-preview",
				systemPrompt: "",
				tools: [],
				providerConfig: {
					providerId: "vertex",
					modelId: "gemini-3-flash-preview",
					gcp: {
						projectId: "test-project",
						region: "global",
					},
				},
			},
			undefined,
		);

		expect(gatewayMock.createGateway).toHaveBeenLastCalledWith(
			expect.objectContaining({
				providerConfigs: [
					expect.objectContaining({
						providerId: "vertex",
						options: expect.objectContaining({
							project: "test-project",
							projectId: "test-project",
							location: "global",
							region: "global",
						}),
					}),
				],
			}),
		);
	});
});
