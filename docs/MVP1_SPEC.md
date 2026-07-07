# MVP 1 Specification: Kintone Data Pull and Local Export

## 1. Executive summary

MVP 1 is a read-only kintone data extraction tool. Its purpose is to pull app, site, plugin, customization, and optional sample-record data from one or more kintone sites and store it locally as snapshots, reports, and structured export files.

The app does not include AI features. It does not analyze, recommend, chat, or make decisions for the user. It only captures and exports kintone data.

A useful analogy is SourceTree cloning a Git repository to the local machine, except this tool pulls kintone site/app metadata and stores it locally in a structured format.

## 2. Product scope

### 2.1 In scope

MVP 1 includes:

- Create global reusable authentication profiles/accounts.
- Add and test kintone site connection.
- Authenticate using admin username/password.
- Open each configured site in a separate tab.
- Store each site's captured data in a separate local folder.
- List apps visible to the authenticated admin user.
- Let the user select target apps.
- Let the user choose scan categories.
- Pull required app metadata/settings through REST APIs.
- Pull live and preview settings where supported.
- Pull plugin inventory through REST APIs.
- Pull plugin saved config through browser runtime by calling `kintone.plugin.app.getConfig(pluginId)` where possible.
- Optionally pull plugin desktop runtime JS/CSS and plugin config page JS/CSS/HTML through browser network capture.
- Optionally pull sample records with redaction.
- Normalize API responses into deterministic JSON.
- Redact secrets and sensitive data before writing output.
- Generate local snapshots, readable markdown reports, structured JSON/JSONL exports, and per-scan error reports.

### 2.2 Out of scope

MVP 1 excludes:

- Built-in AI features.
- Chat interface.
- AI insights or recommendations.
- Deploy to kintone.
- Updating app settings or preview settings.
- Safe deploy.
- Rollback.
- Git client features.
- Conflict resolver.
- Full CI/CD.
- Full record backup by default.
- Automatic modification of kintone apps.

## 3. Target users

### 3.1 Business/system analyst

Wants to understand what data was pulled from a kintone site without manually inspecting every app.

Needs:

- Simple scan UI.
- App summaries.
- Plugin summaries.
- Dependency report.
- Local export folder.

Should not need to understand raw JSON, hashes, or kintone API details.

### 3.2 Developer/admin

Wants complete metadata, plugin config, customization files, optional plugin assets, and traceable scan snapshots.

Needs:

- Full capture options.
- Raw/normalized data.
- Error report.
- Redaction visibility.
- Reproducible scan output.

## 4. User flow

### 4.1 Create project

User creates a local project.

Required fields:

- Project name.
- Local folder.

The app creates:

```text
reports/
exports/
.kintone/
```

`reports/` and `exports/` are user-facing.

`.kintone/` is machine-managed.

### 4.2 Create auth profile/account

User creates an Auth Profile.

Required fields:

- Profile display name.
- Username.
- Password.

Behavior:

- Store password in OS keychain or secure credential provider.
- Store only `credentialRef` in global profile metadata.
- Store only `authProfileId` references in project/site files.
- Allow profile reuse across multiple sites and projects.

### 4.3 Add site workspace

User adds a kintone site workspace.

Required fields:

- Site display name.
- Domain, for example `example.cybozu.com`.
- Auth Profile.
- Local folder.

Behavior:

- Validate domain format.
- Test login.
- Open the site as a tab.
- Keep per-site settings separate.

MVP 1 uses password authentication because it is simple and works with user-level permissions. Password authentication uses `X-Cybozu-Authorization` with base64-encoded `login:password` according to kintone documentation.

Reference: https://kintone.dev/en/docs/common/authentication/

### 4.4 Fetch apps

After successful connection, the app fetches and displays apps visible to the authenticated admin.

App list UI should support:

- App name.
- App ID.
- Space ID/name when available.
- Guest space indicator when available.
- App description when available.
- Search/filter.
- Multi-select.
- Select all visible.

### 4.5 Choose scan categories

The scan setup screen groups data categories into:

1. Required data: default checked and cannot be disabled.
2. Recommended data: default checked, user may disable.
3. Additional data: default unchecked, user may opt in.

See section 6 for the capture matrix.

### 4.6 Run scan

Scan execution should be partial-success friendly.

A scan should not fail completely because one app, one plugin, or one optional collector fails. It should produce:

- Scan status.
- Successful collectors.
- Failed collectors.
- Warnings.
- Redaction report.
- Output file paths.

Only these should fail the entire scan:

- Authentication failure.
- Site unreachable.
- User cancels.
- Local output folder cannot be written.
- Required collector repeatedly fails for all selected apps.

### 4.7 Review output

After scan completion, show:

- Apps scanned.
- Required API success/failure count.
- Plugin inventory count.
- Plugin saved configs captured.
- Plugin asset files captured when enabled.
- Live/preview differences found.
- Dependency candidates found.
- Redactions applied.
- Errors/warnings.

Primary buttons:

- Open local folder.
- Open reports folder.
- Open exports folder.
- View scan report.
- Export package.

## 5. Collector architecture

MVP 1 uses four collector layers.

```text
Desktop UI / CLI
  -> Collector Core
      -> REST API Collector
      -> Browser Runtime Collector
      -> Browser Network Asset Collector
      -> Normalizer / Redactor
      -> Report and Export Builder
```

### 5.1 REST API Collector

Purpose: capture site/app metadata and settings from kintone REST APIs.

Responsibilities:

- Use authenticated REST client.
- Capture selected app settings.
- Capture both live and preview variants where available.
- Record per-endpoint status.
- Redact before writing output.

Default required app settings include:

- App basic info.
- General settings.
- Form fields.
- Form layout.
- Views.
- Graph/report settings if available.
- Process management settings.
- App permissions.
- Record permissions.
- Field permissions.
- Action settings.
- General notifications.
- Per-record notifications.
- Reminder notifications.
- Customization metadata.
- Plugin inventory.
- Admin notes.

The kintone REST API index lists app settings endpoints for fields, layout, views, graphs, general settings, process management, app plugins, customization, notification settings, permissions, action settings, app admin notes, records, files, spaces, installed plugins, and User API resources.

Reference: https://kintone.dev/en/docs/kintone/rest-api/

### 5.2 Browser Runtime Collector

Purpose: capture values only available from inside kintone browser runtime.

Primary MVP use case: plugin saved config.

For each selected app/plugin:

1. Open a kintone app page, preferably record list page.
2. Wait until page and kintone runtime are available.
3. Inject read-only script.
4. Call `kintone.plugin.app.getConfig(pluginId)`.
5. Capture returned config or null/error.
6. Redact sensitive values.
7. Store normalized config and scan report.

The kintone JavaScript API documents `kintone.plugin.app.getConfig(pluginId)` as returning an object of plugin settings key/value pairs or `null` when unavailable. It can be used on desktop pages including Record List, Record Details, Record Create, Record Edit, Graph, and Plug-in Settings pages.

Reference: https://kintone.dev/en/docs/kintone/js-api/plugins/get-config/

### 5.3 Browser Network Asset Collector

Purpose: best-effort capture of plugin runtime/config assets loaded by the browser.

This collector is optional and must not be default checked.

Use cases:

- Capture plugin desktop runtime JS/CSS.
- Capture plugin mobile runtime JS/CSS where possible.
- Capture plugin config page JS/CSS/HTML where possible.

Important limitation:

Do not assume every plugin has files named `config.js` or `desktop.js`. kintone plugin manifests may define desktop JS/CSS arrays, mobile JS/CSS arrays, and config HTML/JS/CSS. Real-world plugins may bundle, minify, rename, remote-load, or lazy-load assets.

The plugin development specification describes plugin manifest fields such as `desktop.js`, `desktop.css`, `mobile.js`, `mobile.css`, `config.html`, `config.js`, and `config.css`.

Reference: https://kintone.dev/en/plugins/introduction-to-plug-ins/plug-in-development-specifications/

Network capture behavior:

1. Login through browser session.
2. Enable network response capture.
3. Open app record list page to load desktop runtime assets.
4. Match plugin-related assets by URL patterns, plugin ID, script source, or page context.
5. Optionally open plugin settings page for each plugin to load config assets.
6. Store asset body only after redaction and size checks.
7. Store asset manifest with URL, status, MIME type, hash, byte size, and capture context.

### 5.4 Normalizer / Redactor

Purpose: convert raw data into stable, safe output.

Normalizer requirements:

- Deterministic key ordering.
- Stable array ordering where domain semantics allow it.
- Preserve original app IDs and field codes.
- Include source endpoint/page metadata.
- Include live/preview state marker.
- Include content hashes.
- Avoid environment-specific noise when possible.

Redactor requirements:

- Detect sensitive key names.
- Detect secret-looking values.
- Redact before writing any output.
- Keep a redaction report with path and reason, but not the secret value.
- Never write credentials, auth headers, session cookies, or passwords.

Default sensitive key patterns include:

```text
password
passwd
pwd
secret
clientSecret
client_secret
token
apiToken
api_token
accessToken
refreshToken
authorization
bearer
cookie
session
x-cybozu-authorization
x-cybozu-api-token
proxy
privateKey
```

### 5.5 Report and Export Builder

Purpose: generate user-readable and machine-readable local output.

Outputs:

- `reports/site-summary.md`
- `reports/apps-summary.md`
- `reports/plugins-summary.md`
- `reports/dependency-report.md`
- `reports/scan-report.md`
- `exports/structured-data.jsonl`
- `exports/export-manifest.json`

Structured export files should carry metadata such as site, app ID, app key, data type, source path, capture timestamp, and redaction status.

## 6. Capture matrix

### 6.1 Required data

Required data is default checked and disabled in the UI. The user cannot turn it off because it is the minimum needed for useful local capture.

| Category | Source | Default | User can disable | Notes |
|---|---|---:|---:|---|
| App list | REST | Yes | No | Needed for selection and site overview. |
| App basic info | REST | Yes | No | App name, ID, description, space relation where available. |
| General settings | REST | Yes | No | Core app metadata. |
| Form fields | REST | Yes | No | Field codes, types, labels, options, lookup references. |
| Form layout | REST | Yes | No | Groups, rows, field placement. |
| Views | REST | Yes | No | List/calendar/custom views and filters. |
| Graph/report settings | REST | Yes | No | Required where available. |
| Process management | REST | Yes | No | Statuses, actions, assignees. |
| App permissions | REST | Yes | No | App-level ACL. |
| Record permissions | REST | Yes | No | Conditional access rules. |
| Field permissions | REST | Yes | No | Field-level ACL. |
| Actions | REST | Yes | No | App action links/dependencies. |
| Notifications | REST | Yes | No | General, per-record, reminders. |
| Customization metadata | REST | Yes | No | Metadata and file keys/URLs where available. |
| Plugin inventory | REST | Yes | No | Plugin IDs, names, enabled flags, revision. |
| Admin notes | REST | Yes | No | Design/context notes. |
| Live + preview state | REST | Yes | No | Capture live and preview where supported. |

### 6.2 Recommended data

Recommended data is default checked but user may disable.

| Category | Source | Default | User can disable | Notes |
|---|---|---:|---:|---|
| Users/groups/departments | REST/User API | Yes | Yes | Needed to explain permissions/workflows. |
| Spaces and members | REST | Yes | Yes | Needed for site structure. |
| App customization JS/CSS files | REST file download | Yes | Yes | High-value business logic. |
| Plugin saved config | Browser runtime | Yes | Yes | Uses `getConfig(pluginId)`. |
| Dependency detection | Local analysis | Yes | Yes | Lookups, related records, app IDs, field refs, JS/API refs. |
| Preview-vs-live diff summary | Local analysis | Yes | Yes | Detect pending settings differences. |

### 6.3 Additional data

Additional data is default unchecked. User must opt in.

| Category | Source | Default | User can enable | Notes |
|---|---|---:|---:|---|
| Plugin desktop runtime JS/CSS | Browser network | No | Yes | Proprietary/sensitive risk; best effort. |
| Plugin config page JS/CSS/HTML | Browser network | No | Yes | Proprietary/sensitive risk; best effort. |
| Plugin mobile runtime JS/CSS | Browser network | No | Yes | Optional and page-dependent. |
| Sample records | REST | No | Yes | Must redact; default max 10-100. |
| Record comments | REST | No | Yes | Sensitive risk. |
| Attachment metadata | REST | No | Yes | Do not download attachment bodies by default. |
| Full record export | REST/cursor/CLI later | No | Yes | Not recommended for MVP default. |
| Browser screenshots | Browser | No | Yes | Evidence/debug only; may contain sensitive UI data. |

## 7. Plugin capture specification

### 7.1 Plugin inventory

Use REST API to get app plugins for live and preview where supported.

The Get App Plug-ins API returns plugins added to an app and includes plugin ID, plugin name, enabled flag, and app revision. It also has a preview endpoint for pre-live settings.

Reference: https://kintone.dev/en/docs/kintone/rest-api/apps/settings/get-app-plugins/

### 7.2 Plugin saved config

Use browser runtime and `kintone.plugin.app.getConfig(pluginId)`.

Store status per plugin:

- `captured`
- `null-returned`
- `runtime-unavailable`
- `permission-error`
- `page-load-error`
- `script-error`
- `redaction-error`

### 7.3 Plugin assets

Optional network capture categories:

- `plugin-desktop-js`
- `plugin-desktop-css`
- `plugin-mobile-js`
- `plugin-mobile-css`
- `plugin-config-html`
- `plugin-config-js`
- `plugin-config-css`
- `plugin-unknown-asset`

## 8. Dependency detection

MVP 1 should include basic dependency extraction. It does not need perfect static analysis.

### 8.1 Field-level dependencies

Detect from:

- Lookup field settings.
- Related records settings.
- View filters.
- Process management statuses/actions.
- Notifications conditions.
- Permission conditions.
- Plugin config values that look like field codes.
- App customization JS references.
- Plugin asset JS references when opted in.

### 8.2 App-level dependencies

Detect from:

- Lookup target app IDs.
- Related records target app IDs.
- Action settings.
- JS code references to `/k/v1/record`, `/k/v1/records`, app IDs, or app code-like constants.
- Plugin config keys such as `appId`, `targetApp`, `targetAppId`, `relatedApp`, `sourceApp`.

### 8.3 Event dependencies

Detect kintone event strings in app customization/plugin assets:

- `app.record.index.show`
- `app.record.detail.show`
- `app.record.create.show`
- `app.record.create.submit`
- `app.record.edit.show`
- `app.record.edit.submit`
- `app.record.index.edit.submit`
- `app.record.detail.process.proceed`
- mobile equivalents where found

## 9. Storage and output

User-facing output:

```text
reports/
  site-summary.md
  apps-summary.md
  plugins-summary.md
  dependency-report.md
  scan-report.md

exports/
  structured-data.jsonl
  export-manifest.json
```

Machine-managed output:

```text
.kintone/
  project.json
  sites.sqlite
  snapshots/
  raw/
  normalized/
  logs/
  cache/
```

`.kintone/` should be treated as internal. Do not require users to edit it.

## 10. Security requirements

### 10.1 Credential storage

- Store admin password in OS keychain only.
- Store credential reference in global profile metadata.
- Store only global `authProfileId` references in project/site metadata.
- Never write password, session cookies, or auth headers to disk.
- Provide a `Forget credential` action.

### 10.2 Redaction

Redaction applies before writing:

- Raw snapshots, unless a protected raw mode is explicitly designed later.
- Normalized JSON.
- Markdown reports.
- Structured export files.
- Logs.
- Error payloads.

### 10.3 Sensitive optional capture

Plugin assets, sample records, record comments, attachment metadata, full records, and browser screenshots may contain sensitive data. They must be opt-in and not default checked.

## 11. Error handling

Every collector result should include:

- `collectorId`
- `siteId`
- `appId`, if applicable
- `target`, for endpoint/page/plugin/asset
- `status`
- `startedAt`
- `finishedAt`
- `durationMs`
- `errorCode`, if failed
- `message`
- `recoverable`

The UI should summarize failures in user-readable terms.

## 12. Acceptance criteria

MVP 1 is considered production-usable when all criteria pass:

1. User can create a local project.
2. User can create global reusable Auth Profiles.
3. User can add a kintone site workspace using an Auth Profile.
4. User can open each site in a separate tab.
5. User can configure separate local folders and settings per site.
6. User can add a kintone site using admin username/password.
7. Credentials are stored only in secure credential storage.
8. User can test connection.
9. User can fetch app list.
10. User can select apps.
11. User sees required/recommended/additional scan categories with correct defaults.
12. Required categories are checked and cannot be disabled.
13. Recommended categories are checked and can be disabled.
14. Additional categories are unchecked by default and can be enabled.
15. Required REST app metadata/settings are captured for selected apps.
16. Live and preview variants are captured where supported.
17. Plugin inventory is captured.
18. Plugin saved config is captured through browser runtime where possible.
19. Plugin asset capture is available as opt-in, best-effort collection.
20. Redaction runs before output and has tests.
21. Normalized JSON output is deterministic.
22. Markdown reports are generated.
23. Structured export files are generated.
24. A scan summary is shown.
25. Per-app/per-collector error report is generated.
26. The scan can partially succeed without losing successful data.
27. No secrets appear in generated output or logs in test fixtures.
28. There is no deploy/update capability in MVP 1.
29. There is no built-in AI capability in MVP 1.

## 13. Future phases

MVP 1 creates the local data capture foundation.

Later phases may add:

- Repeated scan comparison.
- Cloud drift detection.
- Snapshot history.
- Safe pull.
- Safe deploy.
- Deploy lock.
- Revision guard.
- Rollback from snapshot.
- CI/CD integration.
