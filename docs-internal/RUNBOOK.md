# Runbook

Baseline commit: `8a6441fddd3b4d372d086886ebe4ee11e78dc993`

## Environment

Observed local environment:

```text
node: v20.20.2
npm: 10.8.2
rg: 14.1.1
```

The repository root is:

```text
/root/cline
```

## Important Scripts

Root `package.json`:

```text
npm run install:all
  npm install && cd webview-ui && npm install

npm run dev
  npm run protos && npm run watch

npm run compile
  npm run check-types && npm run lint && node esbuild.mjs

npm run package
  npm run check-types && npm run build:webview && npm run lint && node esbuild.mjs --production

npm run check-types
  npm run protos && npx tsc --noEmit && cd webview-ui && npx tsc --noEmit

npm run lint
  biome lint ... && npm run lint:proto

npm run test:unit
  cross-env TS_NODE_PROJECT=./tsconfig.unit-test.json mocha

npm run test:integration
  vscode-test

npm run build:webview
  cd webview-ui && npm run build
```

Webview `webview-ui/package.json`:

```text
npm run build
  tsc -b && vite build

npm run test
  vitest run
```

## Baseline Verification Plan

Run in this order:

```bash
npm run install:all
npm run check-types
npm run build:webview
npm run compile
```

Current result:

```text
npm run install:all   passed
npm run check-types   passed
npm run build:webview passed
npm run compile       passed
```

If the compile path is too heavy for the current device, run a narrower provider-only check:

```bash
npm run protos
npx tsc --noEmit
cd webview-ui && npx tsc --noEmit
```

## VS Code Extension Development

Likely flow:

1. Run `npm run install:all`.
2. Run `npm run dev` or `npm run watch`.
3. Open the repository in VS Code.
4. Start the extension debug configuration from `.vscode/launch.json`.
5. Configure the current OpenAI-compatible provider with a relay endpoint.
6. Test a small workspace edit.

This still needs to be validated after dependency installation.

## Dependency Notes

- The root project uses npm and `package-lock.json`.
- The SDK subproject uses Bun, but the relay-first VS Code MVP should not require SDK changes at the start.
- Avoid editing generated proto/state files until the storage and conversion flow is fully understood.

## CLI Binary: `nbg`

Current local command:

```bash
command -v nbg
nbg --version
nbg --help
```

Current result:

```text
/root/.local/bin/nbg
3.0.13
```

Implementation note:

- `/root/.local/bin` is earlier in `PATH` than `/usr/local/bin`, so `/root/.local/bin/nbg` safely shadows the pre-existing `/usr/local/bin/nbg` file without overwriting it.
- The installed binary currently comes from the official `@cline/cli-linux-arm64@3.0.13` package, which matches the cloned CLI package version.
- The local source build path remains important for a branded fork, but the current environment exposed Bun dependency extraction issues in `sdk/node_modules/.bun` where some packages were installed with missing runtime files.

Reinstall current binary:

```bash
mkdir -p /tmp/nbg-cline-bin
cd /tmp/nbg-cline-bin
npm pack @cline/cli-linux-arm64@3.0.13 --silent
tar -xzf cline-cli-linux-arm64-3.0.13.tgz
install -m 0755 package/bin/cline /root/.local/bin/nbg
nbg --version
```

Target future source build:

```bash
cd /root/cline/sdk
bun install --filter @cline/cli --filter @cline/core --filter @cline/llms --filter @cline/shared --filter @cline/agents --filter @cline/sdk --force --backend=symlink --linker=isolated --ignore-scripts
bun --production -F './packages/*' build
bun -F @cline/cli build
bun -F @cline/cli build:platforms:single
install -m 0755 apps/cli/dist/cli-linux-arm64/bin/cline /root/.local/bin/nbg
```

## NBG Fork Execution Log

Repository root:

```text
/root/nbg
```

Current fork strategy:

- `/root/nbg` was created from the current `/root/cline` worktree, excluding `.git`, `node_modules`, `dist`, `dist-standalone`, package dist folders, caches, coverage, and `*.jsonl` files.
- `/root/nbg` has its own git repository on branch `main`.
- Public shell metadata now identifies the product as NBG while `@cline/*` runtime packages remain as the compatibility layer.

Current NBG package surfaces:

```text
package.json                  name: nbg
sdk/package.json              name: @nbg/packages
sdk/apps/cli/package.json     name: @nbg/cli
sdk/apps/cli/package.json     bin: nbg -> bin/nbg
```

Dependency install notes:

```text
cd /root/nbg/sdk
bun install
```

Result: failed in this environment with many `EPERM: failed to link package` errors and then `husky: command not found` during `prepare`.

Retry:

```text
bun install --backend=copyfile --ignore-scripts
```

Result: failed while extracting non-current-platform optional packages such as `@next/swc-linux-arm64-musl` and `@anthropic-ai/claude-agent-sdk-linux-arm64-musl`.

Successful reduced install:

```text
bun install --backend=copyfile --ignore-scripts --omit=optional
```

Result: completed, but some package links produced incomplete package contents in this environment; `tsc` was not available through `.bin`, so full typecheck/build validation is not yet authoritative.

Static validation run:

```text
node -e "const fs=require('fs'); for (const f of ['package.json','sdk/package.json','sdk/apps/cli/package.json']) { const p=JSON.parse(fs.readFileSync(f,'utf8')); console.log(f, p.name, p.displayName || ''); }"
```

Observed:

```text
package.json nbg NBG
sdk/package.json @nbg/packages
sdk/apps/cli/package.json @nbg/cli nbg
```

Next verification target:

```bash
cd /root/nbg/sdk
bun install --backend=copyfile --ignore-scripts --omit=optional
cd apps/cli
bun run typecheck
cd /root/nbg/sdk
bun -F @nbg/cli test:unit
bun -F @nbg/cli build
```

If `.bin` is still missing, repair the local install before treating typecheck/build results as meaningful.
