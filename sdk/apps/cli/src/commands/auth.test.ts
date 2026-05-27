import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProviderSettingsManager } from "@cline/core";
import { describe, expect, it, vi } from "vitest";
import {
	getPersistedProviderApiKey,
	runAuthCommand,
	saveOAuthProviderSettings,
} from "./auth";

describe("saveOAuthProviderSettings", () => {
	it("preserves existing manual apiKey while updating OAuth tokens", () => {
		const save = vi.fn();
		const manager = {
			saveProviderSettings: save,
		} as unknown as ProviderSettingsManager;

		const merged = saveOAuthProviderSettings(
			manager,
			"cline",
			{
				provider: "cline",
				apiKey: "manual-key",
				auth: {
					accessToken: "workos:old-access",
					refreshToken: "old-refresh",
					accountId: "acct-old",
				},
			},
			{
				access: "new-access",
				refresh: "new-refresh",
				expires: 4_000_000_000_000,
				accountId: "acct-new",
			},
		);

		expect(merged).toMatchObject({
			provider: "cline",
			apiKey: "manual-key",
			auth: {
				accessToken: "workos:new-access",
				refreshToken: "new-refresh",
				accountId: "acct-new",
				expiresAt: 4_000_000_000_000,
			},
		});
		expect(save).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: "cline",
				apiKey: "manual-key",
				auth: expect.objectContaining({
					accessToken: "workos:new-access",
				}),
			}),
			{ tokenSource: "oauth" },
		);
	});
});

describe("getPersistedProviderApiKey", () => {
	it("does not double-prefix persisted Cline OAuth tokens", () => {
		expect(
			getPersistedProviderApiKey("cline", {
				provider: "cline",
				auth: {
					accessToken: "workos:oauth-access",
				},
			}),
		).toBe("workos:oauth-access");
	});
});

describe("runAuthCommand", () => {
	it("auto-fetches third-party models when modelid is omitted", async () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), "auth-third-party-"));
		const manager = new ProviderSettingsManager({
			filePath: path.join(dir, "providers.json"),
		});
		const fetchMock = vi.fn(
			async (_input: Parameters<typeof fetch>[0], _init?: Parameters<typeof fetch>[1]) =>
				new Response(
					JSON.stringify({
						data: [{ id: "gpt-5.5" }, { id: "gpt-5.4" }],
					}),
					{ headers: { "content-type": "application/json" } },
				),
		);
		const originalFetch = globalThis.fetch;
		globalThis.fetch = fetchMock as typeof fetch;
		const out: string[] = [];
		const err: string[] = [];

		try {
			const code = await runAuthCommand({
				providerSettingsManager: manager,
				io: {
					writeln: (text = "") => out.push(text),
					writeErr: (text) => err.push(text),
				},
				explicitProvider: "openai-compatible",
				apikey: "test-key",
				baseurl: "https://relay.example/",
			});

			expect(code).toBe(0);
			expect(err).toEqual([]);
			expect(out.join("\n")).toContain("三方 API 已连接");
			expect(out.join("\n")).toContain("https://relay.example/v1/models");
			expect(out.join("\n")).toContain("已获取模型");
			expect(out.join("\n")).toContain("2 个");
			expect(manager.getProviderSettings("openai-compatible")).toMatchObject({
				provider: "openai-compatible",
				baseUrl: "https://relay.example/v1",
				apiKey: "test-key",
				model: "gpt-5.5",
			});
			const headers = new Headers(
				(fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.headers,
			);
			expect(headers.get("authorization")).toBe("Bearer test-key");
		} finally {
			globalThis.fetch = originalFetch;
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("loadAuthTuiRuntime", () => {
	it("loads OpenTUI React after provider catalog initialization", async () => {
		const cliRoot = fileURLToPath(new URL("../..", import.meta.url));
		const script = `
import { ProviderSettingsManager, ensureCustomProvidersLoaded, listLocalProviders } from "@cline/core";
import { loadAuthTuiRuntime } from "./src/commands/auth.ts";
const manager = new ProviderSettingsManager();
await ensureCustomProvidersLoaded(manager);
await listLocalProviders(manager);
const runtime = await loadAuthTuiRuntime();
if (typeof runtime.createCliRenderer !== "function") throw new Error("missing createCliRenderer");
if (typeof runtime.createRoot !== "function") throw new Error("missing createRoot");
if (typeof runtime.OnboardingView !== "function") throw new Error("missing OnboardingView");
`;

		const result = spawnSync(
			"bun",
			["--conditions=development", "-e", script],
			{
				cwd: cliRoot,
				encoding: "utf8",
			},
		);

		expect(result.error).toBeUndefined();
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
	});
});
