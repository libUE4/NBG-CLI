<div align="center"><sub>
简体中文 | <a href="https://github.com/libUE4/NBG-CLI" target="_blank">GitHub</a> | <a href="https://github.com/libUE4/NBG-CLI/issues" target="_blank">Issues</a>
</sub></div>

# NBG
<div align="center">
<table>
<tbody>
<td align="center">
<a href="https://github.com/libUE4/NBG-CLI" target="_blank"><strong>GitHub 仓库</strong></a>
</td>
<td align="center">
<a href="https://github.com/libUE4/NBG-CLI/issues" target="_blank"><strong>反馈问题</strong></a>
</td>
<td align="center">
<a href="./CONTRIBUTING.md" target="_blank"><strong>贡献指南</strong></a>
</td>
<td align="center">
<a href="./docs-internal/commercialization-plan.md" target="_blank"><strong>商业化计划</strong></a>
</td>
<td align="center">
<a href="./README.md" target="_blank"><strong>快速开始</strong></a>
</td>
</tbody>
</table>
</div>

认识 NBG，一个面向中文开发工作流的商业化 AI 代理，覆盖 **CLI** 与编辑器场景。

NBG 基于 Cline 派生运行时构建，保留成熟的工具调用、文件编辑、终端执行、浏览器自动化与 MCP 扩展能力，同时把用户可见体验迁移到独立 NBG 品牌和中文文案。它可以分步骤处理复杂开发任务，并在关键文件修改和命令执行前保留人工确认路径。

1. Enter your task and add images to convert mockups into functional apps or fix bugs with screenshots.
2. NBG starts by analyzing your file structure & source code ASTs, running regex searches, and reading relevant files to get up to speed in existing projects. By carefully managing what information is added to context, NBG can provide valuable assistance even for large, complex projects without overwhelming the context window.
3. Once NBG has the information it needs, it can:
    - Create and edit files + monitor linter/compiler errors along the way, letting him proactively fix issues like missing imports and syntax errors on his own.
    - Execute commands directly in your terminal and monitor their output as he works, letting him e.g., react to dev server issues after editing a file.
    - For web development tasks, NBG can launch the site in a headless browser, click, type, scroll, and capture screenshots + console logs, allowing it to fix runtime errors and visual bugs.
4. When a task is completed, NBG will present the result to you with a terminal command like `open -a "Google Chrome" index.html`, which you run with a click of a button.

> [!TIP]
> 当前 NBG 保留 Cline 兼容层的部分内部命名。贡献时不要机械替换 provider ID、存储路径或兼容 API。

---

<img align="right" width="340" src="https://github.com/user-attachments/assets/3cf21e04-7ce9-4d22-a7b9-ba2c595e88a4">

### 使用任意 API 和模型

NBG 支持 OpenRouter、Anthropic、OpenAI、Google Gemini、AWS Bedrock、Azure、GCP Vertex、Cerebras、Groq 等 API provider，也支持任意 OpenAI-compatible 端点和 LM Studio/Ollama 本地模型。OpenRouter 模型列表会自动拉取，方便使用最新模型。

The extension also keeps track of total tokens and API usage cost for the entire task loop and individual requests, keeping you informed of spend every step of the way.

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="left" width="370" src="https://github.com/user-attachments/assets/81be79a8-1fdb-4028-9129-5fe055e01e76">

### 在终端执行命令

借助 [VS Code v1.93 shell integration](https://code.visualstudio.com/updates/v1_93#_terminal-shell-integration-api)，NBG 可以直接在终端执行命令并读取输出。它能安装依赖、运行构建脚本、部署应用、管理数据库、执行测试，并根据你的开发环境和工具链调整执行方式。

对于开发服务器这类长时间运行的进程，可以让命令在后台继续运行，同时让 NBG 根据新的终端输出继续推进任务，例如在编辑文件后处理编译错误。

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="right" width="400" src="https://github.com/user-attachments/assets/c5977833-d9b8-491e-90f9-05f9cd38c588">

### 创建和编辑文件

NBG 可以直接在编辑器中创建和修改文件，并以 diff 视图展示变更。你可以在 diff 编辑器里修改或撤销 NBG 的变更，也可以继续在聊天中给出反馈，直到结果满足预期。NBG 还会关注 linter/compiler 错误，例如缺失 import 或语法错误，并在任务过程中修复。

NBG 对文件的改动会记录在 Timeline 中，便于追踪和回滚。

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="left" width="370" src="https://github.com/user-attachments/assets/bc2e85ba-dfeb-4fe6-9942-7cfc4703cbe5">

### 使用浏览器

在支持浏览器自动化的模型和工具链下，NBG 可以启动浏览器、点击元素、输入文本、滚动页面，并在每一步采集截图和控制台日志。这适合交互式调试、端到端测试和 Web QA。

例如让 NBG “测试这个应用”，它可以运行 `npm run dev`，在浏览器中打开本地服务，并执行一系列检查来确认功能是否正常。

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="right" width="350" src="https://github.com/user-attachments/assets/ac0efa14-5c1f-4c26-a42d-9d7c56f5fadd">

### “添加一个工具……”

通过 [Model Context Protocol](https://github.com/modelcontextprotocol)，NBG 可以接入自定义工具。你既可以使用社区 MCP server，也可以让 NBG 为你的特定工作流创建和安装工具。这些工具会成为后续任务可复用的能力。

-   “添加一个读取 Jira ticket 的工具”：拉取验收条件并交给 NBG 处理
-   "add a tool that manages AWS EC2s": Check server metrics and scale instances up or down
-   “添加一个读取 PagerDuty incident 的工具”：拉取告警详情并让 NBG 修复问题

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="left" width="360" src="https://github.com/user-attachments/assets/7fdf41e6-281a-4b4b-ac19-020b838b6970">

### 添加上下文

**`@url`:** 粘贴 URL，让扩展抓取并转换为 Markdown，适合把最新文档交给 NBG

**`@problems`:** 添加工作区 Problems 面板中的错误和警告，让 NBG 修复

**`@file`:** Adds a file's contents so you don't have to waste API requests approving read file (+ type to search files)

**`@folder`:** Adds folder's files all at once to speed up your workflow even more

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

<img align="right" width="350" src="https://github.com/user-attachments/assets/140c8606-d3bf-41b9-9a1f-4dbf0d4c90cb">

### 检查点：比较和恢复

NBG 在任务执行过程中会为工作区创建检查点。你可以用“Compare”查看检查点和当前工作区的差异，也可以用“Restore”回滚到某一步。

For example, when working with a local web server, you can use 'Restore Workspace Only' to quickly test different versions of your app, then use 'Restore Task and Workspace' when you find the version you want to continue building from. This lets you safely explore different approaches without losing progress.

<!-- Transparent pixel to create line break after floating image -->

<img width="2000" height="0" src="https://github.com/user-attachments/assets/ee14e6f7-20b8-4391-9091-8e8e25561929"><br>

## Contributing

如需贡献，请从 [Contributing Guide](CONTRIBUTING.md) 开始。NBG 当前优先推进中文化、CLI 商业化体验、SDK 兼容层和安全发布流程。

## Enterprise

NBG 的企业化方向包括 SSO、全局策略配置、审计和观测、私有网络、自托管或本地化部署，以及企业支持。当前规划记录在 [商业化计划](./docs-internal/commercialization-plan.md) 中。


## License

[Apache 2.0](./LICENSE)
