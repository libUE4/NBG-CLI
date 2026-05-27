import { CreateWorktreeIncludeRequest, WorktreeResult } from "@shared/proto/cline/worktree"
import { getWorkspacePath } from "@utils/path"
import * as fs from "fs/promises"
import * as path from "path"
import { Controller } from ".."

/**
 * Creates a .worktreeinclude file with the provided content
 * @param controller The controller instance
 * @param request The request containing the file content
 * @returns WorktreeResult with success status
 */
export async function createWorktreeInclude(
	_controller: Controller,
	request: CreateWorktreeIncludeRequest,
): Promise<WorktreeResult> {
	const cwd = await getWorkspacePath()
	if (!cwd) {
		return WorktreeResult.create({
			success: false,
			message: "未打开工作区文件夹",
		})
	}

	try {
		const filePath = path.join(cwd, ".worktreeinclude")
		await fs.writeFile(filePath, request.content, "utf-8")

		return WorktreeResult.create({
			success: true,
			message: "已创建 .worktreeinclude 文件",
		})
	} catch (error) {
		return WorktreeResult.create({
			success: false,
			message: `创建 .worktreeinclude 失败：${error instanceof Error ? error.message : String(error)}`,
		})
	}
}
