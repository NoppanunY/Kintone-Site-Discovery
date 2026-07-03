# AGENTS.md

This file gives implementation instructions for Codex and other coding agents working in this repository.

## Project identity

Project name: **Kintone Site Discovery**

Primary goal for MVP 1: build a read-only kintone data extraction and local export tool.

The product should help users connect to kintone sites, select apps, pull app/plugin/site metadata, normalize and redact it, and write local snapshots, reports, and structured export files.

The app itself must not include AI features.

## Source of truth

Use these documents as the source of truth before writing code:

1. `docs/MVP1_SPEC.md`
2. `docs/DATA_MODEL.md`
3. `docs/WORKSPACE_PROFILE_SPEC.md`
4. `docs/FILE_ORDER_SPEC.md`
5. `docs/IMPLEMENTATION_PLAN.md`

If implementation details conflict, prefer `docs/MVP1_SPEC.md`, then `docs/DATA_MODEL.md`, then `docs/WORKSPACE_PROFILE_SPEC.md`, then `docs/FILE_ORDER_SPEC.md`, then `docs/IMPLEMENTATION_PLAN.md`.

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

- `packages/core`: collector, normalizer, redactor, export builder, shared domain models.
- `apps/desktop`: desktop UI, likely Electron or Tauri. Electron is acceptable for easier Playwright/Node integration.
- `apps/cli`: optional CLI wrapper around the same core package.
- `packages/test-fixtures`: mocked kintone API responses and browser-capture fixtures.

The exact scaffolding may be changed if implementation requires it, but keep collector/export logic separate from UI.

## Workspace/profile requirements

MVP 1 desktop must support a multi-site workspace model.

Implement these concepts from `docs/WORKSPACE_PROFILE_SPEC.md`:

- Auth Profile / Account: reusable authentication identity.
- Site Workspace: domain + auth profile + local folder + per-site settings.
- Site Tab: open UI tab for a site workspace.
- Local Folder: folder where exported data is stored.

Users must be able to:

- Create and manage auth profiles/accounts.
- Link a site workspace to an auth profile.
- Configure each site separately.
- Open each site in a separate tab.
- Create a new site tab.
- Open a site's local folder from the UI.
- Persist open tabs across app restart.

Do not mix secrets into profile/site project files. Store only secure credential references.

## File order requirements

When pulling app customization files or plugin assets, preserve JavaScript/CSS file order exactly.

Implementation must follow `docs/FILE_ORDER_SPEC.md`.

Important rules:

- Do not alphabetically sort runtime-sensitive JS/CSS arrays.
- Store `orderIndex`, `orderSource`, and `orderConfidence` for ordered files.
- Keep app customization desktop/mobile JS/CSS arrays in kintone order.
- Keep plugin asset JS/CSS/HTML arrays in manifest, DOM, or observed load order where available.
- Prefix stored ordered files with zero-padded order numbers such as `001-common.js`.
- Reports and structured exports must display ordered files in execution/load order.
- Tests must prove file order survives capture, normalization, storage, report generation, and structured export generation.

## Security requirements

Never store the following in repository files, scan output, logs, snapshots, normalized JSON, markdown reports, or structured export files:

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
- Generated markdown reports and structured export files.
- Error logs.

## UX requirements

The scan setup UI must show capture categories in three groups:

1. Required data: checked and disabled; always captured.
2. Recommended data: checked by default, but user may uncheck.
3. Additional data: unchecked by default; user must opt in.

Plugin asset capture must be additional/opt-in, not default checked.

Sample records and full records must also be additional/opt-in.

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

## Testing expectations

Add tests before or alongside implementation.

Minimum test coverage for core modules:

- redaction rules
- deterministic JSON normalization
- scan checklist defaults
- workspace/profile models
- site tab persistence
- JavaScript/CSS order preservation
- structured export generation
- plugin config capture result parsing
- dependency extraction heuristics
- error classification

Avoid tests that require a real kintone domain. Real-domain integration tests should be opt-in only and require environment variables that are not committed.

## Documentation expectations

When adding implementation, update the specs if behavior changes.

Keep README user-focused. Keep implementation detail in `docs/`.

## Coding style

Prefer explicit types, pure functions for normalization/redaction, and deterministic output ordering. Avoid mixing UI code with collector logic.

Prefer structured error types over raw thrown strings.

Every collector result should be partial-success friendly: one failed API or one failed plugin should not fail the entire scan unless it is a required authentication/site-level error.
