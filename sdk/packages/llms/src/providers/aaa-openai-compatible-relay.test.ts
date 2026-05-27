import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const fixturePath = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"test-fixtures/openai-compatible-relay-runtime.ts",
);

function runFixture(
	scenario: "success" | "auth" | "anthropic" | "anthropic-auto",
) {
	const runtime = process.versions.bun ? process.execPath : "bun";
	const result = spawnSync(runtime, [fixturePath, scenario], {
		cwd: resolve(dirname(fileURLToPath(import.meta.url)), "../../../../.."),
		encoding: "utf8",
		env: {
			...process.env,
			NODE_ENV: "test",
		},
	});
	expect(result.status, result.stderr).toBe(0);
	return JSON.parse(result.stdout) as {
		requests?: Array<{
			url: string;
			headers: Record<string, string>;
			body: Record<string, unknown>;
		}>;
		events: Array<Record<string, unknown>>;
	};
}

describe("openai-compatible relay runtime", () => {
	it("streams text, reasoning, usage, and sends relay credentials", () => {
		const result = runFixture("success");

		expect(result.requests).toHaveLength(1);
		expect(result.requests?.[0]?.url).toBe(
			"https://relay.example/v1/chat/completions",
		);
		expect(result.requests?.[0]?.headers).toEqual(
			expect.objectContaining({
				authorization: "Bearer relay-key",
				"x-session-id": "task-1",
			}),
		);
		expect(result.requests?.[0]?.body).toEqual(
			expect.objectContaining({
				model: "relay-model",
				stream: true,
				stream_options: { include_usage: true },
			}),
		);
		expect(result.events).toContainEqual({
			type: "reasoning-delta",
			text: "先思考。",
		});
		expect(result.events).toContainEqual({ type: "text-delta", text: "你好。" });
		expect(result.events).toContainEqual(
			expect.objectContaining({
				type: "usage",
				usage: expect.objectContaining({
					inputTokens: 3,
					outputTokens: 2,
					cacheReadTokens: 1,
				}),
			}),
		);
		expect(result.events.at(-1)).toEqual({
			type: "finish",
			reason: "stop",
		});
	});

	it("localizes real HTTP auth failures from relay endpoints", () => {
		const result = runFixture("auth");

		expect(result.events.at(-1)).toEqual({
			type: "finish",
			reason: "error",
			error: "API Key 无效或无权限",
		});
	});

	it("normalizes Anthropic-compatible relay URLs before sending messages", () => {
		const result = runFixture("anthropic");

		expect(result.requests).toHaveLength(1);
		expect(result.requests?.[0]?.url).toBe(
			"https://api.deepseek.com/anthropic/v1/messages",
		);
		expect(result.requests?.[0]?.headers).toEqual(
			expect.objectContaining({
				"x-api-key": "deepseek-key",
			}),
		);
		expect(result.requests?.[0]?.headers).not.toHaveProperty(
			"x-cline-auth-method",
		);
		expect(result.requests?.[0]?.body).toEqual(
			expect.objectContaining({
				model: "deepseek-v4-pro",
				stream: true,
			}),
		);
		expect(result.events).toContainEqual({
			type: "text-delta",
			text: "我是 DeepSeek。",
		});
		expect(result.events.at(-1)).toEqual({
			type: "finish",
			reason: "stop",
		});
	});

	it("auto-registers an Anthropic-compatible override for the built-in relay id", () => {
		const result = runFixture("anthropic-auto");

		expect(result.requests).toHaveLength(1);
		expect(result.requests?.[0]?.url).toBe(
			"https://api.deepseek.com/anthropic/v1/messages",
		);
		expect(result.requests?.[0]?.url).not.toContain("/chat/completions");
		expect(result.requests?.[0]?.headers).toEqual(
			expect.objectContaining({
				"x-api-key": "deepseek-key",
			}),
		);
		expect(result.events).toContainEqual(
			expect.objectContaining({
				type: "text",
				text: "自动适配成功。",
			}),
		);
		expect(result.events.at(-1)).toEqual(
			expect.objectContaining({
				type: "done",
				success: true,
			}),
		);
	});
});
