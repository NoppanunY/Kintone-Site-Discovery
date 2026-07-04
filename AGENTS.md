# AGENTS.md

This file gives implementation instructions for Codex and other coding agents working in this repository.

## Project identity

Project name: **Kintone Site Discovery**

Primary goal for MVP 1: build a read-only kintone data extraction and local snapshot tool.

The product should help users connect to kintone sites, select apps, pull app/plugin/site metadata, normalize and redact it, and write local snapshots. Reports and Developer Files are generated from snapshots for inspection or handoff.

The app itself must not include AI features.

## Source of truth

Use these documents as the source of truth before writing code:

1. `docs/MVP1_SPEC.md`
2. `docs/ui-handoff/UI_IMPLEMENTATION_SPEC.md`
3. `docs/ui-handoff/DATA_CONTRACT.md`
4. `docs/ui-handoff/SNAPSHOT_STORAGE_SPEC.md`
5. `docs/ui-handoff/VIEW_MODEL_SPEC.md`
6. `docs/ui-handoff/SCREEN_SPEC.md`
7. `docs/ui-handoff/COMPONENT_SPEC.md`
8. `docs/ui-handoff/DESIGN_TOKENS.md`
9. `docs/ui-handoff/ROUTING_SPEC.md`
10. `docs/ui-handoff/STATE_MATRIX.md`
11. `docs/ui-handoff/UX_COPY_SPEC.md`
12. `docs/ui-handoff/IMPLEMENTATION_TASKS.md`
13. `docs/DATA_MODEL.md`
14. `docs/WORKSPACE_PROFILE_SPEC.md`
15. `docs/FILE_ORDER_SPEC.md`
16. `docs/IMPLEMENTATION_PLAN.md`

If implementation details conflict, prefer `docs/MVP1_SPEC.md` for product scope/non-goals. For desktop UI, state naming, local snapshot UX, storage behavior, view models, component props, routes, copy, and Codex task order, prefer `docs/ui-handoff/`.

## Codex implementation start point

Start from `docs/CODEX_IMPLEMENTATION_HANDOFF.md` and implement in small batches:

1. design tokens
2. component library
3. app shell
4. routing
5. onboarding UI with mock data

Do not wire full collector/storage logic until the UI skeleton and state model are reviewed.

## MVP 1 hard boundaries

Do **not** implement kintone deploy features in MVP 1.

Do **not** implement built-in AI features in MVP 1.

Do **not** add APIs or UI that update kintone app settings, records, plugins, users, groups, spaces, or files.

Allowed external effects for MVP 1:

- Authenticate to kintone.
- Read kintone REST API data.
- Open kintone pages in a browser context for read-only browser runtime capture.
- Capture network responses for plugin assets when the user explicitly opts in.
- Write local project output files.
- Store credentials in OS keychain only.

Disallowed external effects for MVP 1:

- Deploy app settings.
- Update preview settings.
- Add/update/delete records.
- Upload files to kintone.
- Install/update/delete plugins.
- Modify users, groups, departments, spaces, or app settings.
- Add chat, assistant, recommendation, or analysis features inside the app.
- Commit secrets or raw credentials to the repository.

## Recommended technical direction

Prefer TypeScript for all first implementation work.

Recommended architecture:

- `packages/core`: collector, normalizer, redactor, snapshot builder, report/developer-file builders, shared domain models.
- `apps/desktop`: desktop UI, likely Electron or Tauri. Electron is acceptable for easier Playwright/Node integration.
- `apps/cli`: optional CLI wrapper around the same core package.
- `packages/test-fixtures`: mocked kintone API responses and browser-capture fixtures.

The exact scaffolding may be changed if implementation requires it, but keep collector/snapshot logic separate from UI.

## Workspace/profile requirements

MVP 1 desktop must support a multi-site workspace model.

Implement these concepts from `docs/WORKSPACE_PROFILE_SPEC.md` and `docs/ui-handoff/`:

- Auth Profile / Account: reusable authentication identity.
- Site Workspace: domain + auth profile + local folder + per-site settings.
- Site Tab: open UI tab for a site workspace.
- Local Snapshot: canonical local output of a scan.
- Reports and Developer Files: generated views from a snapshot.
- Local Folder: folder where site workspace data and snapshots are stored.

Users must be able to:

- Create and manage auth profiles/accounts.
- Link a site workspace to an auth profile.
- Configure each site separately.
- Open each site in a separate tab.
- Create a new site tab.
- Open a site's local folder from the UI.
- Persist open tabs across app restart.

Do not mix secrets into profile/site project files. Store only secure credential references.

## Local snapshot requirements

Implementation must follow `docs/ui-handoff/SNAPSHOT_STORAGE_SPEC.md`.

Important rules:

- Each successful scan creates a new timestamped snapshot folder.
- The latest successful snapshot becomes current by updating a pointer file.
- Older snapshots remain available in History until explicitly deleted.
- Failed scans may write partial summary/snapshot data for inspection but never become current.
- `OUTPUT_WRITE_FAILED` must not claim partial data was saved.
- Reports and Developer Files are generated from the snapshot they belong to.
- A review package is a read-only zip for handoff, not import/deploy.

## File order requirements

When pulling app customization files or plugin assets, preserve JavaScript/CSS file order exactly.

Implementation must follow `docs/FILE_ORDER_SPEC.md` and `docs/ui-handoff/SNAPSHOT_STORAGE_SPEC.md`.

Important rules:

- Do not alphabetically sort runtime-sensitive JS/CSS arrays.
- Store `orderIndex`, `orderSource`, and `confidence` for ordered files in the snapshot manifest.
- Keep app customization desktop/mobile JS/CSS arrays in kintone order.
- Keep plugin asset JS/CSS/HTML arrays in manifest, DOM, or observed load order where available.
- Prefix stored ordered files with zero-padded order numbers such as `001-common.js`.
- Reports and Developer Files must display ordered files in execution/load order.
- Tests must prove file order survives capture, normalization, storage, report generation, and Developer Files generation.

## Security requirements

Never store the following in repository files, scan output, logs, snapshots, normalized JSON, markdown reports, Developer Files, or review packages:

- kintone admin password
- API token
- OAuth access token or refresh token
- session cookies
- client secret
- bearer token
- authorization header
- plugin proxy secret
- discovered hardcoded secrets in JavaScript or plugin config

Use OS keychain or a secure credential provider abstraction. If a local development stub is needed, it must be opt-in and ignored by Git.

Redact sensitive values before writing any output.

Redaction must run on:

- REST API payloads before normalized output.
- Browser runtime plugin config.
- Captured plugin JavaScript/CSS/HTML asset bodies.
- Generated markdown reports and Developer Files.
- Error logs.

## UX requirements

The scan setup UI must show capture categories in three groups:

1. Required data: checked and disabled; always captured.
2. Recommended data: checked by default, but user may uncheck.
3. Additional data: unchecked by default; user must opt in.

Plugin asset capture must be additional/opt-in, not default checked.

Sample records and full records must also be additional/opt-in.

Full Discovery must route through sensitive options and confirmation. It must not one-click-enable sensitive capture.

Status labels, button labels, and forbidden verbs must follow `docs/ui-handoff/UX_COPY_SPEC.md`.

The desktop app shell must support a SourceTree-like multi-tab experience for sites, while avoiding Git-client and AI features in MVP 1.

## Browser collector requirements

Browser runtime collection is required for plugin saved config because plugin config is obtained by calling `kintone.plugin.app.getConfig(pluginId)` inside a kintone page runtime.

Browser network asset collection is best-effort. Do not assume every plugin has source files named `config.js` or `desktop.js`; real loaded assets may be bundled, minified, renamed, remote, or lazy-loaded.

Store the raw capture result with enough evidence to explain limitations:

- page URL opened
- plugin ID
- matched asset URLs
- content hash
- capture status
- error, if any
