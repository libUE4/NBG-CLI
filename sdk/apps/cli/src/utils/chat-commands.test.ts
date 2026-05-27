import { describe, expect, it, vi } from "vitest";
import { createChatCommandHost, maybeHandleChatCommand } from "./chat-commands";

describe("chat commands", () => {
	it("shows connector help for /help and /start", async () => {
		for (const { command, botUserName } of [
			{ command: "/help" },
			{ command: "/start" },
			{ command: "/help@clinebot", botUserName: "clinebot" },
			{ command: "/start@cline_bot", botUserName: "@cline_bot" },
		]) {
			const reply = vi.fn(async () => undefined);

			const handled = await maybeHandleChatCommand(command, {
				enabled: true,
				botUserName,
				getState: async () => ({
					enableTools: true,
					autoApproveTools: false,
					cwd: "/tmp",
					workspaceRoot: "/tmp",
				}),
				setState: async () => undefined,
				reply,
			});

			expect(handled).toBe(true);
			expect(reply).toHaveBeenCalledWith(
				expect.stringContaining("Cline 连接器命令："),
			);
			expect(reply).toHaveBeenCalledWith(
				expect.stringContaining("当前状态：tools=on，yolo=off"),
			);
			expect(reply).toHaveBeenCalledWith(
				expect.stringContaining(
					"/schedule create/list/trigger/delete - 管理计划任务",
				),
			);
			expect(reply).toHaveBeenCalledWith(
				expect.stringContaining(
					"工具开启时，我可以检查文件、编辑代码、运行命令/测试，并协助准备 PR。",
				),
			);
		}
	});

	it("does not handle bot-suffixed commands addressed to another bot", async () => {
		const reply = vi.fn(async () => undefined);

		const handled = await maybeHandleChatCommand("/help@otherbot", {
			enabled: true,
			botUserName: "clinebot",
			getState: async () => ({
				enableTools: true,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
		});

		expect(handled).toBe(false);
		expect(reply).not.toHaveBeenCalled();
	});

	it("leaves bot-suffixed commands unmatched without a known bot username", async () => {
		const reply = vi.fn(async () => undefined);

		const handled = await maybeHandleChatCommand("/help@clinebot", {
			enabled: true,
			getState: async () => ({
				enableTools: true,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
		});

		expect(handled).toBe(false);
		expect(reply).not.toHaveBeenCalled();
	});

	it("explains when tool controls are locked by startup", async () => {
		const reply = vi.fn(async () => undefined);

		const handled = await maybeHandleChatCommand("/help", {
			enabled: true,
			getState: async () => ({
				enableTools: false,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
				toolsLocked: true,
			}),
			setState: async () => undefined,
			reply,
		});

		expect(handled).toBe(true);
		expect(reply).toHaveBeenCalledWith(
			expect.stringContaining(
				"工具控制已锁定，因为此连接器启动时使用了 --no-tools。",
			),
		);
	});

	it("treats /new as a reset alias", async () => {
		const reset = vi.fn(async () => undefined);
		const reply = vi.fn(async () => undefined);

		const handled = await maybeHandleChatCommand("/new", {
			enabled: true,
			getState: async () => ({
				enableTools: false,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
			reset,
		});

		expect(handled).toBe(true);
		expect(reset).toHaveBeenCalledTimes(1);
		expect(reply).toHaveBeenCalledWith("已开始新会话。");
	});

	it("supports registering reusable commands on a host", async () => {
		const reply = vi.fn(async () => undefined);
		const host = createChatCommandHost().register("command", {
			names: ["/echo"],
			run: async ({ args }, context) => {
				await context.reply(args.join(" "));
			},
		});

		const handled = await host.handle("/echo hello world", {
			enabled: true,
			getState: async () => ({
				enableTools: false,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
		});

		expect(handled).toBe(true);
		expect(reply).toHaveBeenCalledWith("hello world");
	});

	it("shows usage for /team with no arguments", async () => {
		const reply = vi.fn(async () => undefined);

		const handled = await maybeHandleChatCommand("/team", {
			enabled: true,
			getState: async () => ({
				enableTools: false,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
		});

		expect(handled).toBe(true);
		expect(reply).toHaveBeenCalledWith(
			"用法：/team <任务描述>\n为指定任务启动一个智能体团队。",
		);
	});

	it("replies with unsupported message for /team with arguments in default host", async () => {
		const reply = vi.fn(async () => undefined);

		const handled = await maybeHandleChatCommand("/team build a web app", {
			enabled: true,
			getState: async () => ({
				enableTools: false,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
		});

		expect(handled).toBe(true);
		expect(reply).toHaveBeenCalledWith(
			"/team 命令必须作为提示词直接输入，不能通过聊天命令调用。",
		);
	});

	it("runs /fork and replies with forked session ids", async () => {
		const reply = vi.fn(async () => undefined);
		const fork = vi.fn(async () => ({
			forkedFromSessionId: "sess_original",
			newSessionId: "sess_fork",
		}));

		const handled = await maybeHandleChatCommand("/fork", {
			enabled: true,
			getState: async () => ({
				enableTools: false,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
			fork,
		});

		expect(handled).toBe(true);
		expect(fork).toHaveBeenCalledTimes(1);
		expect(reply).toHaveBeenCalledWith(
			"已将会话 sess_original 分叉为新会话 sess_fork。它现在是活动会话。使用 /history 可切换会话。",
		);
	});

	it("replies with failure message when fork returns undefined", async () => {
		const reply = vi.fn(async () => undefined);
		const fork = vi.fn(async () => undefined);

		const handled = await maybeHandleChatCommand("/fork", {
			enabled: true,
			getState: async () => ({
				enableTools: false,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
			fork,
		});

		expect(handled).toBe(true);
		expect(fork).toHaveBeenCalledTimes(1);
		expect(reply).toHaveBeenCalledWith(
			"分叉失败：无法读取当前会话的消息。",
		);
	});

	it("surfaces thrown error message when fork throws", async () => {
		const reply = vi.fn(async () => undefined);
		const fork = vi.fn(async () => {
			throw new Error("Cannot fork an empty session.");
		});

		const handled = await maybeHandleChatCommand("/fork", {
			enabled: true,
			getState: async () => ({
				enableTools: false,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
			fork,
		});

		expect(handled).toBe(true);
		expect(fork).toHaveBeenCalledTimes(1);
		expect(reply).toHaveBeenCalledWith("Cannot fork an empty session.");
	});

	it("ignores /fork when fork callback is not provided", async () => {
		const reply = vi.fn(async () => undefined);

		const handled = await maybeHandleChatCommand("/fork", {
			enabled: true,
			getState: async () => ({
				enableTools: false,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
			// No fork callback, so the command should not be available.
		});

		// isAvailable returns false when fork is not defined, so the command
		// is not matched and the handler returns false.
		expect(handled).toBe(false);
		expect(reply).not.toHaveBeenCalled();
	});

	it("runs /abort without disconnecting", async () => {
		const abort = vi.fn(async () => undefined);
		const reply = vi.fn(async () => undefined);

		const handled = await maybeHandleChatCommand("/abort", {
			enabled: true,
			getState: async () => ({
				enableTools: false,
				autoApproveTools: false,
				cwd: "/tmp",
				workspaceRoot: "/tmp",
			}),
			setState: async () => undefined,
			reply,
			abort,
		});

		expect(handled).toBe(true);
		expect(abort).toHaveBeenCalledTimes(1);
		expect(reply).not.toHaveBeenCalled();
	});
});
