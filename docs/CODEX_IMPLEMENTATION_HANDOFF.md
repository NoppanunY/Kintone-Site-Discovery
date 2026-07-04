# Codex Implementation Handoff

This document points Codex to the current implementation specs for Kintone Site Discovery MVP 1.

## Current status

The product is ready for UI skeleton implementation using the specs in `docs/ui-handoff/`.

Implement incrementally. Do not attempt the full app in one pass. Start with tokens, components, shell, routes, and mock view models before wiring real kintone collection logic.

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

If older specs conflict with the UX/UI handoff, use the handoff for desktop UI, state naming, local snapshot UX, and storage behavior. The older specs remain useful for collector scope and product non-goals.

## Core product model

```text
Pull from kintone → write one complete local snapshot
```

Local Snapshot is the canonical output. Reports and Developer Files are generated from a snapshot.

## MVP boundaries

Do not implement:

- deploy/import/write-back to kintone
- Git client features
- built-in AI/chat/analysis
- rollback/safe deploy
- background multi-scan queue
- in-app rendered markdown report viewer

## First implementation batch

Codex should start with:

1. `T0 · Design tokens`
2. `T1 · Component library`
3. `T2 · App shell`
4. `T3 · Routing`
5. `T4 · Onboarding UI with mock data`

Stop after those are complete and review before implementing collector/storage logic.
