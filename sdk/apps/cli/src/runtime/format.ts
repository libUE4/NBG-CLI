import { askQuestionInTerminal } from "../utils/approval";
import type { Config } from "../utils/types";

export function describeAbortSource(input: {
	abortRequested: boolean;
	timedOut: boolean;
}): string {
	if (input.timedOut) {
		return "超时后中止";
	}
	if (input.abortRequested) {
		return "已中止";
	}
	return "被其他客户端中止";
}

export async function resolveMistakeLimitDecision(
	config: Config,
	context: {
		iteration: number;
		consecutiveMistakes: number;
		maxConsecutiveMistakes: number;
		reason: "api_error" | "invalid_tool_call" | "tool_execution_failed";
		details?: string;
	},
): Promise<
	| { action: "continue"; guidance?: string }
	| { action: "stop"; reason?: string }
> {
	const yoloEnabled = config.toolPolicies["*"]?.autoApprove !== false;
	if (yoloEnabled) {
		return {
			action: "stop",
			reason: `yolo 模式下达到最大连续错误次数（${context.maxConsecutiveMistakes}）`,
		};
	}
	const detail = context.details?.trim();
	const summary = detail
		? `${context.reason}: ${detail}`
		: `${context.reason} at iteration ${context.iteration}`;
	if (!process.stdin.isTTY || !process.stdout.isTTY) {
		return {
			action: "stop",
			reason: `已达到错误次数上限：${summary}`,
		};
	}
	const answer = await askQuestionInTerminal(
		`已达到错误次数上限（${context.consecutiveMistakes}/${context.maxConsecutiveMistakes}）\n最近一次：${summary}\nNBG 应该如何继续？`,
		["尝试其他方法", "停止本次运行"],
	);
	const normalized = answer.trim().toLowerCase();
	if (
		normalized === "2" ||
		normalized === "stop this run" ||
		normalized === "stop" ||
		normalized === "n" ||
		normalized === "no"
	) {
		return {
			action: "stop",
			reason: "达到错误次数上限提示后停止",
		};
	}
	if (
		normalized === "1" ||
		normalized === "try a different approach" ||
		normalized.length === 0
	) {
		return {
			action: "continue",
			guidance:
				"已达到错误次数上限：请换一种方法重试，在调用工具前校验参数，并避免重复失败步骤。",
		};
	}
	return {
		action: "continue",
		guidance: `已达到错误次数上限：${answer.trim()}`,
	};
}
