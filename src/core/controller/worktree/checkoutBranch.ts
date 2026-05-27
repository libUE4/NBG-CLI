import { CheckoutBranchRequest, WorktreeResult } from "@shared/proto/cline/worktree"
import { getWorkspacePath } from "@utils/path"
import simpleGit from "simple-git"
import { Controller } from ".."

/**
 * Checks out a branch in the current worktree (git checkout)
 * @param controller The controller instance
 * @param request The checkout branch request containing the branch name
 * @returns WorktreeResult indicating success or failure
 */
export async function checkoutBranch(_controller: Controller, request: CheckoutBranchRequest): Promise<WorktreeResult> {
	const cwd = await getWorkspacePath()
	if (!cwd) {
		return WorktreeResult.create({
			success: false,
			message: "未找到工作区文件夹",
		})
	}

	const { branch } = request

	if (!branch) {
		return WorktreeResult.create({
			success: false,
			message: "必须提供分支名称",
		})
	}

	try {
		const git = simpleGit(cwd)
		await git.checkout(branch)

		return WorktreeResult.create({
			success: true,
			message: `已切换到分支 '${branch}'`,
		})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		return WorktreeResult.create({
			success: false,
			message: `签出分支失败：${errorMessage}`,
		})
	}
}
