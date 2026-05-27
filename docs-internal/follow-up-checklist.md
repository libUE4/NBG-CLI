# NBG Follow-up Checklist

## Immediate

- Repair local Bun dependency installation so `sdk/node_modules/.bin` is present and packages are not empty symlinks.
- Run `cd sdk/apps/cli && bun run typecheck` after dependency repair.
- Run `cd sdk && bun -F @nbg/cli test:unit`.
- Run `cd sdk/apps/cli && bun script/build.ts --single`.
- Smoke the generated binary with `nbg --version` and `nbg --help`.

## Product Shell

- Decide whether to keep the `cline` compatibility bin in `@nbg/cli` for the first release or move it to a separate compatibility package.
- Update CLI runtime copy from "Cline" to "NBG" only where it is product-facing, not where it names provider IDs or compatibility internals.
- Update package publish checks to understand `@nbg/cli-*` platform packages.
- Update `README.marketplace.md`, `CONTRIBUTING.md`, and public docs entry points for NBG.

## Platform Migration

- Plan `@cline/*` to `@nbg/*` package namespace migration separately.
- Preserve a compatibility story for plugins that import `@cline/core` or `@cline/shared`.
- Add SDK beta/vNext docs before changing public API defaults.
- Add privacy and telemetry redaction tests before enabling any commercial observability defaults.
