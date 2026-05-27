# NBG 商业化计划

## 方向

NBG 是基于当前 Cline 代码库底座演进的独立商业化开发者 CLI 与 SDK 产品。本仓库不是从零重写，首要目标是在保留 Cline 派生运行时行为的同时，让 fork 具备独立构建、独立品牌、可测试和可发布能力。

## 版本策略

- 继续把当前 Cline 派生运行时和包图作为兼容层。
- 先建立 NBG 公共产品外壳：仓库元数据、CLI 包、二进制名称、文档、发布检查和支持 runbook。
- 只有在 NBG 外壳可稳定构建和测试后，才逐步把深层包名从 `@cline/*` 迁移到 `@nbg/*`。
- 平台 API 变化走 beta/vNext 轨道，避免一次性破坏现有 SDK 行为。

## 实施阶段

1. 仓库抽离：把当前 Cline worktree 复制到 `/root/nbg`，排除生成物、依赖目录、缓存和日志，并初始化新 git 仓库。
2. 规划锚点：在 `docs-internal/` 中补充计划和 agent 执行提示词，让后续执行延续同一产品方向。
3. 产品外壳：把公开元数据改为 NBG，增加 `nbg` CLI 二进制，并更新仓库首页、Marketplace 文档和贡献指南。
4. 运行时加固：围绕 NBG 产品面统一 CLI 启动、退出码、结构化错误、遥测脱敏、工具策略和 doctor 输出。
5. 发布质量：发布前要求 typecheck、单元测试、构建、包安装 smoke、bundle/package 完整性检查和隐私检查。

## 当前范围

当前已完成仓库抽离、NBG CLI 基础构建、主要入口文档中文化和多轮推送。下一步继续推进阶段 3 的公开文案清理，并开始为阶段 4 梳理运行时加固点。不要做全仓 `cline` 到 `nbg` 的机械替换；很多标识是 provider ID、协议名、测试 fixture 或兼容路径，必须按计划迁移。

## 质量门禁

- `cd sdk/apps/cli && bun run typecheck`
- `cd sdk && bun run test:unit`
- `cd sdk/apps/cli && bun script/build.ts --single`
- `cd sdk/apps/cli && bun run test:smoke`
- `cd sdk/apps/cli && bun run test:dist`
- 后续补齐：包安装 smoke 和隐私检查。
