import type { AgentExtension } from "@cline/shared";
import { loadRulesForSystemPromptFromWatcher } from "../../runtime/safety/rules";
import { listAvailableRuntimeCommandsFromWatcher } from "./runtime-commands";
import type { UserInstructionConfigWatcher } from "./user-instruction-config-loader";

export interface CreateUserInstructionPluginOptions {
	watcher: UserInstructionConfigWatcher;
	watcherReady?: Promise<void>;
	includeRules?: boolean;
	includeSkills?: boolean;
	includeWorkflows?: boolean;
	registerSkillsTool?: boolean;
	allowedSkillNames?: ReadonlyArray<string>;
}

export function createUserInstructionPlugin(
	options: CreateUserInstructionPluginOptions,
): AgentExtension {
	const watcherReady = options.watcherReady ?? Promise.resolve();
	const capabilities = [
		options.includeRules ? "rules" : undefined,
		options.includeWorkflows ? "commands" : undefined,
	].filter((value): value is "rules" | "tools" | "commands" => Boolean(value));

	return {
		name: "cline-user-instructions",
		manifest: {
			capabilities,
		},
		async setup(api) {
			await watcherReady;

			if (options.includeRules) {
				api.registerRule({
					id: "cline-user-instructions:rules",
					source: "user-instruction-watcher",
					content: () => loadRulesForSystemPromptFromWatcher(options.watcher),
				});
			}

			for (const command of listAvailableRuntimeCommandsFromWatcher(
				options.watcher,
			).filter(
				(command) =>
					(command.kind === "workflow" && options.includeWorkflows),
			)) {
				api.registerCommand({
					name: command.name,
					description: command.description,
					handler: (input) => {
						const trimmed = input.trim();
						return trimmed
							? `${command.instructions}\n\n${trimmed}`
							: command.instructions;
					},
				});
			}
		},
	};
}
