# NBG 后续清单

## 当前已完成

- 已修复干净安装后的 CLI 本地工具链，`tsc` 与 `vitest` 可从 `@nbg/cli` 工作区运行。
- 已同步 CLI 测试断言到 NBG 中文文案与 `openai-compatible` 默认 provider。
- 已通过 `cd sdk/apps/cli && bun run typecheck`。
- 已通过 `cd sdk/apps/cli && bun run test:unit`。
- 已通过 `cd sdk/apps/cli && bun script/build.ts --single`，生成 `@nbg/cli-linux-arm64@3.0.13`。

## 产品外壳

- 决定首个版本是否继续在 `@nbg/cli` 中保留 `cline` 兼容 bin，或拆到独立兼容包。
- 继续将面向用户的 CLI 文案从 Cline 迁移为 NBG 中文文案，但不要机械替换 provider ID、存储路径和兼容 API。
- 完善发布检查，确保识别 `@nbg/cli-*` 平台包。
- 分段更新 `README.marketplace.md`、`CONTRIBUTING.md` 和公共文档入口，避免一次性操作大文件。

## 平台迁移

- 单独规划 `@cline/*` 到 `@nbg/*` 的包命名空间迁移。
- 保留插件兼容方案，支持仍然 import `@cline/core` 或 `@cline/shared` 的插件。
- 修改公共 API 默认值前，先补齐 SDK beta/vNext 中文文档。
- 启用商业化观测能力前，先补隐私与遥测脱敏测试。
