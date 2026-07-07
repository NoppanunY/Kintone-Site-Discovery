# Data Model and Storage Specification

This document defines the MVP 1 data model for Kintone Site Discovery.

The goal is to keep user-facing output simple while preserving enough structured metadata for audit, repeated scans, local inspection, and future safe-pull/safe-deploy planning.

The app does not include AI features. Data files may be used by any external tool, but that is outside the app's responsibility.

## 1. Storage principles

1. User-facing reports belong in `reports/`.
2. User-facing structured export files belong in `exports/`.
3. Machine-managed files belong in `.kintone/`.
4. Credentials never belong in any project folder.
5. Raw and normalized data must be deterministic enough for scan comparison.
6. Structured export records must include source metadata.
7. Output should support partial success.
8. Plugin assets and sample records must be opt-in and redacted.

## 2. Folder layout

Recommended MVP 1 layout:

```text
project-root/
  README.md
  reports/
    site-summary.md
    apps-summary.md
    plugins-summary.md
    dependency-report.md
    scan-report.md

  exports/
    structured-data.jsonl
    export-manifest.json

  .kintone/
    project.json
    sites.sqlite
    snapshots/
    raw/
    normalized/
    logs/
    cache/
```

### 2.1 `reports/`

Human-readable markdown reports. These files are intended to be opened by users.

### 2.2 `exports/`

Structured export files generated from captured kintone data. These files are intended for external tools, scripts, review, diffing, or later import into other systems.

### 2.3 `.kintone/`

Internal machine-managed data. Users should not need to edit this folder.

Potential `.gitignore` default for generated local data:

```gitignore
.kintone/raw/
.kintone/normalized/
.kintone/snapshots/
.kintone/logs/
.kintone/cache/
.kintone/sites.sqlite
```

A later product setting may allow users to export/share selected packages, but generated raw captures should not be committed by default.

## 3. Core domain entities

### 3.1 GlobalAuthProfileStore

Stored outside project folders in the app's global data directory.

```json
{
  "schemaVersion": 1,
  "authProfiles": [
    {
      "authProfileId": "auth_prod_admin_01",
      "displayName": "Production Admin",
      "authType": "password",
      "username": "admin@example.com",
      "credentialRef": "keychain:kintone-site-discovery/auth_prod_admin_01/password",
      "createdAt": "2026-07-02T10:00:00+07:00",
      "updatedAt": "2026-07-02T10:00:00+07:00"
    }
  ]
}
```

Rules:

- Auth Profiles are global app-level records, not owned by a project.
- `credentialRef` is only a reference.
- Never store password/token/cookie in this file.
- Project and site files store only `authProfileId` references.

### 3.2 ProjectConfig

Stored in `.kintone/project.json`.

```json
{
  "schemaVersion": 1,
  "projectId": "ksd_01H...",
  "projectName": "Client CRM Discovery",
  "createdAt": "2026-07-02T10:00:00+07:00",
  "updatedAt": "2026-07-02T10:00:00+07:00",
  "siteWorkspaces": [
    {
      "siteWorkspaceId": "site_ws_prod",
      "displayName": "Production",
      "domain": "example.cybozu.com",
      "authProfileId": "auth_prod_admin_01",
      "localFolder": "/Users/user/KintoneDiscovery/production"
    }
  ]
}
```

Rules:

- `authProfileId` references a global Auth Profile.
- Never store password/token/cookie/credentialRef in this file.

### 3.3 AuthProfile

A global reusable authentication identity.

```json
{
  "authProfileId": "auth_prod_admin_01",
  "displayName": "Production Admin",
  "authType": "password",
  "username": "admin@example.com",
  "credentialRef": "keychain:kintone-site-discovery/auth_prod_admin_01/password",
  "createdAt": "2026-07-02T10:00:00+07:00",
  "updatedAt": "2026-07-02T10:00:00+07:00",
  "notes": "Used for production discovery scans."
}
```

### 3.4 SiteWorkspace

Represents one configured kintone site.

```json
{
  "siteWorkspaceId": "site_ws_client_a_prod",
  "displayName": "Client A Production",
  "domain": "client-a.cybozu.com",
  "authProfileId": "auth_client_a_admin",
  "localFolder": "/Users/user/KintoneDiscovery/client-a-production",
  "reportsFolder": "/Users/user/KintoneDiscovery/client-a-production/reports",
  "exportsFolder": "/Users/user/KintoneDiscovery/client-a-production/exports",
  "internalFolder": "/Users/user/KintoneDiscovery/client-a-production/.kintone",
  "settings": {
    "defaultScanProfile": "deep-scan",
    "browser": {
      "mode": "headless",
      "loginTimeoutMs": 60000,
      "pageLoadTimeoutMs": 60000,
      "pluginAssetMaxBytes": 5242880
    },
    "output": {
      "language": "en",
      "retainRawRedactedPayloads": true,
      "retainSnapshots": true
    },
    "privacy": {
      "redactionEnabled": true,
      "customSensitiveKeyPatterns": []
    }
  },
  "lastScanId": "scan_20260702_103015_abc123",
  "createdAt": "2026-07-02T10:00:00+07:00",
  "updatedAt": "2026-07-02T10:00:00+07:00"
}
```

### 3.5 ScanJob

Represents one scan execution.

```json
{
  "scanId": "scan_20260702_103015_abc123",
  "siteWorkspaceId": "site_ws_client_a_prod",
  "createdAt": "2026-07-02T10:30:15+07:00",
  "createdBy": "admin@example.com",
  "selectedApps": ["101", "102"],
  "profile": "deep-scan",
  "status": "completed-with-warnings",
  "startedAt": "2026-07-02T10:30:15+07:00",
  "finishedAt": "2026-07-02T10:35:22+07:00"
}
```

### 3.6 CollectorResult

Every collector returns a result object.

```json
{
  "collectorId": "rest:get-form-fields",
  "scanId": "scan_20260702_103015_abc123",
  "siteWorkspaceId": "site_ws_client_a_prod",
  "appId": "101",
  "target": "/k/v1/app/form/fields.json?app=101",
  "state": "live",
  "status": "success",
  "startedAt": "2026-07-02T10:30:20+07:00",
  "finishedAt": "2026-07-02T10:30:21+07:00",
  "durationMs": 921,
  "rawPath": ".kintone/raw/.../form-fields.json",
  "normalizedPath": ".kintone/normalized/.../form-fields.json",
  "sha256": "sha256:...",
  "redactions": [],
  "error": null
}
```

Failure example:

```json
{
  "collectorId": "browser:plugin-get-config",
  "scanId": "scan_20260702_103015_abc123",
  "siteWorkspaceId": "site_ws_client_a_prod",
  "appId": "101",
  "target": "plugin:djmhffjhfgmebgnmcggopedaofckljlj",
  "status": "failed",
  "recoverable": true,
  "error": {
    "code": "PLUGIN_RUNTIME_UNAVAILABLE",
    "message": "kintone.plugin.app.getConfig was not available on the opened page.",
    "detailsRedacted": true
  }
}
```

## 4. App model

Normalized app model generated per selected app.

```json
{
  "schemaVersion": 1,
  "siteWorkspaceId": "site_ws_client_a_prod",
  "scanId": "scan_20260702_103015_abc123",
  "appId": "101",
  "appKey": "sales-management-101",
  "name": "Sales Management",
  "space": {
    "spaceId": "10",
    "name": "CRM"
  },
  "states": {
    "live": {
      "revision": "57",
      "collectedAt": "2026-07-02T10:30:15+07:00"
    },
    "preview": {
      "revision": "58",
      "collectedAt": "2026-07-02T10:30:15+07:00"
    }
  },
  "features": {
    "hasProcessManagement": true,
    "hasCustomization": true,
    "hasPlugins": true,
    "hasPreviewDiff": true
  },
  "sourcePaths": {
    "fields": ".kintone/normalized/.../form-fields.json",
    "layout": ".kintone/normalized/.../form-layout.json",
    "views": ".kintone/normalized/.../views.json",
    "plugins": ".kintone/normalized/.../plugins.json"
  }
}
```

### 4.1 App key generation

MVP may generate `appKey` from app name and app ID:

```text
sales-management-101
```

Rules:

- Lowercase.
- Replace spaces and unsafe characters with hyphens.
- Append app ID to avoid collisions.
- Do not use app ID alone because future multi-environment mapping may need stable human names.

## 5. Plugin model

### 5.1 PluginInventory

```json
{
  "schemaVersion": 1,
  "siteWorkspaceId": "site_ws_client_a_prod",
  "scanId": "scan_20260702_103015_abc123",
  "appId": "101",
  "state": "live",
  "revision": "2",
  "plugins": [
    {
      "pluginId": "djmhffjhfgmebgnmcggopedaofckljlj",
      "name": "Approval Helper",
      "enabled": true
    }
  ]
}
```

### 5.2 PluginSavedConfig

```json
{
  "schemaVersion": 1,
  "siteWorkspaceId": "site_ws_client_a_prod",
  "scanId": "scan_20260702_103015_abc123",
  "appId": "101",
  "pluginId": "djmhffjhfgmebgnmcggopedaofckljlj",
  "pluginName": "Approval Helper",
  "source": "browser-runtime:getConfig",
  "capturePage": "record-list",
  "status": "captured",
  "config": {
    "targetAppId": "203",
    "statusField": "Status",
    "apiToken": "[REDACTED]"
  },
  "redactions": [
    {
      "path": "config.apiToken",
      "reason": "sensitive-key"
    }
  ],
  "sha256": "sha256:..."
}
```

### 5.3 PluginAssetManifest

```json
{
  "schemaVersion": 1,
  "siteWorkspaceId": "site_ws_client_a_prod",
  "scanId": "scan_20260702_103015_abc123",
  "appId": "101",
  "pluginId": "djmhffjhfgmebgnmcggopedaofckljlj",
  "captureContext": "record-list-page",
  "assets": [
    {
      "assetId": "asset_abc123",
      "assetKind": "plugin-desktop-js",
      "url": "https://example.cybozu.com/.../desktop.js",
      "fileName": "desktop.js",
      "contentType": "application/javascript",
      "byteSize": 12345,
      "sha256": "sha256:...",
      "storedPath": ".kintone/raw/.../desktop.js.redacted",
      "redactionApplied": true,
      "status": "captured"
    }
  ]
}
```

## 6. Redaction model

### 6.1 Redaction finding

```json
{
  "path": "config.apiToken",
  "reason": "sensitive-key:apiToken",
  "replacement": "[REDACTED]",
  "valueHash": "sha256:redacted-value-hash-optional"
}
```

Do not include the original value.

### 6.2 Redaction report

```json
{
  "scanId": "scan_20260702_103015_abc123",
  "totalRedactions": 4,
  "findings": [
    {
      "siteWorkspaceId": "site_ws_client_a_prod",
      "appId": "101",
      "sourcePath": ".kintone/normalized/.../plugin-config.json",
      "path": "config.apiToken",
      "reason": "sensitive-key:apiToken"
    }
  ]
}
```

## 7. Dependency model

Dependency candidates are heuristics, not guaranteed facts.

```json
{
  "schemaVersion": 1,
  "scanId": "scan_20260702_103015_abc123",
  "siteWorkspaceId": "site_ws_client_a_prod",
  "dependencies": [
    {
      "dependencyId": "dep_001",
      "from": {
        "type": "app",
        "appId": "101",
        "appKey": "sales-management"
      },
      "to": {
        "type": "app",
        "appId": "203"
      },
      "kind": "plugin-config-app-reference",
      "confidence": "medium",
      "evidence": {
        "sourceType": "plugin-config",
        "sourcePath": ".kintone/normalized/.../plugin-config.json",
        "jsonPath": "config.targetAppId",
        "value": "203"
      }
    }
  ]
}
```

Confidence values:

- `high`: official kintone setting references the target, such as lookup/related-record target app.
- `medium`: plugin config key/value strongly suggests reference.
- `low`: JavaScript string/static pattern suggests reference but needs human confirmation.

## 8. Structured export record model

Stored as `exports/structured-data.jsonl`.

Each line is one JSON object.

```json
{
  "recordId": "export_site_client_a_app_101_fields_customer_name",
  "schemaVersion": 1,
  "scanId": "scan_20260702_103015_abc123",
  "siteWorkspaceId": "site_ws_client_a_prod",
  "domain": "example.cybozu.com",
  "appId": "101",
  "appKey": "sales-management-101",
  "type": "field",
  "title": "Field CustomerName in Sales Management",
  "content": "CustomerName is a SINGLE_LINE_TEXT field labeled Customer Name. It appears in the main form layout and is used in the Open Deals view filter.",
  "sourcePaths": [
    ".kintone/normalized/.../form-fields.json",
    ".kintone/normalized/.../form-layout.json"
  ],
  "tags": ["field", "form", "sales-management"],
  "redactionApplied": false,
  "hash": "sha256:..."
}
```

Recommended export record types:

- `site-summary`
- `app-summary`
- `field`
- `layout`
- `view`
- `graph`
- `process-management`
- `permission`
- `notification`
- `customization-metadata`
- `customization-code-summary`
- `plugin-inventory`
- `plugin-config`
- `plugin-asset-summary`
- `dependency`
- `preview-live-diff`
- `scan-error`

## 9. Markdown report files

### 9.1 `site-summary.md`

Should include:

- Site display name/domain.
- Scan timestamp.
- Number of apps scanned.
- Spaces found.
- Users/groups/departments summary if enabled.
- High-level warnings.

### 9.2 `apps-summary.md`

Per app:

- App ID/name/app key.
- Purpose inferred from fields/views/admin notes.
- Important fields.
- Views.
- Process flow.
- Permissions summary.
- Customization/plugins present.
- Live/preview difference summary.

### 9.3 `plugins-summary.md`

Per plugin:

- App ID/name.
- Plugin ID/name/enabled.
- Saved config summary.
- Asset capture status.
- Field/app dependency candidates.
- Risks/warnings.

### 9.4 `dependency-report.md`

Should include:

- App-to-app dependencies.
- Field dependencies.
- Plugin dependencies.
- JS/API dependencies.
- Confidence and evidence.

### 9.5 `scan-report.md`

Should include:

- Scan status.
- Capture options used.
- Successful collectors.
- Failed collectors.
- Warnings.
- Redactions applied.
- Output files generated.

## 10. Error code taxonomy

Suggested codes:

```text
AUTH_FAILED
SITE_UNREACHABLE
PERMISSION_DENIED
API_NOT_AVAILABLE
API_RATE_LIMITED
API_RESPONSE_INVALID
OUTPUT_WRITE_FAILED
BROWSER_LOGIN_FAILED
BROWSER_PAGE_LOAD_FAILED
BROWSER_RUNTIME_UNAVAILABLE
PLUGIN_GET_CONFIG_NULL
PLUGIN_GET_CONFIG_FAILED
PLUGIN_ASSET_CAPTURE_FAILED
PLUGIN_ASSET_TOO_LARGE
REDACTION_FAILED
NORMALIZATION_FAILED
EXPORT_BUILD_FAILED
USER_CANCELLED
```

## 11. Deterministic normalization rules

- Sort object keys alphabetically unless domain order is meaningful.
- Preserve field order where layout/order semantics matter.
- Sort arrays by stable IDs/codes when order is not meaningful.
- Preserve original values in `raw` only after redaction.
- Include `_meta` block for source, collectedAt, state, endpoint, hash.

Example `_meta`:

```json
{
  "_meta": {
    "siteWorkspaceId": "site_ws_client_a_prod",
    "scanId": "scan_...",
    "appId": "101",
    "state": "live",
    "source": "rest:/k/v1/app/form/fields.json",
    "collectedAt": "2026-07-02T10:30:15+07:00",
    "sha256": "sha256:..."
  }
}
```
