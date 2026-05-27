# NBG Commercialization Plan

## Direction

NBG is an independent commercial developer CLI and SDK product built on the current Cline codebase as the runtime foundation. This repository is not a from-scratch rewrite. The first milestone is to make the fork independently buildable, branded, testable, and releasable while preserving the existing Cline runtime behavior underneath.

## Version Strategy

- Keep the current Cline-derived runtime and package graph as the compatibility layer.
- Introduce NBG as the public product shell first: repository metadata, CLI package, binary name, docs, release checks, and support runbooks.
- Move deeper package names from `@cline/*` to `@nbg/*` only after the NBG shell builds and tests cleanly.
- Maintain a beta/vNext track for platform API changes instead of breaking existing SDK behavior in one pass.

## Implementation Phases

1. Repository extraction: copy the current Cline worktree into `/root/nbg`, exclude generated outputs, dependency folders, caches, and logs, then initialize a new git repository.
2. Planning anchors: add this plan and agent execution prompts under `docs-internal/` so later agents continue from the same product direction.
3. Product shell: rename public metadata to NBG, add the `nbg` CLI binary, and update top-level contributor guidance.
4. Runtime hardening: standardize CLI startup, exit codes, structured errors, telemetry redaction, tool policies, and doctor output around the NBG product surface.
5. Release quality: require typecheck, unit tests, build, package smoke tests, bundle/package integrity checks, and privacy checks before release.

## Current Scope

The current execution scope is phase 1 through the first part of phase 3. Do not attempt a full repository-wide `cline` to `nbg` text replacement. Many identifiers are provider IDs, protocol names, test fixtures, or compatibility paths and must be migrated deliberately.

## Quality Gates

- `cd sdk/apps/cli && bun run typecheck`
- `cd sdk && bun run test:unit`
- `cd sdk/apps/cli && bun script/build.ts --single`
- Follow-up: package install smoke and `nbg --version` / `nbg --help` smoke once the binary build is available.
