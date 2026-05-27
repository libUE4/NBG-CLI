# Baseline Test

Baseline commit: `8a6441fddd3b4d372d086886ebe4ee11e78dc993`

## Completed

### Dependency install

Command:

```bash
npm run install:all
```

Result:

```text
passed
```

Notes:

- Root dependencies installed.
- `webview-ui` dependencies installed.
- npm reported dependency vulnerabilities, but install was not blocked.
- Root audit summary at install time: 27 vulnerabilities.
- Webview audit summary at install time: 16 vulnerabilities.

### Type check

Command:

```bash
npm run check-types
```

Result:

```text
passed
```

Observed steps:

- `npm run protos`
- `node scripts/build-proto.mjs`
- `biome format ...`
- root `tsc --noEmit`
- webview `tsc --noEmit`

### Webview production build

Command:

```bash
npm run build:webview
```

Result:

```text
passed
```

Observed output:

```text
6819 modules transformed
webview-ui/build/assets/index.js generated
```

### Extension compile

Command:

```bash
npm run compile
```

Result:

```text
passed
```

Evidence:

```text
dist/extension.js generated
dist/extension.js.map generated
tree-sitter wasm files copied to dist/
```

## Not Yet Completed

- VS Code Extension Development Host launch.
- End-to-end task execution inside VS Code.
- Relay endpoint live test.
- Unit test suite.
- Integration test suite.
- Marketplace package build.

## Current Baseline Status

The cloned upstream project installs and builds successfully in this environment. It is safe to start focused relay-first edits from this baseline.

## Relay MVP Pass 1 Validation

After the first relay-first UI/default-provider changes:

```text
npm run check-types   passed
npm run build:webview passed
npm run compile       passed
```
