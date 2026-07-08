# Codex Implementation Handoff

This document points Codex to the current implementation specs for Kintone Site Discovery MVP 1.

## Current status

The hi-fi UI skeleton, Windows desktop shell scaffold, typed platform bridge foundation, `packages/core`, and the first local workspace metadata storage pass are now present on `develop`.

The next implementation phase is **N5 hardening**, documented in `docs/CODEX_N5_HARDENING_PLAN.md`. Do this before N6 secure credential storage or N7 read-only kintone access.

The first N4/N5 pass added core types/helpers, local metadata storage, bridge APIs, persisted Home/New Project/Open Project wiring, app selection guards, and tests. The foundation still needs hardening around persisted metadata validation, onboarding using persisted sites/auth profiles, app-list hydration, project-local auth editing, folder-open path boundaries, collision-safe local IDs, and shared no-secret serialization.

A CLI command contract exists in `docs/CLI_COMMAND_SPEC.md`. It defines the future headless interface for automation/AI/testing, but it does **not** change the current implementation batch. Do not implement CLI behavior in N5 hardening.

## Source-of-truth order

1. `docs/CODEX_N5_HARDENING_PLAN.md` — active checklist for the next Codex pass
2. `docs/CODEX_N4_N5_IMPLEMENTATION_PLAN.md` — original N4/N5 foundation plan and acceptance context
3. `docs/CODEX_NEXT_WINDOWS_DESKTOP_PLAN.md` — phase boundaries and N4-N10 roadmap
4. `docs/ui-handoff/UI_IMPLEMENTATION_SPEC.md` — UX/UI product model and layout rules
5. `docs/ui-handoff/DATA_CONTRACT.md` — canonical TypeScript-style data shapes
6. `docs/ui-handoff/SNAPSHOT_STORAGE_SPEC.md` — local snapshot storage contract
7. `docs/ui-handoff/VIEW_MODEL_SPEC.md` — screen view models
8. `docs/ui-handoff/SCREEN_SPEC.md` — screen behavior and states
9. `docs/ui-handoff/COMPONENT_SPEC.md` — reusable component contract
10. `docs/ui-handoff/DESIGN_TOKENS.md` — design token implementation
11. `docs/ui-handoff/ROUTING_SPEC.md` — route map and guards
12. `docs/ui-handoff/STATE_MATRIX.md` — state transitions
13. `docs/ui-handoff/UX_COPY_SPEC.md` — fixed UI copy and forbidden verbs
14. `docs/ui-handoff/IMPLEMENTATION_TASKS.md` — Codex-ready task order
15. `docs/CLI_COMMAND_SPEC.md` — future CLI command names, flags, JSON output, exit codes, and automation behavior

If older specs conflict with the UX/UI handoff, use the handoff for desktop UI, state naming, local snapshot UX, and storage behavior. The older specs remain useful for collector scope and product non-goals. For CLI behavior, use `docs/CLI_COMMAND_SPEC.md`, but do not implement CLI behavior in N5 hardening.

## Core product model

```text
Pull from kintone -> write one complete local snapshot
```

Local Snapshot is the canonical output. Reports and Developer Files are generated from a snapshot.

Desktop UI and CLI must eventually wrap the same `packages/core` API surface. Do not duplicate scan/storage/report/package logic between UI and CLI.

## Current workspace decision

For the desktop MVP, keep `Connected Site` and `Project` as separate objects:

- `Connected Site` is a reusable kintone target: display name, domain, and saved-site status. It does not own an auth profile.
- `Auth Profile` is a reusable global credential identity.
- `Project` is a local folder/workspace that selects exactly one Connected Site and an `authSelection` (global Auth Profile or project-local auth metadata).
- Multiple Projects may reference the same Connected Site/domain when the user wants separate folders, snapshots, or review purposes.
- `Use new auth for this project` in the New Project wizard is project-only preview data. It must not be appended to the global Auth Profiles list. The standalone Add Auth Profile flow is the reusable global-profile path.

Older specs still use the term Site Workspace. For current desktop UI and storage work, interpret the active screen context as a Project plus its linked Connected Site. User-facing UI should show Projects, Sites, and Auth profiles as separate lists. Storage is one site per project folder, with Connected Sites stored as reusable app-level records.

## MVP boundaries

Do not implement:

- deploy/import/write-back to kintone
- Git client features
- built-in AI/chat/analysis
- rollback/safe deploy
- background multi-scan queue
- in-app rendered markdown report viewer
- CLI commands named deploy/import/push/sync/publish/apply/restore/rollback/ai/chat

## Completed batches

- T0 Design tokens
- T1 Component library
- T2 App shell
- T3 Routing
- T4 Onboarding UI with mock data
- N0 Baseline verification
- N1 Windows desktop runtime ADR
- N2 Desktop shell scaffold
- N3 Typed platform bridge stubs
- Initial N4 Core domain package
- Initial N5 Local workspace metadata storage primitives

## Active next batch

Implement only:

- N5 hardening from `docs/CODEX_N5_HARDENING_PLAN.md`

Specifically harden:

- persisted Sites/Auth Profiles in onboarding
- metadata schema validation on read/write
- core validator use in UI submit paths
- project-local auth preservation when editing project metadata
- app-list and selected app state hydration
- `openLocalFolder` allow-list path boundary
- shared core no-secret serialization in desktop storage
- collision-safe local ID creation
- mock/browser fallback boundaries
- tests for the above

Stop after N5 hardening is complete and reviewed before implementing OS secure storage, real kintone reads, scan runner, local snapshot writes, reports/developer-file generation, CLI behavior, or Windows packaging.

## CLI note for the next batch

For N5 hardening, do **not** implement CLI behavior.

It is acceptable to keep an empty CLI scaffold if one already exists, but command logic must remain unwired until the shared core interfaces and local storage foundation are reviewed. Any future CLI implementation must follow `docs/CLI_COMMAND_SPEC.md`, including `--json`, stable exit codes, no `--password`, no secret output, and `--confirm-sensitive` for sensitive non-interactive scans.
