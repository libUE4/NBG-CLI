import { statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import {
	buildWorkspaceMetadata,
	mergeRulesForSystemPrompt,
	type UserInstructionConfigService,
} from "@cline/core";
import { type AgentMode, buildClineSystemPrompt } from "@cline/shared";
import { isImagePath, loadImageAsDataUrl } from "../utils/image-attachments";

const PLAN_MODE_INSTRUCTIONS = `# 规划模式

你当前处于规划模式。你的职责是探索、分析和制定计划，而不是执行。

- 阅读文件、搜索代码库并收集上下文，以理解问题。
- 当需求不明确时，提出澄清问题。
- 用结构化大纲给出计划，并列出清晰步骤。
- 如果存在多种方案，用中文解释取舍。
- 不要编辑文件、编写代码、运行破坏性命令或做任何变更。
- 不要实现方案，先专注于理解和对齐。

当用户确认计划并准备继续时，使用 switch_to_act_mode 工具切换到执行模式，然后开始实现。`;

export async function resolveSystemPrompt(input: {
	cwd: string;
	explicitSystemPrompt?: string;
	providerId?: string;
	modelId?: string;
	rules?: string;
	mode?: AgentMode;
}): Promise<string> {
	const metadata = await buildWorkspaceMetadata(input.cwd);
	let rules = mergeRulesForSystemPrompt(undefined, input.rules);
	if (input.mode === "plan") {
		rules = rules
			? `${rules}\n\n${PLAN_MODE_INSTRUCTIONS}`
			: PLAN_MODE_INSTRUCTIONS;
	}
	return buildClineSystemPrompt({
		ide: "终端 Shell",
		workspaceRoot: input.cwd,
		workspaceName: basename(input.cwd),
		metadata,
		rules,
		mode: input.mode,
		providerId: input.providerId,
		modelId: input.modelId,
		overridePrompt: input.explicitSystemPrompt,
		platform:
			(typeof process !== "undefined" && process?.platform) || "unknown",
	});
}

export function updateSystemPromptRuntimeIdentity(input: {
	systemPrompt?: string;
	providerId?: string;
	modelId?: string;
}): string | undefined {
	const systemPrompt = input.systemPrompt;
	if (!systemPrompt?.trim()) {
		return undefined;
	}

	const providerId = input.providerId?.trim() || "unknown";
	const modelId = input.modelId?.trim() || "unknown";
	let replacements = 0;
	const replaceLine = (value: string) => (_line: string, prefix: string) => {
		replacements += 1;
		return `${prefix}${value}`;
	};

	const next = systemPrompt
		.replace(
			/^(\s*\d+\.\s*(?:Runtime Provider|运行提供方):\s*).*$/m,
			replaceLine(providerId),
		)
		.replace(
			/^(\s*\d+\.\s*(?:Runtime Model|运行模型):\s*).*$/m,
			replaceLine(modelId),
		);

	return replacements > 0 ? next : undefined;
}

const FILE_MENTION_PREFIX = String.raw`(?:\/|~\/|\.{1,2}\/)`;
const FILE_MENTION_PATTERN_TEST = new RegExp(
	String.raw`@(?:"${FILE_MENTION_PREFIX}[^"\r\n]+"|${FILE_MENTION_PREFIX}\S+)`,
	"i",
);
const FILE_MENTION_PATTERN_EXEC = new RegExp(
	String.raw`@(?:"(${FILE_MENTION_PREFIX}[^"\r\n]+)"|(${FILE_MENTION_PREFIX}\S+))`,
	"g",
);
function hasFileMentions(prompt: string): boolean {
	return FILE_MENTION_PATTERN_TEST.test(prompt);
}

function extractFileMentions(
	prompt: string,
): Array<{ path: string; index: number; raw: string }> {
	const matches: Array<{ path: string; index: number; raw: string }> = [];
	let match: RegExpExecArray | null;
	const pattern = new RegExp(
		FILE_MENTION_PATTERN_EXEC.source,
		FILE_MENTION_PATTERN_EXEC.flags,
	);

	for (;;) {
		match = pattern.exec(prompt);
		if (!match) break;
		const path = match[1] ?? match[2];
		if (!path) continue;
		matches.push({
			path,
			index: match.index,
			raw: match[0],
		});
	}
	return matches;
}

function resolveMentionPath(filePath: string): string {
	if (filePath.startsWith("~/")) {
		return resolve(homedir(), filePath.slice(2));
	}
	return resolve(filePath);
}

export async function buildUserInputMessage(
	rawPrompt: string,
	userInstructionService?: UserInstructionConfigService,
): Promise<{
	prompt: string;
	userImages: string[];
	userFiles: string[];
}> {
	// First, resolve slash commands if the core config service is available.
	let prompt = rawPrompt;
	if (userInstructionService) {
		prompt = userInstructionService.resolveRuntimeSlashCommand(rawPrompt);
	}

	if (!hasFileMentions(prompt)) {
		return {
			prompt,
			userImages: [],
			userFiles: [],
		};
	}

	const fileMentions = extractFileMentions(prompt);

	if (fileMentions.length === 0) {
		return {
			prompt,
			userImages: [],
			userFiles: [],
		};
	}

	fileMentions.sort((a, b) => b.index - a.index);

	let processedPrompt = prompt;
	const userImages: string[] = [];
	const userFiles: string[] = [];
	const loadedImages: Array<{
		index: number;
		dataUrl: string;
		fileName: string;
	}> = [];
	const loadedFiles: Array<{
		index: number;
		path: string;
		fileName: string;
	}> = [];

	for (const mention of fileMentions) {
		try {
			const resolvedPath = resolveMentionPath(mention.path);
			const stats = statSync(resolvedPath);
			if (!stats.isFile()) {
				throw new Error(`路径不是文件：${resolvedPath}`);
			}
			const fileName = basename(resolvedPath);

			if (isImagePath(resolvedPath)) {
				const dataUrl = loadImageAsDataUrl(resolvedPath);
				loadedImages.push({
					index: mention.index,
					dataUrl,
					fileName,
				});
				processedPrompt = processedPrompt.replace(
					mention.raw,
					`[image: ${fileName}]`,
				);
				continue;
			}

			loadedFiles.push({
				index: mention.index,
				path: resolvedPath,
				fileName,
			});
			processedPrompt = processedPrompt.replace(
				mention.raw,
				`[file: ${fileName}]`,
			);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error(`[警告] ${errorMsg}`);
		}
	}

	for (const image of loadedImages.reverse()) {
		userImages.push(image.dataUrl);
	}
	for (const file of loadedFiles.reverse()) {
		userFiles.push(file.path);
	}

	return {
		prompt: processedPrompt,
		userImages,
		userFiles,
	};
}
