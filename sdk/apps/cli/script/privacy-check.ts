#!/usr/bin/env bun

import { readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const cliDir = resolve(import.meta.dir, "..");
const repoRoot = resolve(cliDir, "../..");
const maxBytes = 256 * 1024;

const skipPathParts = [
	"/.git/",
	"/node_modules/",
	"/dist/",
	"/dist-standalone/",
	"/coverage/",
];

const binaryExtensions = new Set([
	".a",
	".bin",
	".br",
	".gif",
	".gz",
	".ico",
	".jpg",
	".jpeg",
	".pdf",
	".png",
	".svgz",
	".tgz",
	".webp",
	".woff",
	".woff2",
	".zip",
]);

const secretPatterns: { name: string; pattern: RegExp }[] = [
	{
		name: "private-key",
		pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA |PRIVATE )?PRIVATE KEY-----/,
	},
	{
		name: "openai-or-anthropic-key",
		pattern: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_]{24,}\b/,
	},
	{
		name: "github-token",
		pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
	},
	{
		name: "slack-token",
		pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
	},
	{
		name: "npm-token",
		pattern: /\bnpm_[A-Za-z0-9]{20,}\b/,
	},
	{
		name: "google-api-key",
		pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
	},
	{
		name: "aws-access-key",
		pattern: /\bAKIA[0-9A-Z]{16}\b/,
	},
	{
		name: "bearer-token",
		pattern: /\bBearer\s+[A-Za-z0-9._~-]{30,}\b/,
	},
	{
		name: "credential-url",
		pattern: /\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql):\/\/[^\s"'`]+:[^\s"'`]+@/i,
	},
];

function listCandidateFiles(): string[] {
	const result = Bun.spawnSync(
		["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
		{ cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
	);
	if (result.exitCode !== 0) {
		const stderr = new TextDecoder().decode(result.stderr).trim();
		throw new Error(stderr || "无法列出 git 文件");
	}
	return new TextDecoder()
		.decode(result.stdout)
		.split("\0")
		.filter(Boolean);
}

function shouldSkip(relativePath: string): boolean {
	if (relativePath === "sdk/apps/cli/script/privacy-check.ts") {
		return true;
	}
	const normalized = `/${relativePath.replaceAll("\\", "/")}`;
	if (skipPathParts.some((part) => normalized.includes(part))) {
		return true;
	}
	const extension = normalized.match(/\.[^.\/]+$/)?.[0]?.toLowerCase();
	return extension !== undefined && binaryExtensions.has(extension);
}

function readSmallTextFile(path: string): string | undefined {
	const stat = statSync(path);
	if (!stat.isFile() || stat.size > maxBytes) {
		return undefined;
	}
	const buffer = readFileSync(path);
	if (buffer.includes(0)) {
		return undefined;
	}
	return buffer.toString("utf-8");
}

function isAllowedExample(name: string, line: string): boolean {
	return name === "aws-access-key" && line.includes("AKIAIOSFODNN7EXAMPLE");
}

const findings: string[] = [];
for (const file of listCandidateFiles()) {
	if (shouldSkip(file)) {
		continue;
	}
	const absolutePath = resolve(repoRoot, file);
	let content: string | undefined;
	try {
		content = readSmallTextFile(absolutePath);
	} catch {
		continue;
	}
	if (!content) {
		continue;
	}
	const lines = content.split(/\r?\n/);
	for (const [index, line] of lines.entries()) {
		for (const { name, pattern } of secretPatterns) {
			if (pattern.test(line) && !isAllowedExample(name, line)) {
				findings.push(`${relative(repoRoot, absolutePath)}:${index + 1} ${name}`);
			}
		}
	}
}

if (findings.length > 0) {
	console.error("隐私检查发现疑似密钥或凭据：");
	for (const finding of findings) {
		console.error(`  ${finding}`);
	}
	process.exit(1);
}

console.log("隐私检查通过：未发现疑似密钥或凭据。");
