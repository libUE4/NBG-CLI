# 包概览

本目录说明 SDK 包级职责。当前 `@cline/*` 包名仍作为兼容层保留，NBG 命名空间迁移需要按计划分阶段推进。

- 高层包职责：本文件（`packages/README.md`）
- 包交互和运行时流程：[`ARCHITECTURE.md`](./ARCHITECTURE.md)

## 包职责

| 包 | 主要职责 | 典型使用方 | 内部依赖 |
| --- | --- | --- | --- |
| `@cline/shared` | 跨包共享基础能力（路径解析、会话通用类型、索引 helper） | `@cline/agents`, `@cline/core`, apps | 无 |
| `@cline/llms` | 模型目录、provider 设置 schema、handler 创建 SDK | `@cline/agents`, `@cline/core`, apps | 无 |
| `@cline/agents` | 无状态 agent runtime loop（工具、hooks、扩展、团队、流式输出） | `@cline/core`, apps | `@cline/llms`, `@cline/shared` |
| `@cline/core` | 有状态运行时编排（runtime 组合、会话生命周期/存储、本地和 hub 服务、hub discovery 和 client helpers） | CLI/Desktop apps | `@cline/agents`, `@cline/llms`, `@cline/shared` |

## 包如何协作

1. `@cline/llms` 定义模型/provider 能力，并构建具体 handler。
2. `@cline/agents` 基于这些 handler 和工具执行基础能力运行 agent loop。
3. `@cline/core` 将运行时行为与持久化会话/存储、本地或 hub-backed 服务组合起来。
4. `@cline/core` hub 服务编排计划任务执行、执行历史和 schedule 命令处理。
5. `@cline/core/hub` 在 host 需要共享 daemon 时提供 discovery、detached hub daemon 和面向会话的 client API（`HubSessionClient`, `HubUIClient`）。
6. `@cline/shared` 提供整个栈共用的契约、路径和会话基础能力。

## 实用边界规则

- provider/model schema、目录和 handler wiring 放在 `@cline/llms`。
- loop、tool、hook、team 执行行为放在 `@cline/agents`。
- 持久化、会话生命周期和 runtime assembly 放在 `@cline/core`。
- 计划任务执行和 schedule 持久化放在 `@cline/core` hub 服务。
- hub discovery、attach flows 和 session-oriented client adapters 放在 `@cline/core/hub`。
- 跨包工具类型、路径常量和会话常量放在 `@cline/shared`。
- remote-config schema、materialization、telemetry normalization 和 blob upload 基础能力放在 `@cline/shared/remote-config`。

## 运行时入口

- 包暴露独立 Node alias 时，保留面向 Node 的 import 入口。
- `@cline/core` 当前是 host/session 服务的 Node/runtime-oriented 入口。
- 需要浏览器 surface 的包仍可保留浏览器入口，但 `@cline/core` 不再暴露浏览器入口。

## 文档收敛说明

更新引用后，可逐步减少或移除嵌套包内的 `README.md` 和 `ARCHITECTURE.md` 重复内容。
