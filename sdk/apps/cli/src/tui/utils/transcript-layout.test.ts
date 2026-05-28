import { describe, expect, it } from "vitest";
import type { ChatEntry } from "../types";
import {
	groupTranscriptEntries,
	shouldInsertTranscriptEntrySpacer,
} from "./transcript-layout";

describe("transcript layout helpers", () => {
	it("starts a new group for each user prompt", () => {
		const entries: ChatEntry[] = [
			{ kind: "status", text: "已恢复会话" },
			{ kind: "user_submitted", text: "先看看项目" },
			{ kind: "assistant_text", text: "我先检查文件。", streaming: false },
			{
				kind: "tool_call",
				toolName: "read_files",
				inputSummary: "/tmp/a.ts",
				streaming: false,
			},
			{ kind: "assistant_text", text: "结论如下。", streaming: false },
			{ kind: "user_submitted", text: "继续" },
			{ kind: "assistant_text", text: "好的。", streaming: false },
		];

		expect(
			groupTranscriptEntries(entries).map((group) => group.entries),
		).toEqual([[entries[0]], entries.slice(1, 5), entries.slice(5)]);
	});

	it("keeps queued and steering prompts inside the active turn", () => {
		const entries: ChatEntry[] = [
			{ kind: "user_submitted", text: "先看看项目" },
			{ kind: "assistant_text", text: "我先检查。", streaming: true },
			{
				kind: "user_submitted",
				text: "再看测试",
				delivery: "queue",
			},
			{
				kind: "user_submitted",
				text: "重点看 CLI",
				delivery: "steer",
			},
			{ kind: "assistant_text", text: "继续分析。", streaming: false },
		];

		expect(
			groupTranscriptEntries(entries).map((group) => group.entries),
		).toEqual([entries]);
	});

	it("keeps adjacent assistant text tight but separates user, tools, and totals", () => {
		const user: ChatEntry = { kind: "user_submitted", text: "run" };
		const textA: ChatEntry = {
			kind: "assistant_text",
			text: "a",
			streaming: false,
		};
		const textB: ChatEntry = {
			kind: "assistant_text",
			text: "b",
			streaming: false,
		};
		const tool: ChatEntry = {
			kind: "tool_call",
			toolName: "run_commands",
			inputSummary: "ls",
			streaming: false,
		};
		const done: ChatEntry = {
			kind: "done",
			tokens: 12,
			cost: 0,
			elapsed: "1.2",
			iterations: 1,
		};

		expect(shouldInsertTranscriptEntrySpacer(user, textA)).toBe(true);
		expect(shouldInsertTranscriptEntrySpacer(textA, textB)).toBe(false);
		expect(shouldInsertTranscriptEntrySpacer(textB, tool)).toBe(true);
		expect(shouldInsertTranscriptEntrySpacer(tool, done)).toBe(true);
	});
});
