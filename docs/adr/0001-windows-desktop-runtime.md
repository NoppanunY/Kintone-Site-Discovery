# ADR 0001: Windows Desktop Runtime

## Status

Accepted for MVP 1 scaffold.

## Context

Kintone Site Discovery is a Windows desktop application first. The current React/Vite app is the renderer layer, not the product boundary. MVP 1 also needs local filesystem access, future OS keychain integration, local project folders, and a controlled browser/runtime capture path while preserving the read-only product boundary.

The first desktop batch must only establish the runtime shell and typed platform bridge stubs. It must not add real kintone calls, scan execution, snapshot storage, credential storage, CLI behavior, deploy/import/write-back, Git client behavior, AI, rollback, or safe deploy flows.

## Decision

Use Electron as the Windows desktop runtime for the MVP 1 desktop shell.

Electron will host the existing Vite renderer in a hardened `BrowserWindow` with:

- `contextIsolation: true`
- `nodeIntegration: false`
- a typed preload bridge
- no remote module usage
- production renderer loading through an app-owned protocol instead of direct `file://` path routing

The renderer remains a React/Vite app. Desktop-only capabilities are exposed only through narrow typed bridge methods.

## Rationale

- The existing UI is already React/Vite, so Electron gives the shortest path to a local Windows desktop app without moving the UI in this batch.
- Future browser-runtime capture and Playwright/Chromium-oriented verification align better with Electron than a WebView2-only shell.
- Electron's preload bridge gives a clear boundary between renderer UI and privileged desktop APIs.
- A custom production protocol avoids brittle `file://` behavior with the current path-based renderer routing.

## Alternatives Considered

- Tauri: smaller runtime footprint, but introduces Rust/MSVC setup and WebView2-specific behavior before the MVP UI shell is reviewed.
- Browser-only Vite app: useful for renderer development, but does not meet the Windows desktop product boundary.

## Consequences

- The packaged app will be larger than a WebView2/Tauri application.
- Security hardening must remain explicit because Electron adds privileged process boundaries.
- Packaging still needs a later decision for installer/signing/updater tooling. This ADR only chooses the runtime and scaffold loading model.
- Future local filesystem, OS keychain, and browser capture work must extend the typed bridge in small reviewed batches.
