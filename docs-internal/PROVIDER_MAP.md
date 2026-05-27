# Provider Map

This is the first-pass map of provider-related code for the relay-first plugin conversion.

Baseline commit: `8a6441fddd3b4d372d086886ebe4ee11e78dc993`

## Main Provider Files

```text
src/shared/api.ts
  Defines ApiProvider, model info types, defaults, and built-in model catalogs.

src/core/api/index.ts
  Factory that converts ApiConfiguration into a concrete ApiHandler.

src/core/api/providers/
  Provider implementations. The relay MVP should start from openai.ts and litellm.ts.

src/shared/storage/state-keys.ts
  Single source of truth for settings keys and secret keys.

src/shared/storage/provider-keys.ts
  Maps providers to model ID keys, API key secret keys, and default models.

src/shared/providers/providers.json
  Provider picker list shown in the webview UI.

webview-ui/src/components/settings/ApiOptions.tsx
  Provider dropdown and provider-specific settings component routing.

webview-ui/src/components/settings/providers/OpenAICompatible.tsx
  UI for the existing OpenAI-compatible provider.

webview-ui/src/components/settings/providers/LiteLlmProvider.tsx
  UI for LiteLLM proxy provider.

webview-ui/src/components/settings/utils/providerUtils.ts
  Normalizes provider-specific model fields into selected provider/model info.
```

## Existing Provider Capabilities Relevant To Relay APIs

### OpenAI Compatible

Provider id:

```text
openai
```

Current UI label:

```text
OpenAI Compatible
```

Backend handler:

```text
src/core/api/providers/openai.ts
```

Current fields:

```text
openAiApiKey
openAiBaseUrl
openAiHeaders
azureApiVersion
azureIdentity
planModeOpenAiModelId
actModeOpenAiModelId
planModeOpenAiModelInfo
actModeOpenAiModelInfo
```

Important behavior:

- Uses the official `openai` SDK.
- Calls `client.chat.completions.create(...)`.
- Supports custom `baseURL`.
- Supports custom headers.
- Streams chat completion chunks.
- Processes `delta.content`.
- Processes `delta.reasoning_content` when present.
- Processes OpenAI-style `delta.tool_calls`.
- Emits usage chunks when `chunk.usage` is present.
- Supports model configuration options like max tokens, context window, prices, temperature, and R1 formatting.

This is the best MVP foundation for Sub2API/New API/One API style `/v1/chat/completions` gateways.

### LiteLLM

Provider id:

```text
litellm
```

Backend handler:

```text
src/core/api/providers/litellm.ts
```

Current fields:

```text
liteLlmApiKey
liteLlmBaseUrl
liteLlmUsePromptCache
planModeLiteLlmModelId
actModeLiteLlmModelId
planModeLiteLlmModelInfo
actModeLiteLlmModelInfo
```

Important behavior:

- Uses the official `openai` SDK through `createOpenAIClient`.
- Uses `/v1/model/info` for LiteLLM model metadata.
- Tries both `x-litellm-api-key` and `Authorization: Bearer ...` for model info.
- Sends `drop_params: true`, useful for mixed upstream compatibility.
- Sends `litellm_session_id: cline-${ulid}` when a task id is available.
- Handles `reasoning_content`.
- Handles usage and LiteLLM cache token fields.

This is useful as a reference for relay-specific session IDs, model metadata, and param dropping, but it is too LiteLLM-branded for the main Sub2API/general relay UX.

## Recommended MVP Strategy

Do not create a brand-new protocol stack first. Start with the existing `openai` provider because it already supports:

- Base URL.
- API key.
- Custom headers.
- Manual model ID.
- Streaming.
- OpenAI-style tool calls.
- Reasoning delta passthrough.

MVP implementation path:

1. Reposition the existing `openai` provider in the UI as `Relay API` or `OpenAI-Compatible Relay`.
2. Keep provider id as `openai` for the first version to avoid proto, migration, and storage churn.
3. Set `DEFAULT_API_PROVIDER` to `openai` after the UX is ready.
4. Change provider picker ordering so relay comes first.
5. Update copy and placeholders for Sub2API/New API/One API/OpenRouter-compatible gateways.
6. Add relay-specific advanced fields on top of `openAiHeaders`.
7. Add connection test and model list UX.
8. Add stricter error mapping around handler calls.

Current implementation status:

- Steps 1, 2, 3, 4, and basic copy changes are done in Relay MVP Pass 1.
- Connection testing, model-list UX improvements, and relay-specific error mapping are still pending.

This gives a working relay-first plugin with the least risk.

## Later Strategy

After MVP is stable, introduce a true provider id:

```text
relay
```

That requires touching:

```text
src/shared/api.ts
src/shared/storage/state-keys.ts
src/shared/storage/provider-keys.ts
src/shared/providers/providers.json
src/core/api/index.ts
src/core/api/providers/relay.ts
webview-ui/src/components/settings/ApiOptions.tsx
webview-ui/src/components/settings/providers/RelayProvider.tsx
webview-ui/src/components/settings/utils/providerUtils.ts
src/shared/proto-conversions/models/api-configuration-conversion.ts
proto/cline/state.proto or generated proto outputs if required
tests for state keys and conversion behavior
```

This is more invasive because Cline stores API configuration through generated/shared state definitions and protobuf conversions.

## Current Provider Picker

Provider options are in `src/shared/providers/providers.json`. Current first entries:

```text
Cline
ChatGPT Subscription
Google Gemini
OpenAI Compatible
Anthropic
Amazon Bedrock
GitHub Copilot
DeepSeek
OpenAI
OpenRouter
Ollama
GCP Vertex AI
LiteLLM
Claude Code
```

Relay-first fork should reorder and probably hide many providers in early builds:

```text
Relay API
LiteLLM
OpenRouter
OpenAI
Anthropic
Google Gemini
Ollama
```

Exact hiding can be done later through remote config or by editing `providers.json`.

## Relay MVP Field Mapping

Use existing fields initially:

```text
Relay Base URL        -> openAiBaseUrl
Relay API Key         -> openAiApiKey
Relay Model ID        -> planModeOpenAiModelId / actModeOpenAiModelId
Relay Custom Headers  -> openAiHeaders
```

Potential advanced relay fields:

```text
session_id            -> openAiHeaders.session_id
X-Session-ID          -> openAiHeaders.X-Session-ID
X-Provider            -> openAiHeaders.X-Provider
X-Model-Route         -> openAiHeaders.X-Model-Route
```

Do not hardcode these headers globally. Make them opt-in per user/profile.

## Risk Notes

- Some gateways are only partially OpenAI-compatible; streaming and tool-call chunks are the main risk.
- Cline relies on tool calls for strong agent behavior. A relay model without tool-call support may degrade sharply.
- The existing OpenAI-compatible UI includes Azure fields that should be hidden or moved to advanced settings for relay-first UX.
- Adding a new provider id before understanding generated proto/state flows can create breakage across webview, controller, tests, and migrations.
- A relay-first fork should not include upstream-account extraction or subscription-to-API bypass logic.
