# Risk Register

Baseline commit: `8a6441fddd3b4d372d086886ebe4ee11e78dc993`

## Technical Risks

### OpenAI-compatible is not always compatible

Many gateways claim OpenAI compatibility but differ on streaming chunks, usage chunks, tool-call deltas, error bodies, model listing, or unsupported request fields.

Mitigation:

- Start with `/v1/chat/completions`.
- Add connection tests.
- Add malformed SSE handling.
- Add tool-call compatibility checks.
- Allow manual model IDs.

### Tool calls may fail through relays

Cline's agent quality depends on reliable tool-call parsing. Some gateways strip or alter `tool_calls`.

Mitigation:

- Keep OpenAI-style tool-call support.
- Detect missing or malformed tool-call chunks.
- Surface a clear "model or relay does not support tool calls" error.
- Consider a text-tool fallback only after MVP.

### New provider id creates broad churn

Adding `relay` as a new provider touches type unions, state keys, secrets, provider maps, UI routing, proto conversions, tests, and possibly generated files.

Mitigation:

- MVP: reuse existing `openai` provider and relabel it.
- Later: add real `relay` provider in a focused migration.

### Generated proto/state files can break silently

`src/shared/storage/state-keys.ts` comments state that changes may require running `scripts/generate-state-proto.mjs`.

Mitigation:

- Avoid new state fields until the first working baseline is built.
- If state fields are added, run the generator and inspect generated diffs.

### Heavy dependency/build footprint

The project has a large dependency set and webview build. On the current mobile/proot-like environment, compile and test may be slow.

Mitigation:

- Run narrow checks first.
- Document exact failure output.
- Avoid unnecessary dependency churn.

### SDK CLI Bun dependency extraction can be incomplete

In the current environment, `bun install` for `sdk/` created several `.bun` package directories with missing runtime files. Examples observed during the CLI source build attempt included `zod@4.4.3`, `ws`, `sisteransi`, and some nested CLI provider dependencies.

Mitigation:

- Prefer the already published native CLI package for the temporary `nbg` command.
- For a branded CLI release, build in a clean Linux arm64 CI/container environment instead of this proot-like shell.
- Keep `zod` pinned to `4.3.6` in SDK workspace packages until the `4.4.3` package/runtime issue is understood or no longer present.

## Product And Compliance Risks

### Relay services may be used to violate upstream terms

The plugin should not be designed as a bypass tool.

Mitigation:

- BYO endpoint and BYO API key only.
- No cookie extraction.
- No OAuth/session token scraping.
- No upstream-account automation.
- Neutral "OpenAI-compatible relay" wording.

### Branding confusion

A fork can easily leave Cline, Anthropic, OpenAI, or Claude branding in visible surfaces.

Mitigation:

- Maintain a branding checklist.
- Search before release for `Cline`, `Claude`, `Anthropic`, `OpenAI`, `ChatGPT`, `Codex`, and product names.
- Preserve legal attribution while changing visible product identity.

### Error messages expose sensitive data

Relay error details may contain API keys or upstream account hints.

Mitigation:

- Mask authorization headers and API keys in all UI/logged error messages.
- Put raw error details behind explicit debug UI only after redaction.
