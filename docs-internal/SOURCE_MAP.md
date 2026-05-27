# Source Map

Baseline:

- Local path: `/root/cline`
- Commit: `8a6441fddd3b4d372d086886ebe4ee11e78dc993`
- Package: `claude-dev`
- Display name: `Cline`
- Version: `3.84.0`
- License: Apache-2.0

This file is the first-pass map of the Cline repository for the relay-first plugin conversion.

## Top-Level Areas

```text
.agents/              Agent-related metadata or automation config.
.changeset/           Changeset release metadata.
.claude/              Claude/Cline local instruction files.
.clinerules/          Cline rule files.
.codex/               Codex-related local instruction files.
.github/              CI, issue templates, workflows.
.husky/               Git hooks.
.vscode/              Workspace/editor configuration.
assets/               Icons and product assets.
docs/                 Upstream documentation.
evals/                Evaluation framework and tasks.
proto/                Protocol buffers and generated/message schema inputs.
scripts/              Build/release/helper scripts.
sdk/                  Cline SDK and shared agent/runtime code.
src/                  VS Code extension host source.
standalone/           Standalone app or runtime surface.
testing-platform/     Test infrastructure.
tests/                Test suites.
walkthrough/          VS Code walkthrough markdown content.
webview-ui/           React/webview UI used by the extension.
```

## Root Configuration Files

```text
package.json          Main extension metadata, scripts, commands, views, activation.
package-lock.json     npm dependency lockfile.
tsconfig.json         Main TypeScript configuration.
tsconfig.test.json    Test TypeScript configuration.
tsconfig.unit-test.json Unit test TypeScript configuration.
biome.jsonc           Formatting/linting configuration.
esbuild.mjs           Extension/webview build configuration.
playwright.config.ts  Playwright configuration.
.vscodeignore         Packaging exclusions.
.env.example          Environment variable example file.
```

## First Observations

- The extension package is still named `claude-dev`, while the display name is `Cline`.
- The VS Code activity bar container id is `claude-dev-ActivityBar`.
- The sidebar webview id is `claude-dev.SidebarProvider`.
- Command ids use the `cline.` prefix.
- The top-level package license is Apache-2.0.
- Branding is spread across `package.json`, assets, walkthrough docs, webview UI, source strings, and marketplace docs.

## Source Audit Status

Completed first-pass maps:

- Provider abstraction and supported model APIs.
- Branding surfaces.
- Run/build commands.
- Relay-specific risk register.

Pending detailed maps:

- Extension activation and command registration.
- Webview-to-extension message protocol.
- Settings UI and persistence.
- Secrets storage.
- Task lifecycle and agent loop.
- Tool execution and approval flow.
- File editing and diff flow.
- Terminal command flow.
- MCP integration.
- Telemetry and account surfaces.
