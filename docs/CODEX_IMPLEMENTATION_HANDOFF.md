# Codex Implementation Handoff

This document points Codex to the current implementation specs for Kintone Site Discovery MVP 1.

## Current status

The product is ready for UI skeleton implementation using the specs in `docs/ui-handoff/`.

Implement incrementally. Do not attempt the full app in one pass. Start with tokens, components, shell, routes, and mock view models before wiring real kintone collection logic.

A CLI command contract now exists in `docs/CLI_COMMAND_SPEC.md`. It defines the future headless interface for automation/AI/testing, but it does **not** change the first implementation batch. Build the UI skeleton first; add CLI behavior only after the shared `packages/core` API is defined.

## Source-of-truth order

1. `docs/ui-handoff/UI_IMPLEMENTATION_SPEC.md` — UX/UI product model and layout rules
2. `docs/ui-handoff/DATA_CONTRACT.md` — canonical TypeScript-style data shapes
3. `docs/ui-handoff/SNAPSHOT_STORAGE_SPEC.md` — local snapshot storage contract
4. `docs/ui-handoff/VIEW_MODEL_SPEC.md` — screen view models
5. `docs/ui-handoff/SCREEN_SPEC.md` — screen behavior and states
6. `docs/ui-handoff/COMPONENT_SPEC.md` — reusable component contract
7. `docs/ui-handoff/DESIGN_TOKENS.md` — design token implementation
8. `docs/ui-handoff/ROUTING_SPEC.md` — route map and guards
9. `docs/ui-handoff/STATE_MATRIX.md` — state transitions
10. `docs/ui-handoff/UX_COPY_SPEC.md` — fixed UI copy and forbidden verbs
11. `docs/ui-handoff/IMPLEMENTATION_TASKS.md` — Codex-ready task order
12. `docs/CLI_COMMAND_SPEC.md` — future CLI command names, flags, JSON output, exit codes, and automation behavior

If older specs conflict with the UX/UI handoff, use the handoff for desktop UI, state naming, local snapshot UX, and storage behavior. The older specs remain useful for collector scope and product non-goals. For CLI behavior, use `docs/CLI_COMMAND_SPEC.md`.

## Core product model

```text
Pull from kintone → write one complete local snapshot
```

Local Snapshot is the canonical output. Reports and Developer Files are generated from a snapshot.

Desktop UI and CLI must eventually wrap the same `packages/core` API surface. Do not duplicate scan/storage/report/package logic between UI and CLI.

## Current workspace decision

For the desktop MVP mock, keep `Connected Site` and `Project` as separate objects:

- `Connected Site` is a reusable kintone target: display name, domain, and saved-site status. It does not own an auth profile.
- `Auth Profile` is a reusable global credential identity.
- `Project` is a local folder/workspace that selects exactly one Connected Site and one Auth Profile.
- Multiple Projects may reference the same Connected Site/domain when the user wants separate folders, snapshots, or review purposes.

Older specs still use the term Site Workspace. For current desktop UI work, interpret the active screen context as a Project plus its linked Connected Site. User-facing UI should show Projects, Sites, and Auth profiles as separate lists until the core workspace/storage model is wired.

## MVP boundaries

Do not implement:

- deploy/import/write-back to kintone
- Git client features
- built-in AI/chat/analysis
- rollback/safe deploy
- background multi-scan queue
- in-app rendered markdown report viewer
- CLI commands named deploy/import/push/sync/publish/apply/restore/rollback/ai/chat

## First implementation batch

Codex should start with:

1. `T0 · Design tokens`
2. `T1 · Component library`
3. `T2 · App shell`
4. `T3 · Routing`
5. `T4 · Onboarding UI with mock data`

Stop after those are complete and review before implementing collector/storage logic.

## CLI note for the first batch

For T0–T4, do **not** implement CLI behavior yet.

It is acceptable to create an empty CLI scaffold if useful for workspace setup:

```text
apps/cli/
  src/main.ts
  src/commands/index.ts
```

But command logic must remain unwired until the shared core interfaces exist. Any future CLI implementation must follow `docs/CLI_COMMAND_SPEC.md`, including `--json`, stable exit codes, no `--password`, no secret output, and `--confirm-sensitive` for sensitive non-interactive scans.
