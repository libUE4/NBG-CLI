import { describe, expect, it } from "vitest";
import {
	buildSlashCommandRegistry,
	expandUserCommandPrompt,
	formatSlashCommandAutocompleteValue,
	getVisibleSystemSlashCommands,
	resolveSlashCommand,
} from "./slash-command-registry";

describe("slash command registry", () => {
	it("keeps TUI-local commands local even when runtime also advertises them", () => {
		const registry = buildSlashCommandRegistry({
			canFork: true,
			workflowSlashCommands: [
				{
					name: "settings",
					instructions: "",
					description: "Runtime settings",
				},
				{
					name: "team",
					instructions: "/team [prompt]",
					description: "Start a task with agent team",
				},
				{
					name: "mcp",
					instructions: "",
					description: "Runtime MCP",
				},
			],
		});

		expect(resolveSlashCommand(registry, "settings")).toMatchObject({
			source: "tui",
			execution: "local",
			description: "修改智能体配置",
			visible: true,
		});
		expect(resolveSlashCommand(registry, "team")).toMatchObject({
			source: "runtime",
			execution: "runtime",
		});
		expect(resolveSlashCommand(registry, "mcp")).toMatchObject({
			source: "tui",
			execution: "local",
			description: "管理 MCP 服务器",
			visible: true,
		});
	});

	it("surfaces plugin commands as runtime-executable commands", () => {
		const registry = buildSlashCommandRegistry({
			additionalSlashCommands: [
				{
					name: "/Echo",
					instructions: "",
					description: "Echo input",
				},
			],
		});
		const command = resolveSlashCommand(registry, "echo");

		expect(command).toMatchObject({
			name: "echo",
			source: "plugin",
			execution: "runtime",
			visible: true,
			selectable: true,
		});
		expect(command ? formatSlashCommandAutocompleteValue(command) : "").toBe(
			"/echo ",
		);
	});

	it("ignores skills while keeping workflows invokable", () => {
		const registry = buildSlashCommandRegistry({
			workflowSlashCommands: [
				{
					name: "review",
					instructions: "Review carefully",
					description: "Review files",
					kind: "skill",
				},
				{
					name: "release",
					instructions: "Prepare release",
					description: "Release workflow",
					kind: "workflow",
				},
			],
		});

		expect(
			getVisibleSystemSlashCommands(registry).map((cmd) => cmd.name),
		).toEqual(
			expect.arrayContaining(["settings", "mcp", "model", "quit"]),
		);
		expect(
			getVisibleSystemSlashCommands(registry).map((cmd) => cmd.name),
		).not.toEqual(expect.arrayContaining(["account", "skills"]));
		expect(resolveSlashCommand(registry, "account")).toBeUndefined();
		expect(resolveSlashCommand(registry, "quit")).toMatchObject({
			source: "tui",
			execution: "local",
			description: "退出 NBG",
			visible: true,
		});
		expect(resolveSlashCommand(registry, "review")).toBeUndefined();
		expect(resolveSlashCommand(registry, "release")).toMatchObject({
			source: "workflow",
			execution: "user-command",
			visible: false,
			selectable: false,
		});
	});

	it("expands user command tokens and manually typed user commands before submission", () => {
		const registry = buildSlashCommandRegistry({
			workflowSlashCommands: [
				{
					name: "release",
					instructions: "Prepare release",
					description: "Release workflow",
					kind: "workflow",
				},
			],
		});

		expect(expandUserCommandPrompt("/release this file", registry)).toBe(
			'<user_command slash="release">Prepare release</user_command> this file',
		);
		expect(expandUserCommandPrompt("please /release this file", registry)).toBe(
			'please <user_command slash="release">Prepare release</user_command> this file',
		);
		expect(
			expandUserCommandPrompt(
				'<user_command slash="release">Prepare release</user_command> this file',
				registry,
			),
		).toBe(
			'<user_command slash="release">Prepare release</user_command> this file',
		);
		expect(expandUserCommandPrompt("/settings", registry)).toBe("/settings");
	});

	it("does not expand ignored skill commands", () => {
		const staleRegistry = buildSlashCommandRegistry({
			workflowSlashCommands: [
				{
					name: "find-skills",
					instructions: "Find installable skills.",
					description: "Find skills",
					kind: "skill",
				},
			],
		});

		expect(
			expandUserCommandPrompt("/find-skills what can u do?", staleRegistry),
		).toBe("/find-skills what can u do?");
		expect(resolveSlashCommand(staleRegistry, "find-skills")).toBeUndefined();
	});

	it("does not expand commands omitted from a refreshed user-command registry", () => {
		const staleRegistry = buildSlashCommandRegistry({
			workflowSlashCommands: [
				{
					name: "release",
					instructions: "Prepare release",
					description: "Release workflow",
					kind: "workflow",
				},
			],
		});
		const refreshedRegistry = buildSlashCommandRegistry({
			workflowSlashCommands: [],
		});

		expect(
			expandUserCommandPrompt("/release now", staleRegistry),
		).toContain("<user_command");
		expect(resolveSlashCommand(refreshedRegistry, "release")).toBeUndefined();
		expect(
			expandUserCommandPrompt("/release now", refreshedRegistry),
		).toBe("/release now");
	});

	it("hides fork from autocomplete until a session has messages", () => {
		const emptySessionRegistry = buildSlashCommandRegistry({ canFork: false });
		const activeSessionRegistry = buildSlashCommandRegistry({ canFork: true });

		expect(resolveSlashCommand(emptySessionRegistry, "fork")).toMatchObject({
			execution: "local",
			visible: false,
			selectable: false,
		});
		expect(
			getVisibleSystemSlashCommands(emptySessionRegistry).map(
				(command) => command.name,
			),
		).not.toContain("fork");
		expect(
			getVisibleSystemSlashCommands(activeSessionRegistry).map(
				(command) => command.name,
			),
		).toContain("fork");
	});

	it("does not register the skills launcher", () => {
		const emptyRegistry = buildSlashCommandRegistry({});

		expect(resolveSlashCommand(emptyRegistry, "skills")).toBeUndefined();
		expect(
			getVisibleSystemSlashCommands(emptyRegistry).map(
				(command) => command.name,
			),
		).not.toContain("skills");
	});

	it("keeps config as a hidden alias for settings", () => {
		const registry = buildSlashCommandRegistry({ canFork: true });

		expect(resolveSlashCommand(registry, "config")).toMatchObject({
			source: "tui",
			execution: "local",
			description: "修改智能体配置",
			visible: false,
			selectable: false,
		});
		expect(
			getVisibleSystemSlashCommands(registry).map((command) => command.name),
		).not.toContain("config");
		expect(
			getVisibleSystemSlashCommands(registry).map((command) => command.name),
		).toContain("settings");
	});

	it("removes the account command from the registry", () => {
		const registry = buildSlashCommandRegistry({});

		expect(resolveSlashCommand(registry, "account")).toBeUndefined();
		expect(
			getVisibleSystemSlashCommands(registry).map((command) => command.name),
		).not.toContain("account");
	});
});
