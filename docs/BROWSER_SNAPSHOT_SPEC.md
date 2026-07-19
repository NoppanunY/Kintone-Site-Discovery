# Browser Snapshot / HTML Capture Specification

## Purpose

Browser Snapshot is a neutral capture capability for storing the current browser page as reusable local data. Its responsibility is only to capture page content and related metadata. It must not imply that the product is an AI application, an automation agent, or an analysis engine.

The captured output can later be used by the user for any workflow they choose, including manual inspection, debugging, archival, export, handoff to another tool, or external AI-assisted analysis.

## Product positioning

Use neutral naming throughout the product:

- Feature name: **Browser Snapshot**
- Action name: **Capture Current Page**
- Technical capability: **HTML Capture** or **DOM Snapshot**
- Thai UI option: **บันทึก snapshot ของหน้าเว็บ** or **ดึง HTML จากหน้านี้**

Avoid AI-specific naming such as:

- AI Context Capture
- Capture for AI
- AI Page Summary
- AI Browser Assistant

The app should capture data. It should not describe, summarize, infer, or rank the page content by itself.

## Scope

Browser Snapshot may capture:

1. Current URL.
2. Page title.
3. Capture timestamp.
4. Rendered document HTML from the live DOM.
5. Visible page text.
6. Current selection HTML and selection text, when a user selection exists.
7. Basic browser/page metadata.
8. Optional cleaned HTML for safer inspection/export.
9. Optional hashes for deduplication and diffing.

Browser Snapshot must not:

1. Automatically summarize the page.
2. Automatically infer relationships between apps, fields, JavaScript customizations, or plugins.
3. Automatically send captured content to any external AI or third-party service.
4. Capture secrets without redaction safeguards.
5. Modify the source kintone site or page.

## Conceptual flow

```text
Browser / WebView / Extension
        ↓
Capture Adapter
        ↓
Snapshot Builder
        ↓
Redaction / Cleaning Pipeline
        ↓
Local Snapshot Store
        ↓
Export / Preview / External Use
```

## Data model

```ts
type BrowserSnapshot = {
  id: string;
  url: string;
  title: string;
  capturedAt: string;

  html: string;
  text?: string;
  selectionHtml?: string;
  selectionText?: string;

  cleanedHtml?: string;
  sha256: string;

  source: "electron" | "chrome-extension" | "webview";
  metadata?: Record<string, unknown>;
};
```

For large HTML payloads, the preferred storage model is:

```text
browser-snapshots/
  {snapshotId}/
    snapshot.json
    page.html.gz
    cleaned.html.gz
    text.txt
```

The database should store indexable metadata, hashes, and file paths, not necessarily the full HTML payload.

## Storage table

```sql
CREATE TABLE browser_snapshots (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  captured_at TEXT NOT NULL,
  source TEXT NOT NULL,

  html_path TEXT,
  cleaned_html_path TEXT,
  text_path TEXT,

  sha256 TEXT NOT NULL,
  metadata_json TEXT
);
```

## Capture strategy

The baseline capture script should read from the rendered DOM, not only from the original server response.

```ts
function captureCurrentPage(): BrowserSnapshotPayload {
  const selection = window.getSelection();

  let selectionHtml = "";
  let selectionText = "";

  if (selection && selection.rangeCount > 0) {
    const container = document.createElement("div");
    for (let i = 0; i < selection.rangeCount; i++) {
      container.appendChild(selection.getRangeAt(i).cloneContents());
    }
    selectionHtml = container.innerHTML;
    selectionText = selection.toString();
  }

  return {
    url: location.href,
    title: document.title,
    capturedAt: new Date().toISOString(),
    html: document.documentElement.outerHTML,
    text: document.body?.innerText ?? "",
    selectionHtml,
    selectionText,
  };
}
```

## Redaction and cleaning

The app should provide a conservative cleaning pipeline before preview, export, or external handoff.

Recommended default removals:

- `script`
- `style`
- `noscript`
- `iframe`
- `canvas`
- high-risk `input` values
- token-like attributes
- secret-like attributes
- known credential fields

The raw snapshot may be stored locally only when the user has explicitly enabled raw capture. Cleaned output should be the default for preview and export.

## Security and consent

Browser Snapshot can contain sensitive data from kintone records, admin screens, plugin settings, hidden fields, cookies rendered into HTML, or user-entered form values.

The product should therefore provide:

1. Explicit user action before capture.
2. Clear capture preview.
3. Redaction before export.
4. Local-only default storage.
5. Optional auto-delete policy.
6. No automatic upload to external services.
7. No capture of credentials, tokens, or secrets into project files, logs, reports, developer files, review packages, or CLI output.

This aligns with the repository security principle that secrets must never be written into project files, logs, raw snapshots, normalized output, reports, developer files, review packages, or CLI stdout/stderr.

## MVP implementation

MVP should include:

1. Add a **Capture Current Page** action in the browser/webview area.
2. Capture URL, title, timestamp, rendered HTML, visible text, and selection when present.
3. Store the capture in the local snapshot folder.
4. Generate a hash for deduplication.
5. Display a preview before export or handoff.
6. Apply default redaction/cleaning for preview and export.
7. Keep the feature independent from AI-specific workflows.

## Suggested module layout

```text
src/features/browser-snapshot/
  capture/
  storage/
  cleaning/
  export/
  preview/
```

## Relationship to existing product principles

Browser Snapshot supports the existing product principle: pull data safely, store it locally as a complete snapshot, and make that snapshot easy to inspect.

It should be treated as an additional capture source. It does not change the MVP non-goals around built-in AI, chat, AI insights, deploying app settings, importing settings, or write-back to kintone.
