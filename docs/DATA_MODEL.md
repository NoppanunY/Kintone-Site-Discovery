# Data Model and Storage Specification

This document defines the MVP 1 data model for Kintone Site Discovery.

The goal is to keep user-facing output simple while preserving enough structured metadata for audit, repeated scans, RAG, and future safe-deploy planning.

## 1. Storage principles

1. User-facing files belong in `knowledge/`.
2. Machine-managed files belong in `.kintone/`.
3. Credentials never belong in either folder.
4. Raw and normalized data must be deterministic enough for scan comparison.
5. RAG chunks must include metadata that lets AI trace every chunk back to its source.
6. Output should support partial success.
7. Plugin assets and sample records must be opt-in and redacted.

## 2. Folder layout

Recommended MVP 1 layout:

```text
project-root/
  README.md
  knowledge/
    site-summary.md
    apps-summary.md
    plugins-summary.md
    dependency-map.md
    ai-context.md

  .kintone/
    project.json
    sites.sqlite
    snapshots/
    raw/
    normalized/
    rag/
      chunks.jsonl
      index-manifest.json
    logs/
    cache/
```

### 2.1 `knowledge/`

Human-readable and AI-readable summaries. These files are intended to be opened by users and passed to AI.

### 2.2 `.kintone/`

Internal machine-managed data. Users should not need to edit this folder.

Potential `.gitignore` default for generated local data:

```gitignore
.kintone/raw/
.kintone/normalized/
.kintone/snapshots/
.kintone/rag/
.kintone/logs/
.kintone/cache/
.kintone/sites.sqlite
```

A later product setting may allow users to export/share selected knowledge packs, but generated raw captures should not be committed by default.

## 3. Core domain entities

### 3.1 ProjectConfig

Stored in `.kintone/project.json`.

```json
{
  "schemaVersion": 1,
  "projectId": "ksd_01H...",
  "projectName": "Client CRM Discovery",
  "createdAt": "2026-07-02T10:00:00+07:00",
  "updatedAt": "2026-07-02T10:00:00+07:00",
  "sites": [
    {
      "siteId": "site_example_cybozu_com",
      "displayName": "Production",
      "domain": "example.cybozu.com",
      "credentialRef": "keychain:kintone-site-discovery/site_example_cybozu_com/admin",
      "authType": "password",
      "defaultLanguage": "en"
    }
  ]
}
```

Rules:

- `credentialRef` is only a reference.
- Never store password/token/cookie in this file.

### 3.2 SiteProfile

Represents a kintone site/environment.

```json
{
  "siteId": "site_example_cybozu_com",
  "displayName": "Production",
  "domain": "example.cybozu.com",
  "authType": "password",
  "credentialRef": "keychain:...",
  "lastConnectedAt": "2026-07-02T10:00:00+07:00",
  "capabilities": {
    "restApi": true,
    "browserRuntime": true,
    "networkAssetCapture": true
  }
}
```

### 3.3 ScanJob

Represents one scan execution.

```json
{
  "scanId": "scan_20260702_103015_abc123",
  "siteId": "site_example_cybozu_com",
  "createdAt": "2026-07-02T10:30:15+07:00",
  "createdBy": "admin@example.com",
  "selectedApps": ["101", "102"],
  "profile": "deep-scan",
  "captureOptions": {
    "required": {
      "appBasicInfo": true,
      "formFields": true,
      "formLayout": true,
      "views": true,
      "processManagement": true,
      "permissions": true,
      "notifications": true,
      "actions": true,
      "customizationMetadata": true,
      "pluginInventory": true,
      "adminNotes": true,
      "livePreviewState": true
    },
    "recommended": {
      "usersGroupsDepartments": true,
      "spaces": true,
      "appCustomizationFiles": true,
      "pluginSavedConfig": true,
      "dependencyDetection": true,
      "previewLiveDiffSummary": true
    },
    "additional": {
      "pluginDesktopRuntimeAssets": false,
      "pluginConfigPageAssets": false,
      "pluginMobileRuntimeAssets": false,
      "sampleRecords": false,
      "recordComments": false,
      "attachmentMetadata": false,
      "fullRecordExport": false,
      "browserScreenshots": false
    }
  },
  "status": "completed-with-warnings",
  "startedAt": "2026-07-02T10:30:15+07:00",
  "finishedAt": "2026-07-02T10:35:22+07:00"
}
```

### 3.4 CollectorResult

Every collector returns a result object.

```json
{
  "collectorId": "rest:get-form-fields",
  "scanId": "scan_20260702_103015_abc123",
  "siteId": "site_example_cybozu_com",
  "appId": "101",
  "target": "/k/v1/app/form/fields.json?app=101",
  "state": "live",
  "status": "success",
  "startedAt": "2026-07-02T10:30:20+07:00",
  "finishedAt": "2026-07-02T10:30:21+07:00",
  "durationMs": 921,
  "rawPath": ".kintone/raw/site_example_cybozu_com/scan_.../apps/101/live/form-fields.json",
  "normalizedPath": ".kintone/normalized/site_example_cybozu_com/scan_.../apps/101/live/form-fields.json",
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
  "siteId": "site_example_cybozu_com",
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
  "siteId": "site_example_cybozu_com",
  "scanId": "scan_20260702_103015_abc123",
  "appId": "101",
  "appKey": "sales-management",
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
  "siteId": "site_example_cybozu_com",
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
  "siteId": "site_example_cybozu_com",
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
  "siteId": "site_example_cybozu_com",
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
      "siteId": "site_example_cybozu_com",
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
  "siteId": "site_example_cybozu_com",
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

## 8. RAG chunk model

Stored as `.kintone/rag/chunks.jsonl`.

Each line is one JSON object.

```json
{
  "chunkId": "chunk_site_example_app_101_fields_customer_name",
  "schemaVersion": 1,
  "scanId": "scan_20260702_103015_abc123",
  "siteId": "site_example_cybozu_com",
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

Recommended chunk types:

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

## 9. Markdown knowledge files

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

### 9.4 `dependency-map.md`

Should include:

- App-to-app dependencies.
- Field dependencies.
- Plugin dependencies.
- JS/API dependencies.
- Confidence and evidence.

### 9.5 `ai-context.md`

A concise, high-signal summary intended to be pasted into an AI session.

It should avoid raw JSON dumps and focus on:

- System overview.
- Major apps.
- Data relationships.
- Workflow/permission concerns.
- Plugin/customization risks.
- Open questions for user confirmation.

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
RAG_BUILD_FAILED
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
    "siteId": "site_example_cybozu_com",
    "scanId": "scan_...",
    "appId": "101",
    "state": "live",
    "source": "rest:/k/v1/app/form/fields.json",
    "collectedAt": "2026-07-02T10:30:15+07:00",
    "sha256": "sha256:..."
  }
}
```
