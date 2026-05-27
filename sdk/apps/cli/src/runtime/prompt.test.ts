import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	buildUserInputMessage,
	resolveSystemPrompt,
	updateSystemPromptRuntimeIdentity,
} from "./prompt";

describe("buildUserInputMessage", () => {
	it("extracts image mentions into userImages", async () => {
		const dir = mkdtempSync(join(tmpdir(), "cli-prompt-"));
		const imagePath = join(dir, "hero.png");
		writeFileSync(imagePath, Buffer.from("hello"));

		const result = await buildUserInputMessage(
			`@${imagePath} describe this image`,
		);

		expect(result.prompt).toBe("[image: hero.png] describe this image");
		expect(result.userImages).toEqual(["data:image/png;base64,aGVsbG8="]);
		expect(result.userFiles).toEqual([]);
	});

	it("extracts text file mentions into userFiles", async () => {
		const dir = mkdtempSync(join(tmpdir(), "cli-prompt-"));
		const filePath = join(dir, "notes.md");
		writeFileSync(filePath, "# Notes\n");

		const result = await buildUserInputMessage(`summarize @${filePath}`);

		expect(result.prompt).toBe("summarize [file: notes.md]");
		expect(result.userImages).toEqual([]);
		expect(result.userFiles).toEqual([filePath]);
	});

	it("extracts quoted text file mentions with spaces into userFiles", async () => {
		const dir = mkdtempSync(join(tmpdir(), "cli prompt "));
		const filePath = join(dir, "notes with spaces.md");
		writeFileSync(filePath, "# Notes\n");

		const result = await buildUserInputMessage(`summarize @"${filePath}"`);

		expect(result.prompt).toBe("summarize [file: notes with spaces.md]");
		expect(result.userImages).toEqual([]);
		expect(result.userFiles).toEqual([filePath]);
	});
});

describe("resolveSystemPrompt", () => {
	it("injects NBG identity and the current runtime model", async () => {
		const prompt = await resolveSystemPrompt({
			cwd: process.cwd(),
			providerId: "openai-compatible",
			modelId: "gpt-5.3-codex",
		});

		expect(prompt).toContain("你是 NBG");
		expect(prompt).toContain("运行提供方: openai-compatible");
		expect(prompt).toContain("运行模型: gpt-5.3-codex");
		expect(prompt).toContain("默认使用简体中文输出");
		expect(prompt).not.toContain("You are Cline");
	});

	it("updates runtime identity without rebuilding the whole prompt", async () => {
		const prompt = await resolveSystemPrompt({
			cwd: process.cwd(),
			providerId: "openai-compatible",
			modelId: "gpt-4o",
		});

		const updated = updateSystemPromptRuntimeIdentity({
			systemPrompt: prompt,
			providerId: "openai-compatible",
			modelId: "gpt-5.5",
		});

		expect(updated).toContain("运行提供方: openai-compatible");
		expect(updated).toContain("运行模型: gpt-5.5");
		expect(updated).not.toContain("运行模型: gpt-4o");
	});
});
