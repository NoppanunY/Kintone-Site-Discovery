# Browser Snapshot / HTML Capture

Status: `proposed`  
Created: 2026-07-19  
Decision owner: TBD  
Implementation commitment: none

## Problem

Some information available in the live browser DOM cannot be obtained completely through kintone REST APIs alone. Examples may include rendered page structure, runtime-generated content, plugin configuration pages, or user-selected sections of a page.

The project needs a neutral way to capture this browser content as reusable local data without coupling the capability to any particular downstream workflow.

## Proposed capability

Add a **Browser Snapshot** capability that captures the current browser page and stores it locally.

Recommended neutral naming:

- Feature: **Browser Snapshot**
- Action: **Capture Current Page**
- Technical capability: **HTML Capture** or **DOM Snapshot**
- Thai UI: **บันทึก snapshot ของหน้าเว็บ** or **ดึง HTML จากหน้านี้**

The application captures data only. It does not automatically describe, summarize, infer, rank, or send the captured content to another service.

Users may later use the captured output for manual inspection, debugging, archival, export, handoff to another tool, comparison, or any other workflow they choose.

## Candidate captured data

A snapshot may contain:

1. Current URL.
2. Page title.
3. Capture timestamp.
4. Rendered document HTML from the live DOM.
5. Visible page text.
6. Selected HTML and selected text when a user selection exists.
7. Basic browser and page metadata.
8. Optional cleaned HTML.
9. Optional hashes for deduplication and comparison.

## Scope boundaries

The capability should not:

1. Automatically summarize or interpret page content.
2. Infer relationships between apps, fields, JavaScript customizations, or plugins.
3. Automatically upload captured content to an external service.
4. Modify the source kintone page or application.
5. Store credentials, session tokens, cookies, password values, or other secrets.
6. Be treated as committed MVP scope until this idea is accepted and promoted into the main specifications.

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
Preview / Export / User-directed use
```

## Candidate data model

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

For large payloads, HTML should be stored as compressed files while the database stores searchable metadata, hashes, and file paths.

```text
browser-snapshots/
  {snapshotId}/
    snapshot.json
    page.html.gz
    cleaned.html.gz
    text.txt
```

## Candidate capture strategy

The baseline capture should read from the rendered DOM rather than only the original server response.

```ts
function captureCurrentPage() {
  const selection = window.getSelection();
  const container = document.createElement("div");

  if (selection) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      container.appendChild(selection.getRangeAt(index).cloneContents());
    }
  }

  return {
    url: location.href,
    title: document.title,
    capturedAt: new Date().toISOString(),
    html: document.documentElement.outerHTML,
    text: document.body?.innerText ?? "",
    selectionHtml: container.innerHTML,
    selectionText: selection?.toString() ?? "",
  };
}
```

Possible adapters:

- Electron `webContents` or an embedded webview when the page is opened inside the desktop application.
- A browser extension when capturing a page opened in an external Chrome or Edge browser.
- Chrome DevTools Protocol for development or advanced diagnostic workflows.

## Security and privacy constraints

Browser HTML can contain kintone record data, administrative settings, plugin configuration values, hidden form values, and other sensitive information.

A future implementation should therefore include:

1. An explicit user action before every capture.
2. A preview of the captured data.
3. Conservative redaction before export.
4. Local-only storage by default.
5. An optional retention or auto-delete policy.
6. No automatic upload to external services.
7. Secret detection and removal before writing project files, logs, reports, developer files, review packages, or CLI output.

Raw HTML storage should be opt-in if reliable redaction cannot be guaranteed.

## Potential implementation scope

A minimal implementation could:

1. Add a **Capture Current Page** action to the browser or webview area.
2. Capture URL, title, timestamp, rendered HTML, visible text, and current selection.
3. Generate a content hash.
4. Store the snapshot in the site's local snapshot folder.
5. Display a preview before export.
6. Apply default cleaning and redaction for preview and export.

Possible module layout:

```text
src/features/browser-snapshot/
  capture/
  storage/
  cleaning/
  preview/
  export/
```

## Relationship to the current product

This idea is compatible with the product principle of pulling data safely, storing it locally, and making it inspectable. It can be considered an additional capture source alongside REST API and browser/network collection.

It does not change the current non-goals concerning built-in AI, chat, automatic analysis, deploy, import, synchronization, or write-back to kintone.

## Open questions

1. Is the primary capture source the embedded application browser, an external browser extension, or both?
2. Should raw HTML be retained, or should only sanitized HTML be stored by default?
3. Should browser snapshots be part of the canonical site snapshot or a separate attachment collection?
4. Which page types are allowed or denied for capture?
5. How should snapshot size limits and retention be configured?
6. Is screenshot capture needed later, or should this idea remain HTML/text only?
7. Should browser snapshots participate in snapshot diff and Git evidence workflows?

## Decision record

No implementation decision has been made. This document preserves the idea for future evaluation.
