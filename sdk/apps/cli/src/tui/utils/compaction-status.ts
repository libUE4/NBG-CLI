import type { InteractiveCompactionResult } from "../types";

export function formatCompactionStatus(
	result: InteractiveCompactionResult,
): string {
	if (result.messagesBefore === 0) {
		return "没有可压缩的消息。";
	}
	if (!result.compacted) {
		return "无需压缩。";
	}
	if (result.messagesBefore === result.messagesAfter) {
		return `已压缩上下文；消息数量保持为 ${result.messagesAfter}。`;
	}
	return `已将 ${result.messagesBefore} 条消息压缩为 ${result.messagesAfter} 条。`;
}
