import type { AgentMessage, AgentModelEvent } from "@cline/shared";
import { registerProvider, unregisterProvider } from "../model-registry";
import { createGateway } from "../gateway";

type Scenario = "success" | "auth" | "anthropic" | "anthropic-auto";

async function collect(
	iterable: AsyncIterable<AgentModelEvent>,
): Promise<AgentModelEvent[]> {
	const events: AgentModelEvent[] = [];
	for await (const event of iterable) {
		events.push(event);
	}
	return events;
}

function sseResponse(events: string[]): Response {
	return new Response(`${events.map((event) => `data: ${event}`).join("\n\n")}\n\n`, {
		headers: { "content-type": "text/event-stream" },
	});
}

const baseMessages: AgentMessage[] = [
	{
		id: "user_1",
		role: "user",
		content: [{ type: "text", text: "你好" }],
		createdAt: Date.now(),
	},
];

async function runSuccessScenario() {
	const requests: Array<{
		url: string;
		headers: Record<string, string>;
		body: unknown;
	}> = [];
	const fetchImpl = async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const headers = new Headers(init?.headers);
		requests.push({
			url: String(input),
			headers: Object.fromEntries(headers.entries()),
			body:
				typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
		});
		return sseResponse([
			JSON.stringify({
				id: "chatcmpl_1",
				object: "chat.completion.chunk",
				created: 1,
				model: "relay-model",
				choices: [
					{ index: 0, delta: { role: "assistant" }, finish_reason: null },
				],
			}),
			JSON.stringify({
				id: "chatcmpl_1",
				object: "chat.completion.chunk",
				created: 1,
				model: "relay-model",
				choices: [
					{
						index: 0,
						delta: { reasoning_content: "先思考。" },
						finish_reason: null,
					},
				],
			}),
			JSON.stringify({
				id: "chatcmpl_1",
				object: "chat.completion.chunk",
				created: 1,
				model: "relay-model",
				choices: [
					{ index: 0, delta: { content: "你好。" }, finish_reason: null },
				],
			}),
			JSON.stringify({
				id: "chatcmpl_1",
				object: "chat.completion.chunk",
				created: 1,
				model: "relay-model",
				choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
				usage: {
					prompt_tokens: 3,
					completion_tokens: 2,
					total_tokens: 5,
					prompt_tokens_details: { cached_tokens: 1 },
				},
			}),
			"[DONE]",
		]);
	};

	const gateway = createGateway({
		builtins: ["openai-compatible"],
		providerConfigs: [
			{
				providerId: "openai-compatible",
				apiKey: "relay-key",
				baseUrl: "https://relay.example/v1",
				headers: { "x-session-id": "task-1" },
				defaultModelId: "relay-model",
				models: [
					{
						id: "relay-model",
						name: "Relay Model",
						capabilities: ["reasoning", "tools"],
					},
				],
				fetch: fetchImpl,
			},
		],
	});

	const events = await collect(
		await gateway.stream({
			providerId: "openai-compatible",
			modelId: "relay-model",
			messages: baseMessages,
		}),
	);

	return { requests, events };
}

async function runAuthScenario() {
	const fetchImpl = async (): Promise<Response> =>
		new Response(
			JSON.stringify({
				error: {
					message: "Invalid API key",
					type: "invalid_request_error",
					code: "invalid_api_key",
				},
			}),
			{
				status: 401,
				statusText: "Unauthorized",
				headers: { "content-type": "application/json" },
			},
		);

	const gateway = createGateway({
		builtins: ["openai-compatible"],
		providerConfigs: [
			{
				providerId: "openai-compatible",
				apiKey: "bad-key",
				baseUrl: "https://relay.example/v1",
				defaultModelId: "relay-model",
				models: [{ id: "relay-model", name: "Relay Model" }],
				fetch: fetchImpl,
			},
		],
	});

	const events = await collect(
		await gateway.stream({
			providerId: "openai-compatible",
			modelId: "relay-model",
			messages: baseMessages,
		}),
	);

	return { events };
}

async function runAnthropicScenario() {
	const requests: Array<{
		url: string;
		headers: Record<string, string>;
		body: unknown;
	}> = [];
	const fetchImpl = async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const headers = new Headers(init?.headers);
		requests.push({
			url: String(input),
			headers: Object.fromEntries(headers.entries()),
			body:
				typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
		});
		return sseResponse([
			JSON.stringify({
				type: "message_start",
				message: {
					id: "msg_1",
					type: "message",
					role: "assistant",
					model: "deepseek-v4-pro",
					content: [],
					stop_reason: null,
					stop_sequence: null,
					usage: { input_tokens: 3, output_tokens: 0 },
				},
			}),
			JSON.stringify({
				type: "content_block_start",
				index: 0,
				content_block: { type: "text", text: "" },
			}),
			JSON.stringify({
				type: "content_block_delta",
				index: 0,
				delta: { type: "text_delta", text: "我是 DeepSeek。" },
			}),
			JSON.stringify({ type: "content_block_stop", index: 0 }),
			JSON.stringify({
				type: "message_delta",
				delta: { stop_reason: "end_turn", stop_sequence: null },
				usage: { output_tokens: 4 },
			}),
			JSON.stringify({ type: "message_stop" }),
		]);
	};

	const gateway = createGateway({
		builtins: ["openai-compatible"],
		providers: [
			{
				manifest: {
					id: "openai-compatible",
					name: "三方 API",
					defaultModelId: "deepseek-v4-pro",
					models: [
						{
							id: "deepseek-v4-pro",
							name: "deepseek-v4-pro",
							providerId: "openai-compatible",
						},
					],
				},
				loadProvider: async () => {
					const module = await import("../ai-sdk");
					return { createProvider: module.createAnthropicProvider };
				},
			},
		],
		providerConfigs: [
			{
				providerId: "openai-compatible",
				apiKey: "deepseek-key",
				baseUrl: "https://api.deepseek.com/anthropic",
				headers: { "x-cline-auth-method": "x-api-key" },
				defaultModelId: "deepseek-v4-pro",
				fetch: fetchImpl,
			},
		],
	});

	const events = await collect(
		await gateway.stream({
			providerId: "openai-compatible",
			modelId: "deepseek-v4-pro",
			messages: baseMessages,
		}),
	);

	return { requests, events };
}

async function runAnthropicAutoScenario() {
	const requests: Array<{
		url: string;
		headers: Record<string, string>;
		body: unknown;
	}> = [];
	const fetchImpl = async (
		input: RequestInfo | URL,
		init?: RequestInit,
	): Promise<Response> => {
		const headers = new Headers(init?.headers);
		requests.push({
			url: String(input),
			headers: Object.fromEntries(headers.entries()),
			body:
				typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
		});
		return sseResponse([
			JSON.stringify({
				type: "message_start",
				message: {
					id: "msg_1",
					type: "message",
					role: "assistant",
					model: "deepseek-v4-pro",
					content: [],
					stop_reason: null,
					stop_sequence: null,
					usage: { input_tokens: 3, output_tokens: 0 },
				},
			}),
			JSON.stringify({
				type: "content_block_start",
				index: 0,
				content_block: { type: "text", text: "" },
			}),
			JSON.stringify({
				type: "content_block_delta",
				index: 0,
				delta: { type: "text_delta", text: "自动适配成功。" },
			}),
			JSON.stringify({ type: "content_block_stop", index: 0 }),
			JSON.stringify({
				type: "message_delta",
				delta: { stop_reason: "end_turn", stop_sequence: null },
				usage: { output_tokens: 4 },
			}),
			JSON.stringify({ type: "message_stop" }),
		]);
	};

	unregisterProvider("openai-compatible");
	registerProvider({
		provider: {
			id: "openai-compatible",
			name: "三方 API",
			baseUrl: "https://api.deepseek.com/anthropic/v1",
			defaultModelId: "deepseek-v4-pro",
			protocol: "anthropic",
			client: "anthropic",
			source: "file",
		},
		models: {
			"deepseek-v4-pro": {
				id: "deepseek-v4-pro",
				name: "deepseek-v4-pro",
				capabilities: ["tools", "reasoning"],
			},
		},
	});

	try {
		const module = await import("../compat");
		const handler = module.createGatewayApiHandler({
			providerId: "openai-compatible",
			clientType: "anthropic",
			modelId: "deepseek-v4-pro",
			apiKey: "deepseek-key",
			baseUrl: "https://api.deepseek.com/anthropic/v1",
			headers: { "x-cline-auth-method": "x-api-key" },
			fetch: fetchImpl,
		});

		const events = await collect(
			handler.createMessage("", [{ role: "user", content: "你好" }]),
		);
		return { requests, events };
	} finally {
		unregisterProvider("openai-compatible");
	}
}

async function main() {
	const scenario = process.argv[2] as Scenario | undefined;
	if (scenario === "success") {
		console.log(JSON.stringify(await runSuccessScenario()));
		return;
	}
	if (scenario === "auth") {
		console.log(JSON.stringify(await runAuthScenario()));
		return;
	}
	if (scenario === "anthropic") {
		console.log(JSON.stringify(await runAnthropicScenario()));
		return;
	}
	if (scenario === "anthropic-auto") {
		console.log(JSON.stringify(await runAnthropicAutoScenario()));
		return;
	}
	throw new Error(`未知测试场景：${scenario ?? ""}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? (error.stack ?? error.message) : error);
	process.exit(1);
});
