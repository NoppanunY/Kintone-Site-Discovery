# UX/UI Implementation Handoff

This folder is the Codex-ready UX/UI handoff package for **Kintone Site Discovery MVP 1**.

## Current product model

The core product is:

```text
Pull from kintone → write one complete local snapshot
```

The **Local Snapshot** is the canonical output. Reports and Developer Files are generated views of the current snapshot. They are not separate core workflows and they must not imply import/deploy/write-back.

## Read order for Codex

1. `UI_IMPLEMENTATION_SPEC.md`
2. `DATA_CONTRACT.md`
3. `SNAPSHOT_STORAGE_SPEC.md`
4. `VIEW_MODEL_SPEC.md`
5. `SCREEN_SPEC.md`
6. `COMPONENT_SPEC.md`
7. `DESIGN_TOKENS.md`
8. `ROUTING_SPEC.md`
9. `STATE_MATRIX.md`
10. `UX_COPY_SPEC.md`
11. `IMPLEMENTATION_TASKS.md`

## Non-negotiable rules

- Read-only MVP: no deploy, import, write-back, Git client, AI, rollback, or safe deploy.
- Secrets never render and never write to project files. Use OS keychain only.
- Additional/sensitive capture is off by default and requires confirmation.
- Full Discovery must route through sensitive options; it must not one-click-enable sensitive capture.
- Each successful scan creates a new timestamped snapshot and marks it current. Older snapshots remain in History.
- Failed scans may write a partial snapshot/summary for inspection but never become current.
- `OUTPUT_WRITE_FAILED` must not claim partial data was saved.
- File order metadata lives in `manifest.json` as `fileOrder[]`; UI renders it and never re-sorts alphabetically.

## Implementation status

This handoff is ready for Codex to start UI implementation in this order:

1. Design tokens
2. Component library
3. App shell and routing
4. Onboarding and project home
5. Site overview, apps, and scan setup
6. Scan running/result states
7. Local Snapshot, Reports, Developer Files, History
8. Settings and Advanced Internal Data gate

Start with mock data/view models. Wire real collectors and storage after the UI skeleton is stable.
