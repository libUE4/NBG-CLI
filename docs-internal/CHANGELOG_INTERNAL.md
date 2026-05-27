# Internal Changelog

## Relay MVP Pass 1

Date: 2026-05-25

Changes:

- Set the default API provider to the existing `openai` provider.
- Moved the `openai` provider to the top of the provider picker.
- Changed the visible label from `OpenAI Compatible` to `Relay API`.
- Updated the existing OpenAI-compatible settings UI copy for relay/gateway usage.
- Updated the missing-configuration help text for the `openai` provider.
- Kept the provider id as `openai` to avoid proto, storage, and migration churn.

Validation:

- `npm run check-types` passed.
- `npm run build:webview` passed.
- `npm run compile` passed.

Notes:

- This is intentionally a low-risk UI/default-provider pass.
- The runtime still uses `src/core/api/providers/openai.ts`, so it remains compatible with `/v1/chat/completions` OpenAI-style relays.
- A future pass can introduce a true `relay` provider id after profile storage and protobuf conversion points are mapped.

## CLI Command Install

Date: 2026-05-25

Changes:

- Installed a Linux arm64 CLI binary as `/root/.local/bin/nbg`.
- Verified that `nbg --version` returns `3.0.13`.
- Verified that `nbg --help` prints the Cline CLI command help.
- Used the official `@cline/cli-linux-arm64@3.0.13` binary package as the current runnable command target.

Notes:

- `/root/.local/bin/nbg` shadows the existing `/usr/local/bin/nbg` because `/root/.local/bin` appears earlier in `PATH`.
- Local source compilation of the SDK CLI was not completed in this pass because Bun installed several SDK dependencies with missing runtime files in this environment.
- SDK package builds passed after dependency repair attempts, but `bun -F @cline/cli build` still hit unresolved transitive dependency paths.
