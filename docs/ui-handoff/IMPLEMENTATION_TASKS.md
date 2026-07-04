# IMPLEMENTATION_TASKS

Codex-ready build plan for Kintone Site Discovery MVP 1, in dependency order. Read-only product — no task implements deploy, import, write-back, Git, AI, rollback, or safe deploy. Each task: **files** · **components** · **data/view model** · **acceptance criteria** · **do NOT yet**.

References: `DATA_CONTRACT.md`, `VIEW_MODEL_SPEC.md`, `COMPONENT_SPEC.md`, `SCREEN_SPEC.md`, `ROUTING_SPEC.md`, `STATE_MATRIX.md`, `UX_COPY_SPEC.md`, `DESIGN_TOKENS.md`, `SNAPSHOT_STORAGE_SPEC.md`.

## Resolved MVP decisions (apply everywhere)
1. **Report viewer:** open reports in the **OS-default markdown app** for MVP. No in-app rendered viewer yet.
2. **App scale:** support **≥ 500 apps** with search + filter and **virtualization or pagination** on the Apps list. Search/filter run over the full set.
3. **Concurrency:** **one active scan at a time** across the whole app. Starting a scan disables Run/Start on all sites until it finishes.
4. **Localization:** **English UI first.** Structure copy for later i18n (Japanese/Thai) — no hardcoded concatenated sentences — but ship English only.
5. **Review package:** a **zip** containing the current snapshot `manifest.json`, `reports/`, `developer-files/`, `redaction-log.jsonl`, and a `README.md` (read-only review artifact; not for import/deploy).

---

## T0 · Design tokens
- **Files:** `src/theme/tokens.css` (or `tokens.ts`), `src/theme/global.css`.
- **Components:** none.
- **Data/VM:** none.
- **Acceptance:** all tokens from `DESIGN_TOKENS.md` defined once (type scale, spacing, radius, shadow, semantic + status colors, button/form/list styles); no other file hardcodes a hex/size. Fonts loaded (IBM Plex Sans + Mono).
- **Do NOT yet:** per-screen styling.

## T1 · Component library
- **Files:** `src/components/*` (one per component), `src/components/index.ts`.
- **Components:** all 19 in `COMPONENT_SPEC.md` — AppShell, TopMenuBar, SiteTabBar, SiteSidebar, StatusPill, PrimaryActionButton, SecondaryActionButton, ScanPresetCard, SensitiveOptionRow, ConfirmationModal, SnapshotCard, ReportListItem, DeveloperFileList, FileOrderList, EmptyState, ErrorState, SecretField, FolderPickerRow, WarningBanner.
- **Data/VM:** component prop types reference `DATA_CONTRACT.md`.
- **Acceptance:** each component matches its spec (props, variants, states, a11y); StatusPill only renders the fixed vocabulary; SecretField exposes no value getter and no reveal; keyboard focus visible on all. Build a Storybook/gallery page.
- **Do NOT yet:** wire to real data or routing.

## T2 · App shell
- **Files:** `src/app/AppShell.tsx`, `src/app/TabHost.tsx`, `src/app/menuConfig.ts`.
- **Components:** AppShell, TopMenuBar, SiteTabBar, SiteSidebar.
- **Data/VM:** `ShellVM`.
- **Acceptance:** title bar + secondary menu bar + tab bar + body render; Home tab + site tabs + New tab; snapshot-first sidebar groups (Site / Snapshot[source] / Configure) with Advanced muted; tab + active-view persistence across restart; menu items mirror in-context actions.
- **Do NOT yet:** real site content (use placeholders); drag-reorder tabs (optional later).

## T3 · Routing
- **Files:** `src/router/routes.ts`, `src/router/guards.ts`.
- **Components:** none (wires views).
- **Data/VM:** none.
- **Acceptance:** all routes from `ROUTING_SPEC.md`; guards enforced (site exists; `/scan/*` needs ≥1 app; `/scan/confirm` only when sensitive armed; result status decided by engine; advanced gate). Persist last sub-route per tab.
- **Do NOT yet:** deep-link URLs externally; multi-window.

## T4 · Onboarding
- **Files:** `src/screens/onboarding/*`.
- **Components:** SecretField, FolderPickerRow, PrimaryActionButton, ConfirmationModal, WarningBanner, ErrorState.
- **Data/VM:** `OnboardingVM`.
- **Acceptance:** 5 steps; Step 4 blocks until all 3 checks pass; Finish creates AuthProfile + SiteWorkspace + fetched app list and routes to Overview; no snapshot exists until the first successful or partial scan writes one; password only to keychain; re-runnable to add a site.
- **Do NOT yet:** multiple sites in one wizard pass; SSO/API-token auth (password only).

## T5 · Project Home
- **Files:** `src/screens/home/*`, `src/services/projectStore.ts`, `src/services/keychain.ts`, `src/services/authProfiles.ts`.
- **Components:** list rows, StatusPill, SecretField, ConfirmationModal, EmptyState.
- **Data/VM:** `ProjectHomeVM` (Project, AuthProfile, SiteWorkspace, SnapshotSummary).
- **Acceptance:** create/open project writes `project.json` per `SNAPSHOT_STORAGE_SPEC`; profiles show credentialStatus, never secrets; delete = remove-from-app (files kept) with separate trash confirm; Open-site disabled when credential missing.
- **Do NOT yet:** import/export project; move files to trash beyond the guarded confirm.

## T6 · Site Overview
- **Files:** `src/screens/overview/*`, `src/services/connection.ts`.
- **Components:** SnapshotCard(overview), StatusPill, PrimaryActionButton, WarningBanner, EmptyState.
- **Data/VM:** `OverviewVM`.
- **Acceptance:** connection status + counts + current snapshot (or empty state); Run scan primary and disabled while any scan runs (global single-scan rule); snapshot-model info banner present.
- **Do NOT yet:** inline scan config (that's Scan Setup).

## T7 · Apps
- **Files:** `src/screens/apps/*`, `src/services/appList.ts`, `src/components/VirtualList.tsx`.
- **Components:** search/filter toolbar, checkbox rows, StatusPill, EmptyState, ErrorState.
- **Data/VM:** `AppsVM`.
- **Acceptance:** handles ≥500 apps via virtualization/pagination; search + space filter over full set; select all visible / clear; freshness label + Reload; per-app capture status; Continue disabled at 0 selected.
- **Do NOT yet:** per-app deep config; column customization.

## T8 · Scan Setup
- **Files:** `src/screens/scan/ScanSetup.tsx`, `src/domain/presets.ts`, `src/domain/categories.ts`.
- **Components:** ScanPresetCard (radiogroup), PrimaryActionButton, WarningBanner.
- **Data/VM:** `ScanSetupVM` (ScanPreset, CaptureCategory).
- **Acceptance:** three presets; Standard pre-selected/Recommended; Quick=required only; Full Discovery opens Configure (not one-click enable-all); read-only reassurance; Start disabled at 0 apps.
- **Do NOT yet:** custom saved presets per site (later).

## T9 · Sensitive Options + Confirmation
- **Files:** `src/screens/scan/SensitiveOptions.tsx`, `src/screens/scan/SensitiveConfirmModal.tsx`.
- **Components:** SensitiveOptionRow, ConfirmationModal, PrimaryActionButton.
- **Data/VM:** `SensitiveOptionsVM`, `SensitiveConfirmVM` (CaptureCategory, SensitiveCaptureOption).
- **Acceptance:** required tier locked-on; recommended toggles; sensitive off by default + flagged; enabling any sensitive item arms the modal; modal lists armed items, Confirm disabled until acknowledgment; "Turn these off" drops sensitive + starts safe scan; modal never appears for Quick/Standard with no sensitive armed.
- **Do NOT yet:** per-category typed confirmations (single ack is MVP).

## T10 · Scan Running + Result states
- **Files:** `src/screens/scan/ScanRunning.tsx`, `src/screens/scan/ScanResult.tsx`, `src/services/scanEngine.ts`, `src/services/snapshotWriter.ts`.
- **Components:** progress, collector list, StatusPill, WarningBanner, ErrorState, PrimaryActionButton.
- **Data/VM:** `ScanRunningVM`, `ScanResultCompletedVM`, `ScanResultWarningsVM`, `ScanResultFailedVM` (ScanRun, ScanResult, CollectorResult, ErrorStateModel).
- **Acceptance:**
  - Single active scan enforced globally.
  - Optional collector failure ⇒ skipped + warning, run continues; only required failure / hard-stop ⇒ Failed.
  - Result status computed by engine: `completed` only when `requiredOk===requiredTotal`; never green on required failure.
  - Success/warnings write a new timestamped snapshot and update `current.json` (append-only; prior snapshots kept) per `SNAPSHOT_STORAGE_SPEC`.
  - Failed/partial writes partial snapshot + `partial-summary.md`; OUTPUT_WRITE_FAILED uses fixed copy and persists nothing.
  - Cancel confirm; counts split Required/Optional/Warnings.
- **Do NOT yet:** background/queued multiple scans; retry-individual-collector beyond re-run skipped (implement re-run skipped; per-item retry may stub to that).

## T11 · Local Snapshot
- **Files:** `src/screens/snapshot/*`, `src/services/snapshotReader.ts`, `src/services/integrity.ts`.
- **Components:** SnapshotCard(full), FileOrderList, StatusPill, WarningBanner, EmptyState, ErrorState.
- **Data/VM:** `LocalSnapshotVM` (SnapshotManifest, SnapshotSummary, FileOrderItem).
- **Acceptance:** presents snapshot as canonical (contents, size, integrity, manifest path); reads file order from manifest; integrity failure ⇒ error + Re-run; empty state when none.
- **Do NOT yet:** snapshot diffing/compare between snapshots.

## T12 · Reports
- **Files:** `src/screens/reports/*`, `src/services/reportGenerator.ts`.
- **Components:** ReportListItem, WarningBanner, EmptyState, ErrorState.
- **Data/VM:** `ReportsVM` (ReportItem).
- **Acceptance:** lists current snapshot's reports with freshness; **Open uses OS-default markdown app**; Regenerate when stale/missing; Reveal folder; regenerates from snapshot.
- **Do NOT yet:** in-app markdown rendering/preview; report editing.

## T13 · Developer Files
- **Files:** `src/screens/developer-files/*`, `src/services/reviewPackage.ts`.
- **Components:** DeveloperFileList, FileOrderList, PrimaryActionButton, WarningBanner, EmptyState, ErrorState.
- **Data/VM:** `DeveloperFilesVM` (DeveloperFileItem, FileOrderItem).
- **Acceptance:** Advanced-labeled; mono filenames; file order rendered verbatim by `orderIndex`, never A–Z; **Create review package** builds the zip (manifest + reports + developer-files + redaction-log + README) to a writable folder; write failure uses the writable-folder guidance.
- **Do NOT yet:** any "export to kintone"/import; selective/partial packaging (package = whole current snapshot).

## T14 · History
- **Files:** `src/screens/history/*`, `src/services/historyStore.ts`.
- **Components:** list rows, StatusPill, ConfirmationModal.
- **Data/VM:** `HistoryVM` (SnapshotSummary).
- **Acceptance:** lists all runs from `history.json` with split counts + fixed status labels; current snapshot tagged; open reports/files per run; failed rows show reason; delete-snapshot is explicit and keeps the history row (artifacts marked unavailable).
- **Do NOT yet:** bulk delete; cross-site history.

## T15 · Site Settings
- **Files:** `src/screens/settings/*`.
- **Components:** settings sub-nav, SensitiveOptionRow, FolderPickerRow, PrimaryActionButton.
- **Data/VM:** `SiteSettingsVM`.
- **Acceptance:** 5 panels (general/auth/scan_defaults/output/privacy); Required categories + Redaction rendered locked-on; sensitive defaults show "Off by default" (Sample records "· max 25 when enabled"); Save disabled until dirty; output-folder writability shown.
- **Do NOT yet:** project-level settings screen; auth-type switching.

## T16 · Advanced Internal Data gate
- **Files:** `src/screens/advanced/*`.
- **Components:** WarningBanner(danger), inline acknowledgment checkbox, SecondaryActionButton.
- **Data/VM:** `AdvancedDataVM`.
- **Acceptance:** de-emphasized (muted nav + title); danger warning "This folder is machine-managed. Do not edit files manually."; inventory counts; Open .kintone folder disabled until acknowledgment; nothing raw leaks to primary screens.
- **Do NOT yet:** in-app raw data browser/editor.

---

## Cross-cutting acceptance (all tasks)
- No secret is ever rendered, logged, or written to a project file.
- Result status uses only Completed / Completed with warnings / Failed; counts split Required/Optional/Warnings.
- Snapshots are append-only; "current" is a pointer; re-run creates a new snapshot and marks it current (never silently deletes prior ones).
- All copy from `UX_COPY_SPEC.md`; forbidden write-back verbs never appear.
- One active scan at a time; Apps scales to 500+; reports open in OS-default app; English-only UI (i18n-ready structure).

## Explicitly out of scope for MVP 1
Deploy / publish / import / push / sync-to-kintone / apply / restore / rollback / safe-deploy; Git client; AI features; in-app markdown viewer; snapshot diffing; multi-scan concurrency; SSO/API-token auth; Japanese/Thai localization (structure only).
