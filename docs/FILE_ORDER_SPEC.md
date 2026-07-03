# JavaScript and CSS File Order Preservation Specification

This document defines how Kintone Site Discovery must preserve JavaScript and CSS file order when pulling customization and plugin-related files.

## 1. Why file order matters

kintone customization and plugin JavaScript may register event handlers, define globals, load dependencies, patch prototypes, or initialize shared utilities. The runtime behavior can depend on the order in which files are loaded.

Therefore, when the app pulls JavaScript/CSS metadata or files, it must preserve the original order from kintone or from the browser-observed load sequence.

The app must never alphabetically sort JavaScript/CSS files in a way that loses runtime order.

## 2. Scope

This requirement applies to:

- App customization desktop JavaScript files.
- App customization desktop CSS files.
- App customization mobile JavaScript files.
- App customization mobile CSS files.
- Plugin desktop runtime JavaScript/CSS assets captured from browser/network.
- Plugin mobile runtime JavaScript/CSS assets captured from browser/network.
- Plugin config page JavaScript/CSS/HTML assets captured from browser/network.
- Export manifests and scan reports that display these files.

## 3. Core rule

For every ordered file list, store both:

1. The file itself or captured file metadata.
2. Its execution/load order.

Each ordered file item must include:

```json
{
  "orderIndex": 1,
  "orderSource": "kintone-customization-api",
  "orderConfidence": "high",
  "fileName": "common.js",
  "fileType": "js",
  "source": "FILE",
  "url": null,
  "fileKey": "...",
  "storedPath": ".kintone/raw/.../001-common.js",
  "sha256": "sha256:..."
}
```

Use 1-based `orderIndex` for readability.

## 4. Order sources

Allowed `orderSource` values:

```text
kintone-customization-api
plugin-manifest
browser-dom-order
browser-network-order
manual-fallback
unknown
```

Allowed `orderConfidence` values:

```text
high
medium
low
unknown
```

Guidance:

- `kintone-customization-api` is high confidence when the REST API returns ordered JS/CSS arrays.
- `plugin-manifest` is high confidence if the collector can read the plugin manifest or a manifest-derived ordered list.
- `browser-dom-order` is medium to high confidence if DOM script/link order can be observed after page load.
- `browser-network-order` is medium confidence because network timing can differ from declared execution order, but it is still useful evidence.
- `manual-fallback` is low confidence and should be used only when the app must preserve a user-provided order.
- `unknown` should be used when the order cannot be determined.

## 5. App customization files

When pulling app customization metadata/files, the collector must preserve the order returned by kintone for:

- desktop JavaScript files
- desktop CSS files
- mobile JavaScript files
- mobile CSS files

The normalized model must not sort these arrays alphabetically.

Example normalized output:

```json
{
  "desktop": {
    "js": [
      {
        "orderIndex": 1,
        "orderSource": "kintone-customization-api",
        "orderConfidence": "high",
        "fileName": "common.js",
        "storedPath": ".kintone/raw/apps/101/customization/desktop/js/001-common.js"
      },
      {
        "orderIndex": 2,
        "orderSource": "kintone-customization-api",
        "orderConfidence": "high",
        "fileName": "feature.js",
        "storedPath": ".kintone/raw/apps/101/customization/desktop/js/002-feature.js"
      }
    ],
    "css": []
  }
}
```

## 6. Plugin asset files

Plugin asset capture is best-effort, but order still matters.

For plugin assets, the collector should try to determine order using this priority:

1. Plugin manifest order, if available.
2. DOM script/link order on the loaded kintone page.
3. Browser network response order during page load.
4. Manual fallback or unknown order.

The asset manifest must record how order was determined.

Example:

```json
{
  "pluginId": "djmhffjhfgmebgnmcggopedaofckljlj",
  "captureContext": "record-list-page",
  "assets": [
    {
      "orderIndex": 1,
      "orderSource": "browser-dom-order",
      "orderConfidence": "medium",
      "assetKind": "plugin-desktop-js",
      "fileName": "runtime.js",
      "storedPath": ".kintone/raw/plugins/.../001-runtime.js"
    },
    {
      "orderIndex": 2,
      "orderSource": "browser-dom-order",
      "orderConfidence": "medium",
      "assetKind": "plugin-desktop-js",
      "fileName": "desktop.js",
      "storedPath": ".kintone/raw/plugins/.../002-desktop.js"
    }
  ]
}
```

## 7. File naming convention

When storing ordered files locally, prefix files with a zero-padded order number.

Recommended format:

```text
001-common.js
002-feature.js
003-finalize.js
```

For CSS:

```text
001-base.css
002-layout.css
003-theme.css
```

If the original file name is unavailable, use:

```text
001-unknown-plugin-desktop-js.js
```

The original file name and source URL/fileKey must still be kept in the manifest.

## 8. Export and report requirements

Reports and structured export files must show ordered file lists in execution/load order, not alphabetical order.

Reports should display:

```text
Desktop JavaScript files:
1. common.js
2. feature.js
3. finalize.js
```

Structured export records should include:

```json
{
  "type": "customization-file",
  "appId": "101",
  "fileType": "js",
  "scope": "desktop",
  "orderIndex": 2,
  "orderSource": "kintone-customization-api",
  "orderConfidence": "high",
  "fileName": "feature.js",
  "storedPath": ".kintone/raw/.../002-feature.js"
}
```

## 9. Normalization rules

The normalizer may sort object keys, but it must not reorder arrays whose order affects runtime behavior.

Do not sort these arrays alphabetically:

- customization desktop JS arrays
- customization desktop CSS arrays
- customization mobile JS arrays
- customization mobile CSS arrays
- plugin asset JS/CSS arrays
- plugin config page asset arrays

If a generic normalizer is used, it must support path-based order preservation rules.

## 10. Dependency and event analysis

When reporting event handlers found in JS files, include the ordered file location.

Example:

```json
{
  "event": "app.record.create.submit",
  "fileName": "feature.js",
  "orderIndex": 2,
  "scope": "desktop",
  "appId": "101"
}
```

This allows users to understand not only which file registers a kintone event, but also when that file is loaded relative to other files.

## 11. Tests

Minimum tests:

1. App customization JS order is preserved from API response to normalized output.
2. App customization CSS order is preserved from API response to normalized output.
3. Plugin asset order is preserved from browser DOM fixture.
4. Plugin asset order falls back to network order when DOM order is unavailable.
5. Generic JSON normalization does not reorder configured ordered arrays.
6. Local stored filenames include zero-padded order prefixes.
7. Reports display JS/CSS files in stored order.
8. Structured export records include `orderIndex`, `orderSource`, and `orderConfidence`.

## 12. Acceptance criteria

The feature is complete when:

- Every captured app customization JS/CSS file has an `orderIndex`.
- Every captured plugin JS/CSS/HTML asset has an `orderIndex` when order is known.
- Unknown order is explicitly marked as `orderSource: "unknown"` and `orderConfidence: "unknown"`.
- No report or export alphabetically reorders runtime-sensitive file arrays.
- Tests prove order is preserved through raw capture, normalization, storage, reports, and structured exports.
