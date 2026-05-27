# NBG 贡献指南

感谢你参与 NBG。无论是修复 bug、改进文档，还是补齐中文开发者 AI 代理体验，都请先阅读本指南和 [行为准则](CODE_OF_CONDUCT.md)。NBG 当前基于 Cline 运行时兼容层演进，贡献时不要机械替换 provider ID、存储路径或兼容 API。

## 报告 Bug 或问题

Bug 报告能帮助 NBG 持续改进。创建新 issue 前，请先[搜索现有 issue](https://github.com/libUE4/NBG-CLI/issues)，避免重复。准备好后可在 https://github.com/libUE4/NBG-CLI/issues/new/choose 提交。

<blockquote class='warning-note'>
     🔐 <b>重要：</b>如果你发现安全漏洞，请优先使用本仓库的 GitHub 私密漏洞报告能力。不要在公开 issue 中发布漏洞利用细节。
</blockquote>


## 贡献前准备

除小型 bug 修复、错别字、轻微文案改进或不改变行为的简单类型修复外，所有贡献都应先从 GitHub issue 开始。
**功能和较大贡献请遵循：**
- 先检查现有 [NBG issues](https://github.com/libUE4/NBG-CLI/issues)，确认是否已有类似想法。
- 如果是新想法，请创建功能请求。
- 等核心维护者批准后再开始实现。
- 获批后即可创建 PR 并推进实现。

**没有关联已批准 issue 的 PR 可能会被关闭。**


## 选择贡献方向

想找适合上手的任务，可以查看 ["good first issue"](https://github.com/libUE4/NBG-CLI/labels/good%20first%20issue) 或 ["help wanted"](https://github.com/libUE4/NBG-CLI/labels/help%20wanted) 标签。这些任务更适合新贡献者，也代表当前需要帮助的方向。

也欢迎改进 `/docs`、`README.md`、`sdk/apps/cli/README.md` 和 `docs-internal/`。面向公众的文档应优先使用中文和 NBG 品牌，同时在必要处明确说明 Cline 派生兼容层。

## 开发环境


### 本地开发步骤

1. 克隆仓库（需要 [git-lfs](https://git-lfs.com/)）：
    ```bash
    git clone git@github.com:libUE4/NBG-CLI.git
    ```
2. 用 VS Code 打开项目：
    ```bash
    code NBG-CLI
    ```
3. 安装 [bun](https://bun.com)。
4. 安装扩展和 webview UI 需要的依赖：
    ```bash
    npm run install:all
    cd sdk && bun run build && cd ..
    ```
5. 首次构建前需要生成 Protocol Buffer 文件。
6. 按 `F5`，或通过 `Run` -> `Start Debugging` 启动一个加载扩展的新 VS Code 窗口。如果构建时遇到问题，可能需要安装 [esbuild problem matchers extension](https://marketplace.visualstudio.com/items?itemName=connor4312.esbuild-problem-matchers)。




### 创建 Pull Request

1. 提交你的改动。

2. 推送分支并在 GitHub 创建 PR。CI 会运行测试和检查。
3. 测试
    - 本地运行 `npm run test`。
    - 提交 PR 前运行 `npm run format:fix` 格式化代码。

### 扩展开发

1. **VS Code 扩展**

    - 打开项目时，VS Code 会提示安装推荐扩展。
    - 这些扩展是开发所需，请接受安装提示。
    - 如果你之前关闭了提示，可以从扩展面板手动安装。

2. **本地开发**
    - 运行 `npm run install:all` 安装依赖。
    - 运行 `npm run protos` 生成 Protocol Buffer 文件（首次构建前必需）。
    - 运行 `npm run test` 执行本地测试。
    - 使用 Run -> Start Debugging，或执行 `>Debug: Select and Start Debugging`，等待新的 VS Code 实例打开。
    - **终端工作流**：使用 `npm run dev`（生成 protos 并进入 watch 模式），或在 protos 已生成时使用 `npm run watch`。
    - 提交 PR 前运行 `npm run format:fix` 格式化代码。

3. **Linux 专用设置**
    Linux 上的 VS Code 扩展测试需要以下系统库：

    - `dbus`
    - `libasound2`
    - `libatk-bridge2.0-0`
    - `libatk1.0-0`
    - `libdrm2`
    - `libgbm1`
    - `libgtk-3-0`
    - `libnss3`
    - `libx11-xcb1`
    - `libxcomposite1`
    - `libxdamage1`
    - `libxfixes3`
    - `libxkbfile1`
    - `libxrandr2`
    - `xvfb`

    这些库为测试环境提供必要的 GUI 组件和系统服务。

    例如在 Debian 系发行版（如 Ubuntu）上，可以用 apt 安装：
    ```bash
    sudo apt update
    sudo apt install -y \
      dbus \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libdrm2 \
      libgbm1 \
      libgtk-3-0 \
      libnss3 \
      libx11-xcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxfixes3 \
      libxkbfile1 \
      libxrandr2 \
      xvfb
    ```

## 编写和提交代码

任何人都可以为 NBG 贡献代码。为保证改动能顺利合入，请遵循以下要求：

1. **保持 PR 聚焦**

    - 每个 PR 限定在单一功能或 bug 修复。
    - 将较大的改动拆成多个相关的小 PR。
    - 按逻辑拆分提交，便于独立审查。

2. **代码质量**

    - 运行 `npm run lint` 检查代码风格。
    - 运行 `npm run format` 自动格式化代码。
    - 所有 PR 必须通过包含 lint 和格式检查的 CI。
    - 提交前处理 linter 的警告和错误。
    - 遵循 TypeScript 最佳实践并保持类型安全。

3. **测试**

    - 新功能需要补充测试。
    - 运行 `npm test` 确认测试通过。
    - 如果改动影响现有行为，需要同步更新测试。
    - 适合时同时补充单元测试和集成测试。

    **端到端（E2E）测试**
    
    NBG 继承了基于 Playwright 的 E2E 测试，用于模拟用户在 VS Code 扩展中的真实交互：
    
    - **运行 E2E 测试：**
      ```bash
      npm run test:e2e        # 构建并运行所有 E2E 测试
      npm run e2e             # 不重新构建，直接运行测试
      npm run test:e2e -- --debug  # 使用交互式调试器运行
      ```
    
    - **编写 E2E 测试：**
      - 测试位于 `src/test/e2e/`。
      - 单根工作区测试使用 `e2e` fixture。
      - 多根工作区测试使用 `e2eMultiRoot` fixture。
      - 参考 `auth.test.ts`、`chat.test.ts`、`diff.test.ts` 和 `editor.test.ts` 的现有模式。
      - 详细文档见 `src/test/e2e/README.md`。
    
    - **调试模式能力：**
      - 交互式 Playwright Inspector，用于逐步调试。
      - 录制新交互并自动生成测试代码。
      - 可视化 VS Code 实例，便于手动测试。
      - 元素检查和 selector 验证。
    
    - **测试环境：**
      - 自动化 VS Code 设置，并加载 NBG 扩展。
      - 用于后端测试的 mock API server。
      - 带测试 fixture 的临时工作区。
      - 失败测试的视频录制。

4. **版本与变更记录**

    - 贡献者不需要在 PR 中创建 changelog-entry 文件。
    - 维护者会在发布流程中处理版本号和变更记录整理。

5. **提交信息**

    - 提交信息要清晰、具体。
    - 使用 Conventional Commits 格式，例如 `feat:`、`fix:`、`docs:`。
    - 需要时用 `#issue-number` 引用相关 issue。

6. **提交前检查**

    - 将分支 rebase 到最新 `main`。
    - 确认分支可以成功构建。
    - 再次确认所有测试通过。
    - 检查是否残留调试代码或 console 日志。

7. **Pull Request 描述**
    - 清楚说明改动内容。
    - 包含验证步骤。
    - 列出任何破坏性变更。
    - UI 改动需要附截图。

## 贡献协议

提交 pull request 即表示你同意贡献内容使用本项目相同许可证（[Apache 2.0](LICENSE)）。

请记住：为 NBG 贡献意味着在保留 Cline 派生运行时兼容路径的同时，推进一个商业化、中文优先的开发者 AI 代理。
