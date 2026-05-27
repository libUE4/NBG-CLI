#!/usr/bin/env bun

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const cliDir = resolve(import.meta.dir, "..");
const sourcePkg = JSON.parse(readFileSync(join(cliDir, "package.json"), "utf-8"));
const version = String(sourcePkg.version);

function packagePlatform(): string {
	return process.platform === "win32" ? "windows" : process.platform;
}

function packageDirName(): string {
	return `cli-${packagePlatform()}-${process.arch}`;
}

function binaryName(): string {
	return process.platform === "win32" ? "nbg.exe" : "nbg";
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		console.error(`dist 完整性检查失败：${message}`);
		process.exit(1);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

const distDir = join(cliDir, "dist", packageDirName());
const manifestPath = join(distDir, "package.json");
const binRelativePath = `bin/${binaryName()}`;
const binPath = join(distDir, binRelativePath);

assert(existsSync(manifestPath), `缺少 manifest：${manifestPath}`);
assert(existsSync(binPath), `缺少二进制：${binPath}`);

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as unknown;
assert(isRecord(manifest), "manifest 不是 JSON 对象");
assert(
	manifest.name === `@nbg/cli-${packagePlatform()}-${process.arch}`,
	`manifest name 不正确：${String(manifest.name)}`,
);
assert(manifest.version === version, `manifest version 不等于 ${version}`);
assert(
	Array.isArray(manifest.os) && manifest.os.includes(process.platform),
	`manifest os 未包含 ${process.platform}`,
);
assert(
	Array.isArray(manifest.cpu) && manifest.cpu.includes(process.arch),
	`manifest cpu 未包含 ${process.arch}`,
);
assert(isRecord(manifest.bin), "manifest bin 缺失");
assert(manifest.bin.nbg === binRelativePath, "manifest bin.nbg 指向不正确");
assert(!("cline" in manifest.bin), "manifest 不应发布 cline bin");

if (process.platform !== "win32") {
	const mode = statSync(binPath).mode;
	assert((mode & 0o111) !== 0, "当前平台二进制不可执行");
}

console.log(`dist 完整性检查通过：${manifest.name}@${version}`);
