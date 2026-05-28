import { describe, expect, it } from "vitest";
import type { ChatEntry } from "../types";
import {
	closeAllStreamingChatEntries,
	closeChatEntryStream,
	nextUsageTokenDisplay,
	updateChatEntryById,
} from "./session-context";

describe("nextUsageTokenDisplay", () => {
	it("uses streaming input tokens as an absolute context size", () => {
		let displayedTokens = 0;

		displayedTokens = nextUsageTokenDisplay(displayedTokens, {
			inputTokens: 633_000,
			outputTokens: 31_000,
		});
		displayedTokens = nextUsageTokenDisplay(displayedTokens, {
			inputTokens: 934_000,
			outputTokens: 266_000,
		});

		expect(displayedTokens).toBe(934_000);
	});

	it("ignores output-only usage events for the context size display", () => {
		expect(
			nextUsageTokenDisplay(633_000, {
				outputTokens: 31_000,
			}),
		).toBe(633_000);
	});
});

describe("chat entry stream helpers", () => {
	it("updates a streaming assistant block by stable entry id after another entry is appended", () => {
		const entries: ChatEntry[] = [
			{
				entryId: "assistant-1",
				kind: "assistant_text",
				text: "正在检查",
				streaming: true,
			},
			{
				entryId: "queued-1",
				kind: "user_submitted",
				text: "顺便看测试",
				delivery: "queue",
			},
		];

		const next = updateChatEntryById(entries, "assistant-1", (entry) =>
			entry.kind === "assistant_text"
				? { ...entry, text: `${entry.text}文件` }
				: entry,
		);

		expect(next[0]).toMatchObject({
			entryId: "assistant-1",
			kind: "assistant_text",
			text: "正在检查文件",
			streaming: true,
		});
		expect(next[1]).toBe(entries[1]);
	});

	it("closes only the targeted streaming entry", () => {
		const entries: ChatEntry[] = [
			{
				entryId: "text-1",
				kind: "assistant_text",
				text: "hello",
				streaming: true,
			},
			{
				entryId: "tool-1",
				kind: "tool_call",
				toolName: "read_files",
				inputSummary: "a.ts",
				streaming: true,
			},
		];

		const next = closeChatEntryStream(entries, "text-1");

		expect(next[0]).toMatchObject({ streaming: false });
		expect(next[1]).toMatchObject({ streaming: true });
	});

	it("closes text, reasoning, and tool streams at iteration boundaries", () => {
		const entries: ChatEntry[] = [
			{
				entryId: "text-1",
				kind: "assistant_text",
				text: "hello",
				streaming: true,
			},
			{
				entryId: "reasoning-1",
				kind: "reasoning",
				text: "thinking",
				streaming: true,
			},
			{
				entryId: "tool-1",
				kind: "tool_call",
				toolName: "run_commands",
				inputSummary: "ls",
				streaming: true,
			},
		];

		const next = closeAllStreamingChatEntries(entries);

		expect(next).toEqual(
			entries.map((entry) => ({ ...entry, streaming: false })),
		);
	});
});
