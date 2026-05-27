import { createTool } from "@cline/shared";
import type { Config } from "../../utils/types";
import { resolveSystemPrompt } from "../prompt";

type InteractiveUiMode = "plan" | "act";

export function createInteractiveModeSwitchTool(input: {
	config: Config;
	pendingModeChange: { current: InteractiveUiMode | null };
	tuiModeChanged: { current: ((mode: InteractiveUiMode) => void) | null };
}) {
	return createTool({
		name: "switch_to_act_mode",
		description:
			"从规划模式切换到执行模式。只有在用户确认计划并准备继续后才调用此工具；不要主动调用，也不要在用户同意前调用。",
		inputSchema: {
			type: "object",
			properties: {},
		},
		timeoutMs: 5000,
		retryable: false,
		maxRetries: 0,
		execute: async () => {
			if (input.config.mode === "act") {
				return "已经处于执行模式。";
			}
			input.pendingModeChange.current = "act";
			input.tuiModeChanged.current?.("act");
			return "已成功切换到执行模式，请继续执行计划。现在可以编辑文件并运行命令。（switch_to_act_mode 工具仅在规划模式可用。）";
		},
	});
}

export async function applyInteractiveModeConfig(input: {
	config: Config;
	mode: InteractiveUiMode;
	switchToActModeTool: NonNullable<Config["extraTools"]>[number];
}): Promise<void> {
	input.config.mode = input.mode;
	input.config.extraTools =
		input.mode === "plan" ? [input.switchToActModeTool] : [];
	input.config.systemPrompt = await resolveSystemPrompt({
		cwd: input.config.cwd,
		providerId: input.config.providerId,
		modelId: input.config.modelId,
		mode: input.mode,
	});
}
