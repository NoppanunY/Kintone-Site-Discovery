# UI_IMPLEMENTATION_SPEC

Implementation-ready UX/UI handoff for **Kintone Site Discovery — MVP 1**. The sibling markdown specs in this folder are the Codex source of truth. The reviewed hi-fi HTML/design artifact is a visual reference only; it must not override these specs.

## 1. Product model (read this first)
The core product is one loop:

> **Pull from kintone → write one complete local snapshot.**

- The **local snapshot is the canonical output.** It is a first-class object in the UI (SCR-12), with contents, size, capture time and integrity.
- **Reports** (SCR-13, primary/admin) and **Developer Files** (SCR-14, advanced) are **views generated from the snapshot** — not separate core workflows. They regenerate when the snapshot changes.
- **File-order metadata** (JS/CSS execution order: `orderIndex`, `orderSource`, `confidence`) is **stored in the snapshot manifest** and merely displayed by Developer Files — never computed at display time, never re-sorted A–Z.

## 2. Hard constraints (must hold in every screen)
1. **Read-only.** No deploy, import, publish, push, sync-to-kintone, apply, restore, or rollback. No Git client, no AI. Nothing is ever written back to kintone.
2. **Secrets never render or persist to project files.** Passwords go only to the OS keychain via `SecretField`; UI shows fixed `••••••`, no reveal.
3. **Required scan categories are checked and disabled** (locked on). **Redaction is locked on** for MVP 1.
4. **Sensitive captures are opt-in and off by default** (plugin assets, sample records, full record export, comments/attachments, screenshots) and require the **confirmation modal** with acknowledgment.
5. **Full Discovery is not one-click enable-all** → Configure sensitive options → Confirm.
6. **Status vocabulary is fixed:** Completed / Completed with warnings / Failed. Never show green when a required collector failed. Split counts Required/Optional/Warnings.
7. **Advanced Internal Data is de-emphasized and warning-gated.**

## 3. Information architecture
Two levels. Global (Home tab) + per-site tabs; inside a site tab, the SiteSidebar:
- **Site:** Overview · Apps · Scan
- **Snapshot:** Local Snapshot *(source)* · Reports · Developer Files · History
- **Configure:** Settings · Advanced Internal Data *(muted)*

The menu bar is **secondary** — it mirrors in-context actions and OS conventions; it is never the only path to an action.

Naming: "Exports" is renamed **Developer Files** (a.k.a. Structured Files). "Export package" is renamed **Create review package**.

## 4. Screen inventory (17)
Onboarding wizard (SCR-01) · Project Home (02) · Site Overview (03) · Apps (04) · Scan Setup (05) · Sensitive Options Configuration (06) · Sensitive Capture Confirmation Modal (07) · Scan Running (08) · Scan Completed (09) · Completed with Warnings (10) · Scan Failed (11) · Local Snapshot (12) · Reports (13) · Developer Files (14) · History (15) · Site Settings (16) · Advanced Internal Data gate (17). Full detail in `SCREEN_SPEC.md`.

## 5. Layout system
- **Window:** 1240px reference width, radius `--r-xl`, `--sh-lg`. Rows: title bar (38) · menu bar (32) · site tabs (42) · body.
- **Body:** SiteSidebar 216px fixed + content (scroll).
- **Page:** padding 22–26; vertical stack gap 18; page header = breadcrumb + `h-display` + subtitle on the left, primary/secondary actions on the right.
- **Cards & lists:** `--surface` on `--surface-2` content bg; radius `--r-lg`; hairline `--border`.
- **KPI row:** 3–4 equal columns of KPI cells.
- Density is comfortable, not cramped; primary action always visible without scrolling on the page header.

## 6. Deliverable map
- `SCREEN_SPEC.md` — per-screen: purpose, goal, sections, data, actions, all states, confirmations, acceptance criteria.
- `COMPONENT_SPEC.md` — 19 components: props, variants, states, examples, a11y.
- `ROUTING_SPEC.md` — routes, guards, tab/persistence model.
- `STATE_MATRIX.md` — states + transitions for 10 entities.
- `UX_COPY_SPEC.md` — all copy incl. fixed status strings, errors, confirmations.
- `DESIGN_TOKENS.md` — type, spacing, radius, shadow, semantic + status colors, button/form/list styles.
- `Kintone Site Discovery HiFi.dc.html` — the annotated hi-fi reference (open it; every screen carries its id + route).

## 7. Accessibility baseline
- All interactive elements keyboard-operable with visible focus (`--primary-ring`).
- Color is never the only signal — StatusPill always carries a text label; banners set `role=status|alert`.
- Modals are focus-trapped `role="dialog" aria-modal`; Esc cancels; confirm disabled until acknowledgment where required.
- Sidebar `nav` with `aria-current`; tab bar as ARIA tablist.
- Target size ≥ 36px for primary controls.

## 8. Build notes
- Implement the token set once (CSS variables or theme object) and build the 19 components on it; **no one-off styling**.
- Route status rendering through `StatusPill` so the fixed vocabulary can't drift.
- Route all credential handling through `SecretField`; no other component accepts a password value.
- The scan engine decides result status (Completed / with-warnings / Failed) from required-vs-optional outcomes; the UI only renders it.
- Reports and Developer Files read from the snapshot manifest; regenerate on snapshot change; show freshness (Up to date / Stale).

## 9. Resolved MVP decisions
1. **Report viewing:** open reports in the OS-default markdown app. No in-app rendered report viewer in MVP 1.
2. **Apps at scale:** support at least 500 apps with search/filter and virtualization or pagination. Search/filter applies to the full app list.
3. **Concurrency:** only one active scan at a time across the whole desktop app.
4. **Platform wording:** UI copy must be cross-platform unless platform-specific code branches are explicit. Use `Reveal folder` or `Open local folder`, not `Open folder in Finder`.
5. **Localization:** English UI first. Structure copy for future i18n; do not concatenate hardcoded sentence fragments.
6. **Preset mapping:** implement preset/category mapping as constants, with tests. Full Discovery routes to sensitive options instead of enabling sensitive capture directly.
7. **Review package:** create a zip containing current snapshot `manifest.json`, `reports/`, `developer-files/`, `redaction-log.jsonl`, and `README.md`. The package is a read-only review artifact, not an import/deploy package.
