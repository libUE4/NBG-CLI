# Branding Surfaces

Baseline commit: `8a6441fddd3b4d372d086886ebe4ee11e78dc993`

## High-Impact Files

```text
package.json
README.md
README.marketplace.md
CHANGELOG.md
assets/
walkthrough/
webview-ui/src/assets/
webview-ui/src/components/welcome/
webview-ui/src/components/onboarding/
webview-ui/src/components/settings/
webview-ui/src/components/account/
src/shared/providers/providers.json
src/shared/constants.ts
```

## Current Package Identity

From `package.json`:

```text
name: claude-dev
displayName: Cline
description: Autonomous coding agent right in your IDE...
publisher: saoudrizwan
author: Cline Bot Inc.
homepage: https://cline.bot
repository: https://github.com/cline/cline
license: Apache-2.0
```

## VS Code Contribution Identity

Current contribution ids:

```text
viewsContainers.activitybar.id: claude-dev-ActivityBar
viewsContainers.activitybar.title: Cline
viewsContainers.activitybar.icon: assets/icons/icon.svg
views.id: claude-dev.SidebarProvider
commands: cline.*
```

Recommendation:

- Keep command ids unchanged in the first technical MVP if speed matters.
- Change visible labels first.
- Rename command ids later in a separate compatibility pass.

## Visible Provider Branding

Provider labels are in:

```text
src/shared/providers/providers.json
```

Current relay-relevant entries:

```text
openai -> OpenAI Compatible
litellm -> LiteLLM
openrouter -> OpenRouter
```

MVP branding change:

```text
openai -> Relay API
```

This avoids storage/proto churn while making the UX match the product direction.

## License Handling

The upstream license is Apache-2.0. Keep:

- `LICENSE`
- attribution notices required by Apache-2.0
- third-party dependency notices if present

Do not remove upstream copyright/attribution statements where legally required.

