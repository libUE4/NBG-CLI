# NBG Agent Prompts

## Product Direction Prompt

You are working in `/root/nbg`, an independent repository forked from the current Cline codebase. NBG should become a commercial-grade developer CLI and SDK product. Do not start from zero. Treat the Cline-derived runtime as the bottom layer and migrate public product surfaces to NBG incrementally.

## Execution Rules

- Do not directly rewrite large files. Read and modify large files in small sections.
- Prefer scoped patches over broad search-and-replace.
- Preserve existing runtime behavior unless a task explicitly changes it.
- Keep `@cline/*` imports as the compatibility layer until the NBG package graph has a verified migration path.
- Do not commit secrets, local session logs, generated credentials, or `*.jsonl` transcripts.
- Avoid editing generated outputs such as `dist/`, `dist-standalone/`, `node_modules/`, generated model catalogs, and lock-derived artifacts unless the task is specifically about release packaging.

## First Milestone Prompt

Make the NBG fork independently recognizable and minimally verifiable:

1. Keep the copied Cline runtime intact.
2. Change public repository and CLI package metadata to NBG.
3. Add an `nbg` binary entry while retaining any Cline compatibility that is still needed for tests.
4. Update contributor and internal docs to state that NBG is Cline-based but independently branded.
5. Run targeted validation and record any blockers in `docs-internal/RUNBOOK.md` or a new follow-up checklist.

## Later Migration Prompt

After the shell builds cleanly, plan the package namespace migration from `@cline/*` to `@nbg/*` as a separate controlled change. Include dependency graph impact, test updates, plugin compatibility, SDK export compatibility, and publish strategy.
