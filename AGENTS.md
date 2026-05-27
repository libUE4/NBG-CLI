# Repository Guidelines

## Project Structure & Module Organization

This repository is the NBG fork of the current Cline codebase. Treat Cline-derived runtime packages as the compatibility layer while public product surfaces migrate to NBG. Main extension code lives under `src/`, grouped by task, provider, controller, and host domains. The SDK workspace is in `sdk/`: shared packages are in `sdk/packages/*`, and the NBG CLI is in `sdk/apps/cli`. Webview React code is in `webview-ui/src`, assets in `assets/`, protocol definitions in `proto/`, and docs in `docs/`.

Tests are colocated as `*.test.ts` or placed in nearby `__tests__` directories. Avoid editing generated outputs such as `dist/`, `dist-standalone/`, `node_modules/`, generated model catalogs, and session `*.jsonl` files.

## Build, Test, and Development Commands

- `cd sdk && bun install --backend=copyfile --ignore-scripts --omit=optional`: install SDK workspace dependencies in this environment; a plain `bun install` may fail on hardlink or optional package extraction.
- `cd sdk && bun run build:sdk`: build shared SDK packages.
- `cd sdk/apps/cli && bun script/build.ts --single`: build the current-platform CLI binary.
- `cd sdk && bun run test:unit`: run unit tests for SDK packages and CLI.
- `cd sdk/apps/cli && bun run typecheck`: run TypeScript checks for the CLI.
- `cd sdk && bun run check`: run formatting, builds, typechecks, and publish checks.

Use narrower test commands when changing a small area, for example `bun test sdk/apps/cli/src/tui/components/status-bar.test.ts`.

## Coding Style & Naming Conventions

Use TypeScript and React patterns already present in the target package. Keep files focused by domain, prefer existing helpers over new abstractions, and avoid unrelated refactors. Do not do broad `cline` to `nbg` replacements: provider IDs, storage paths, fixtures, package names, and compatibility APIs must migrate deliberately. Formatting is managed by Biome; run `cd sdk && bun run format` or `bun biome check` before broad changes. Use `camelCase` for variables/functions, `PascalCase` for React components and types, and descriptive `*.test.ts` filenames.

## Testing Guidelines

Unit tests use Vitest, with some CLI-focused tests runnable through Bun's test runner. Add or update tests when behavior changes, especially in `core`, `llms`, and `cli`. Keep fixtures small and avoid live network tests unless explicitly marked or isolated.

## Commit & Pull Request Guidelines

Recent commits use Conventional Commits, for example `fix(cli): show loading dialog during model settings transitions` and `test(llms): add provider VCR smoke tests`. Keep scopes specific (`cli`, `llms`, `shared`, `core`). PRs should include a clear summary, linked issue when relevant, test results, and screenshots or terminal output for UI/TUI changes.

## Security & Configuration Tips

Do not commit API keys, auth tokens, local session logs, or generated credentials. Keep provider configuration in local config files or environment variables. When touching model/provider code, preserve request privacy and avoid logging prompt bodies, secrets, or raw auth headers.
