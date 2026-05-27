#!/usr/bin/env bun

import {
	chmodSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cliDir = resolve(import.meta.dir, "..");
const sourcePkg = JSON.parse(readFileSync(join(cliDir, "package.json"), "utf-8"));
const version = String(sourcePkg.version);

function packagePlatform(): string {
	return process.platform === "win32" ? "windows" : process.platform;
}

function platformPackageName(): string {
	return `@nbg/cli-${packagePlatform()}-${process.arch}`;
}

function platformPackageDirName(): string {
	return `cli-${packagePlatform()}-${process.arch}`;
}

function runWrapper(wrapperBin: string, args: string[]): string {
	const env = { ...process.env };
	delete env.NBG_BIN_PATH;
	delete env.CLINE_BIN_PATH;
	delete env.NBG_WRAPPER_PATH;
	delete env.CLINE_WRAPPER_PATH;

	const result = Bun.spawnSync(["node", wrapperBin, ...args], {
		cwd: cliDir,
		env,
		stdout: "pipe",
		stderr: "pipe",
	});
	const stdout = new TextDecoder().decode(result.stdout).trim();
	const stderr = new TextDecoder().decode(result.stderr).trim();
	if (result.exitCode !== 0) {
		throw new Error(
			`wrapper ${args.join(" ")} 退出码 ${result.exitCode}\n${stderr || stdout}`,
		);
	}
	return stdout;
}

const distDir = join(cliDir, "dist", platformPackageDirName());
if (!existsSync(join(distDir, "package.json"))) {
	console.error(`缺少当前平台 dist 包：${distDir}`);
	console.error("请先运行：bun script/build.ts --single");
	process.exit(1);
}

const tempRoot = mkdtempSync(join(tmpdir(), "nbg-install-smoke-"));
try {
	const nodeModules = join(tempRoot, "node_modules");
	const wrapperDir = join(nodeModules, "nbg");
	const wrapperBinDir = join(wrapperDir, "bin");
	const wrapperBin = join(wrapperBinDir, "nbg");
	mkdirSync(wrapperBinDir, { recursive: true });
	copyFileSync(join(cliDir, "bin", "nbg"), wrapperBin);
	chmodSync(wrapperBin, 0o755);
	writeFileSync(
		join(wrapperDir, "package.json"),
		`${JSON.stringify(
			{
				name: "nbg",
				version,
				bin: { nbg: "./bin/nbg" },
				optionalDependencies: {
					[platformPackageName()]: version,
				},
			},
			null,
			2,
		)}\n`,
	);

	const scopeDir = join(nodeModules, "@nbg");
	mkdirSync(scopeDir, { recursive: true });
	symlinkSync(distDir, join(scopeDir, platformPackageDirName()), "junction");

	const actualVersion = runWrapper(wrapperBin, ["--version"]);
	if (actualVersion !== version) {
		throw new Error(`期望版本 ${version}，实际 ${actualVersion}`);
	}

	const helpText = runWrapper(wrapperBin, ["--help"]);
	for (const part of ["用法： nbg", "openai-compatible", "plugin", "schedule"]) {
		if (!helpText.includes(part)) {
			throw new Error(`help 输出缺少：${part}`);
		}
	}

	console.log(`本地安装布局 smoke 通过：nbg -> ${platformPackageName()}@${version}`);
} finally {
	rmSync(tempRoot, { recursive: true, force: true });
}
