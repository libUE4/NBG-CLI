import { MergeWorktreeRequest, MergeWorktreeResult } from "@shared/proto/cline/worktree"
import { listWorktrees } from "@utils/git-worktree"
import { getWorkspacePath } from "@utils/path"
import simpleGit from "simple-git"
import { telemetryService } from "@/services/telemetry"
import { Controller } from ".."

/**
 * Merges a worktree's branch into the target branch and optionally deletes the worktree
 * @param controller The controller instance
 * @param request The merge worktree request
 * @returns MergeWorktreeResult indicating success, failure, or conflicts
 */
export async function mergeWorktree(_controller: Controller, request: MergeWorktreeRequest): Promise<MergeWorktreeResult> {
	const cwd = await getWorkspacePath()
	if (!cwd) {
		return MergeWorktreeResult.create({
			success: false,
			message: "未找到工作区文件夹",
			hasConflicts: false,
			conflictingFiles: [],
		})
	}

	const { worktreePath, targetBranch, deleteAfterMerge } = request

	if (!worktreePath) {
		return MergeWorktreeResult.create({
			success: false,
			message: "必须提供工作树路径",
			hasConflicts: false,
			conflictingFiles: [],
		})
	}

	if (!targetBranch) {
		return MergeWorktreeResult.create({
			success: false,
			message: "必须提供目标分支",
			hasConflicts: false,
			conflictingFiles: [],
		})
	}

	try {
		// Find the worktree that has the target branch checked out
		// This is where we need to perform the merge
		const { worktrees } = await listWorktrees(cwd)
		const targetWorktree = worktrees.find((w) => w.branch === targetBranch)

		if (!targetWorktree) {
			return MergeWorktreeResult.create({
				success: false,
				message: `目标分支 '${targetBranch}' 未在任何工作树中签出。请先签出该分支。`,
				hasConflicts: false,
				conflictingFiles: [],
			})
		}

		// Use the target worktree's path for merge operations
		const targetWorktreePath = targetWorktree.path
		const git = simpleGit(targetWorktreePath)
		const worktreeGit = simpleGit(worktreePath)

		// Get the branch name of the worktree
		let sourceBranch: string
		try {
			sourceBranch = await worktreeGit.revparse(["--abbrev-ref", "HEAD"])
			sourceBranch = sourceBranch.trim()
		} catch {
			return MergeWorktreeResult.create({
				success: false,
				message: "无法从工作树获取分支名称",
				hasConflicts: false,
				conflictingFiles: [],
			})
		}

		if (sourceBranch === "HEAD") {
			return MergeWorktreeResult.create({
				success: false,
				message: "无法合并处于 detached HEAD 状态的工作树",
				hasConflicts: false,
				conflictingFiles: [],
				sourceBranch,
				targetBranch,
			})
		}

		// Check for uncommitted changes in the source worktree
		try {
			const status = await worktreeGit.status()
			if (!status.isClean()) {
				return MergeWorktreeResult.create({
					success: false,
					message: "工作树存在未提交变更。请先提交或暂存这些变更。",
					hasConflicts: false,
					conflictingFiles: [],
					sourceBranch,
					targetBranch,
				})
			}
		} catch {
			// If status check fails, continue anyway
		}

		// Check for uncommitted changes in the target worktree
		try {
			const targetStatus = await git.status()
			if (!targetStatus.isClean()) {
				return MergeWorktreeResult.create({
					success: false,
					message: `目标工作树（${targetBranch}）存在未提交变更。请先提交或暂存这些变更。`,
					hasConflicts: false,
					conflictingFiles: [],
					sourceBranch,
					targetBranch,
				})
			}
		} catch {
			// If status check fails, continue anyway
		}

		// Attempt the merge in the target worktree (which already has targetBranch checked out)
		try {
			await git.merge([sourceBranch, "--no-edit"])
		} catch (error) {
			// Check if it's a merge conflict
			try {
				const diffResult = await git.diff(["--name-only", "--diff-filter=U"])
				const conflictingFiles = diffResult
					.trim()
					.split("\n")
					.filter((f) => f)

				if (conflictingFiles.length > 0) {
					// Abort the merge so we don't leave the repo in a conflicted state
					try {
						await git.merge(["--abort"])
					} catch {
						// Ignore abort errors
					}

					telemetryService.captureWorktreeMergeAttempted(false, true, deleteAfterMerge)
					return MergeWorktreeResult.create({
						success: false,
						message: `检测到合并冲突。${conflictingFiles.length} 个文件存在冲突。`,
						hasConflicts: true,
						conflictingFiles,
						sourceBranch,
						targetBranch,
					})
				}
			} catch {
				// If conflict check fails, return the original error
			}

			const errorMessage = error instanceof Error ? error.message : String(error)
			telemetryService.captureWorktreeMergeAttempted(false, false, deleteAfterMerge)
			return MergeWorktreeResult.create({
				success: false,
				message: `合并失败：${errorMessage}`,
				hasConflicts: false,
				conflictingFiles: [],
				sourceBranch,
				targetBranch,
			})
		}

		// Delete worktree if requested
		if (deleteAfterMerge) {
			try {
				await git.raw(["worktree", "remove", worktreePath, "--force"])
			} catch (error) {
				// Merge succeeded but deletion failed - still return success
				const errorMessage = error instanceof Error ? error.message : String(error)
				return MergeWorktreeResult.create({
					success: true,
					message: `已成功将 '${sourceBranch}' 合并到 '${targetBranch}'，但删除工作树失败：${errorMessage}`,
					hasConflicts: false,
					conflictingFiles: [],
					sourceBranch,
					targetBranch,
				})
			}

			// Optionally delete the branch too
			try {
				await git.deleteLocalBranch(sourceBranch)
			} catch {
				// Branch deletion is optional, don't fail if it doesn't work
			}
		}

		telemetryService.captureWorktreeMergeAttempted(true, false, deleteAfterMerge)
		return MergeWorktreeResult.create({
			success: true,
			message: deleteAfterMerge
				? `已成功将 '${sourceBranch}' 合并到 '${targetBranch}' 并移除工作树`
				: `已成功将 '${sourceBranch}' 合并到 '${targetBranch}'`,
			hasConflicts: false,
			conflictingFiles: [],
			sourceBranch,
			targetBranch,
		})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		return MergeWorktreeResult.create({
			success: false,
			message: `意外错误：${errorMessage}`,
			hasConflicts: false,
			conflictingFiles: [],
		})
	}
}
