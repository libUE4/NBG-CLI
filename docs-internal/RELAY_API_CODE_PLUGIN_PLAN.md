# Cline Relay API Code Plugin Plan

This document is the working plan for turning Cline into a branded VS Code coding agent focused on third-party API gateways and reverse proxies, such as Sub2API, New API, One API, OpenRouter, and other OpenAI-compatible or Anthropic-compatible relay services.

Baseline source:

- Upstream: https://github.com/cline/cline
- Local path: `/root/cline`
- Baseline commit: `8a6441fddd3b4d372d086886ebe4ee11e78dc993`
- Upstream package name: `claude-dev`
- Upstream display name: `Cline`
- Upstream version at clone time: `3.84.0`
- License: Apache-2.0

## Product Goal

Build a VS Code coding agent plugin based on Cline, but position it as a relay-first client:

- The plugin talks to user-supplied API gateways, not to our own model runtime.
- The gateway may forward requests to Claude, OpenAI, Gemini, Kimi, local models, or other upstream services.
- The plugin should not embed any upstream account extraction, cookie capture, token scraping, or bypass logic.
- The plugin should expose robust configuration for base URLs, API keys, model IDs, custom headers, streaming behavior, and fallback routes.

Target architecture:

```text
VS Code Plugin
  -> Relay Provider Layer
    -> Sub2API / New API / One API / OpenRouter / custom gateway
      -> Claude / OpenAI / Gemini / Kimi / local or hosted models
```

## Hard Boundaries

- Keep Cline's Apache-2.0 license and attribution requirements intact.
- Rebrand the product, but do not erase required upstream license notices.
- Do not claim affiliation with Cline, Anthropic, OpenAI, Kimi, or any relay provider.
- Do not ship code that collects user cookies, subscription credentials, or browser session tokens.
- Do not hardcode endpoints that imply bypassing official provider terms.
- Treat all gateway URLs and API keys as user-owned configuration.

## Phase 1: Source Audit

Objective: understand the Cline codebase before changing behavior.

Tasks:

- Record repository commit, branch, and remote.
- Read top-level project configuration.
- Map package scripts and build/test commands.
- Identify VS Code extension activation flow.
- Identify webview UI entrypoints.
- Identify provider abstraction and model selection logic.
- Identify storage and secrets handling.
- Identify task loop, tool calling, file editing, diff, terminal, checkpoints, and MCP integration.
- Identify branding surfaces and marketplace metadata.
- Identify telemetry, account, cloud, and hosted service surfaces.

Expected files:

- `docs-internal/SOURCE_MAP.md`
- `docs-internal/BRANDING_SURFACES.md`
- `docs-internal/PROVIDER_MAP.md`
- `docs-internal/AGENT_LOOP.md`
- `docs-internal/RISK_REGISTER.md`

## Phase 2: Run Original Cline

Objective: establish a working baseline before modifications.

Tasks:

- Install dependencies.
- Run typecheck, lint, and unit tests where available.
- Build extension artifacts.
- Launch extension development host.
- Configure a known-good model endpoint.
- Test file read, file edit, diff review, terminal command approval, task cancellation, and task resume.

Notes:

- This phase requires dependency installation and may take time.
- If dependency installation fails because of registry, platform, or Node version issues, document the error exactly before changing tooling.
- Do not start branding edits until the baseline build and basic extension flow are understood.

Expected files:

- `docs-internal/RUNBOOK.md`
- `docs-internal/BASELINE_TEST.md`
- `docs-internal/KNOWN_ISSUES.md`

## Phase 3: Relay Provider Design

Objective: add a first-class provider designed for third-party gateways.

Provider names to evaluate:

- Relay API
- Custom Relay
- OpenAI-Compatible Relay
- Gateway API

Initial fields:

- Profile name
- Protocol type
- Base URL
- API key
- Model ID
- Optional model display name
- Optional custom headers
- Optional organization/project header fields
- Optional request timeout
- Optional max retries
- Optional stream mode override
- Optional tool-call mode override
- Optional context window override
- Optional max output token override

Initial protocol support:

```text
OpenAI-compatible Chat Completions: /v1/chat/completions
```

Next protocol support:

```text
Anthropic-compatible Messages: /v1/messages
OpenAI Responses: /v1/responses
Gemini-compatible endpoints
```

Required behavior:

- Manual model entry must work even if `/v1/models` is unavailable.
- `/v1/models` fetch should be optional and non-blocking.
- Streaming must support provider quirks without freezing the UI.
- Tool-call support must be detected or manually configurable.
- If tool calling fails, the plugin should show a specific compatibility error instead of a generic failure.

## Phase 4: Multi-Gateway Profiles

Objective: support more than one relay endpoint.

Profile schema:

```text
id
name
protocol
baseUrl
apiKeySecretRef
defaultModel
modelAliases
customHeaders
enabled
priority
createdAt
updatedAt
```

Required UI:

- Add profile
- Edit profile
- Delete profile
- Test connection
- Fetch models
- Set default
- Duplicate profile
- Import/export profile JSON without secrets by default

Runtime behavior:

- Task uses the selected profile at task start.
- Profile changes should not silently mutate an active task unless the user chooses to switch.
- Optional sticky session header should be stable for a task.
- Failed requests should show which profile, model, endpoint, and protocol failed.

## Phase 5: Sub2API Compatibility

Objective: support Sub2API-style gateways without embedding Sub2API itself.

Plugin-side features:

- Custom headers.
- Optional `session_id` header.
- Per-task sticky session value.
- Workspace-level sticky session value.
- Health check request.
- Clear error messages for upstream overload, quota exhaustion, invalid API key, invalid model, and malformed stream.

Important implementation note:

- Some deployments may strip headers containing underscores unless their reverse proxy is configured to allow them.
- The UI should avoid implying that `session_id` always works; it should expose this as an advanced option.

Non-goals:

- Do not run or bundle the Sub2API server in the extension.
- Do not manage upstream user accounts inside the extension.
- Do not add logic to obtain upstream private credentials.

## Phase 6: Branding And Identity

Objective: make the plugin its own product while preserving license obligations.

Files and areas to inspect:

- `package.json`
- `README.md`
- `README.marketplace.md`
- `CHANGELOG.md`
- `assets/`
- `walkthrough/`
- `webview-ui/`
- `src/`
- `.vscodeignore`

Fields to change:

- `name`
- `displayName`
- `description`
- `publisher`
- `repository`
- `homepage`
- `icon`
- command titles
- walkthrough title and copy
- activity bar title
- settings labels
- UI copy
- marketplace copy

Fields to keep or handle carefully:

- `license`
- Apache-2.0 license text
- upstream attribution
- third-party notices if present
- dependency licenses

## Phase 7: User Experience Improvements

Objective: make relay configuration easy enough for non-expert users.

Required flow:

1. User opens extension.
2. User chooses "Relay API".
3. User enters base URL, key, and model ID.
4. User clicks "Test".
5. User starts coding task.

UX requirements:

- Clear base URL examples.
- Detect common `/v1` double-prefix mistakes.
- Show masked API keys.
- Show model ID exactly as sent.
- Show raw error details behind an expandable section.
- Distinguish extension error, relay error, and upstream model error.
- Do not block users from entering a model manually.
- Do not require account signup for BYO endpoint mode.

## Phase 8: Error Mapping

Objective: replace vague provider failures with actionable relay-specific errors.

Error categories:

- Invalid base URL
- DNS or network failure
- TLS/certificate failure
- HTTP 401 invalid API key
- HTTP 403 forbidden by gateway
- HTTP 404 wrong endpoint or model unavailable
- HTTP 408/504 timeout
- HTTP 429 quota exhausted or rate limited
- HTTP 500 gateway failure
- HTTP 502/503 upstream unavailable
- Non-JSON error body
- Malformed SSE stream
- Missing final stream terminator
- Tool-call schema unsupported
- Context window exceeded
- Model refused or safety-blocked

Each mapped error should include:

- Short user-facing message
- Technical detail
- Endpoint used
- Model used
- Profile used
- Suggested next step

## Phase 9: Testing Matrix

Minimum manual tests:

- OpenAI-compatible relay with streaming on.
- OpenAI-compatible relay with streaming off.
- Model listing available.
- Model listing unavailable.
- Wrong API key.
- Wrong model name.
- Wrong base URL.
- Rate limit response.
- Malformed SSE response.
- No tool-call support.
- Large file read.
- Multi-file edit.
- Terminal command approval.
- Task cancellation.
- Task continuation.

Gateway targets:

- Sub2API
- New API
- One API
- OpenRouter
- Local LiteLLM or compatible mock server

VS Code targets:

- VS Code Stable
- VS Code Insiders if needed
- Cursor compatibility only after core VS Code flow is stable

Platform targets:

- Linux
- macOS
- Windows

## Phase 10: Release Plan

Internal build:

- Rebranded plugin identity.
- Relay provider works with one OpenAI-compatible gateway.
- Manual model entry works.
- Streaming works for simple chat and code edits.
- Basic error messages are mapped.

Alpha:

- Multi-profile support.
- Connection test.
- Model fetch.
- Advanced custom headers.
- Sub2API compatibility tests.

Beta:

- Import/export profiles.
- Fallback gateway selection.
- Better stream compatibility.
- Full marketplace copy.
- Privacy policy and terms links.

1.0:

- Stable relay-first provider.
- Stable branding.
- Documented setup for common gateways.
- Regression test suite for provider compatibility.
- Build and packaging process documented.

## Immediate Next Actions

1. Generate a source map of the cloned repository.
2. Locate provider abstraction files.
3. Locate settings UI files.
4. Locate extension activation and command registration.
5. Locate secrets storage and configuration persistence.
6. Draft `PROVIDER_MAP.md`.
7. Draft `BRANDING_SURFACES.md`.
8. Install dependencies only after the source map is documented.

## Progress Log 2026-05-26

Completed in the CLI path:

- `nbg` now defaults to the OpenAI-compatible third-party provider instead of restoring old official providers on startup.
- Onboarding keeps the normal path focused on 三方 API; official Claude/Codex/Cline login entries are no longer part of the main choice flow.
- 三方 API setup fetches upstream models with the API key and supports `/v1/models` plus `/models` fallback.
- The model selector can use fetched upstream models and still allows manual custom model IDs.
- User-facing skills entry points were removed from the interactive CLI.
- `/account` was removed from the interactive slash-command registry and local command action path.
- Visible `Cline` exit/help wording in the TUI was changed to `NBG`, and help examples now use `nbg ...`.
- Provider errors from compatible relay endpoints are mapped to Chinese actionable messages for invalid key, forbidden, missing model, quota/rate limit, timeout, malformed JSON, malformed stream/tool-call shape, and generic HTTP failures.
- AI SDK `openai-compatible` provider options now use the non-deprecated `openaiCompatible` bucket.
- Added a real OpenAI-compatible relay runtime fixture that validates streaming, reasoning deltas, usage, API key headers, custom headers, and localized 401 failures in a mock-isolated child process.

Verified so far:

- `bun test sdk/packages/llms/src/providers/aaa-openai-compatible-relay.test.ts sdk/packages/llms/src/providers/routing/provider-options.test.ts sdk/packages/llms/src/providers/gateway.test.ts`
- `bun test sdk/apps/cli/src/cli.e2e.test.ts sdk/apps/cli/src/commands/history.test.ts sdk/apps/cli/src/runtime/interactive/config-data.test.ts sdk/apps/cli/src/utils/third-party-api.test.ts`
- `bun test sdk/apps/cli/src/tui/commands/slash-command-registry.test.ts sdk/apps/cli/src/tui/hooks/use-local-command-actions.test.ts`

Known verification gap:

- `sdk/apps/cli/src/main.test.ts` still cannot run under the current `bun test` shim because that file depends on `vi.hoisted`.
- Full workspace typecheck still has unrelated pre-existing issues outside the relay path.

Next implementation targets:

1. Add profile naming/import-export for multiple relay gateways.
2. Add explicit connection test output showing resolved model count, endpoint tried, and masked API key.
3. Add live-compatible mock gateway scenarios for Sub2API/One API/New API style responses.
4. Continue removing or hiding old official-provider surfaces from the normal `nbg` CLI path.
5. Rebuild and reinstall the single `nbg` binary after each verified CLI milestone.
