# N9 Real REST Snapshot Plan

Status: implemented in the current working tree.

## Goal

Replace the N8 fixture scan path used by the desktop scan button with a real, read-only kintone REST capture path that writes local snapshots.

N9 is intentionally limited to REST metadata and local snapshot persistence. Browser runtime plugin saved config, browser network plugin assets, generated Reports, Developer Files, CLI behavior, and packaging remain later phases.

## Scope

- Resolve the project auth profile or project-local credential through the desktop credential store.
- Use the existing read-only kintone client and password auth header path.
- Capture selected-app REST metadata for enabled categories.
- Redact captured JSON before writing local files.
- Write append-only `snapshots/snap_...` folders.
- Write `manifest.json`, `data/collector-results.json`, per-app data files, and `logs/redaction-log.jsonl`.
- Update `current.json` only for completed or completed-with-warnings runs.
- Append every written run to `history.json`.
- Keep failed required captures as partial snapshot data, but never mark them current.

## REST Capture In This Phase

Required category endpoints currently captured per selected app:

- App settings: live and preview
- Form fields: live and preview
- Form layout: live and preview
- Views, process, permissions, actions, and notifications: live and preview
- Plugin inventory: live and preview
- Customization metadata and admin notes: live and preview

Additional supported endpoint:

- Sample records, only when the user explicitly enables `sample_records`

Known skipped categories in this REST-only phase:

- Users/groups/departments
- Space members
- App customization file body downloads
- Plugin saved config
- Dependency detection and preview-vs-live diff generation
- Plugin assets
- Record comments and attachment metadata
- Full records

## Safety Boundaries

- No kintone write-back APIs were added.
- No deploy/import/publish/push/sync/apply/restore/rollback verbs were added.
- Captured payloads go through core redaction before snapshot writes.
- Credential values remain in the desktop credential store and are not returned to the renderer.
- Browser fallback returns unavailable for real scan runs.

## Verification

- `pnpm typecheck`
- `pnpm test`
- `pnpm desktop:compile`

Additional verification before closing/commit should include:

- `git diff --check`
- `pnpm desktop:build`
