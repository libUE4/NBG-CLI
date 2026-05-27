#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const cliDir = resolve(import.meta.dir, "..");
const pkg = JSON.parse(readFileSync(join(cliDir, "package.json"), "utf-8"));
const version = String(pkg.version);

function currentPlatformPackageDir(): string {
	const platform = process.platform === "win32" ? "windows" : process.platform;
	return `cli-${platform}-${process.arch}`;
}

function binaryPath(): string {
	const binaryName = process.platform === "win32" ? "nbg.exe" : "nbg";
	return join(cliDir, "dist", currentPlatformPackageDir(), "bin", binaryName);
}

function runBinary(binary: string, args: string[]): string {
	const result = Bun.spawnSync([binary, ...args], {
		cwd: cliDir,
		stdout: "pipe",
		stderr: "pipe",
	});
	const stdout = new TextDecoder().decode(result.stdout).trim();
	const stderr = new TextDecoder().decode(result.stderr).trim();
	if (result.exitCode !== 0) {
		throw new Error(
			`nbg ${args.join(" ")} 退出码 ${result.exitCode}\n${stderr || stdout}`,
		);
	}
	return stdout;
}

const binary = binaryPath();
if (!existsSync(binary)) {
	console.error(`未找到当前平台二进制：${binary}`);
	console.error("请先运行：bun script/build.ts --single");
	process.exit(1);
}

const actualVersion = runBinary(binary, ["--version"]);
if (actualVersion !== version) {
	console.error(`版本 smoke 失败：期望 ${version}，实际 ${actualVersion}`);
	process.exit(1);
}

const helpText = runBinary(binary, ["--help"]);
const requiredHelpParts = [
	"用法： nbg",
	"终端里的 AI 编码助手",
	"openai-compatible",
	"plugin",
	"schedule",
];
const missing = requiredHelpParts.filter((part) => !helpText.includes(part));
if (missing.length > 0) {
	console.error(`帮助 smoke 失败，缺少：${missing.join(", ")}`);
	process.exit(1);
}

console.log(`NBG CLI smoke 通过：${actualVersion}`);
