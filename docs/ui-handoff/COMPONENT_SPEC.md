# COMPONENT_SPEC

Reusable components for Kintone Site Discovery MVP 1. Each: purpose · props · variants · states · example · accessibility. Names are stable contract names; styling comes from `DESIGN_TOKENS.md`. Build as a small internal library — no arbitrary one-off styling.

Convention: props in `TypeScript-ish` form. `on*` are callbacks. All interactive components are keyboard-operable and have visible focus (`0 0 0 3px --primary-ring`).

---

## AppShell
- **Purpose:** Top-level window frame: title bar + menu bar + tab bar + body (sidebar slot + content slot).
- **Props:** `projectName: string`, `tabs: TabModel[]`, `activeTabId: string`, `children: ReactNode` (active view), `onNewTab()`, `onCloseTab(id)`, `onSelectTab(id)`.
- **Variants:** `home` (no sidebar) · `site` (with SiteSidebar).
- **States:** normal; no-project (renders onboarding instead).
- **Example:** `<AppShell projectName="Client CRM" tabs={tabs} activeTabId="siteA">…</AppShell>`
- **A11y:** tab bar = ARIA `tablist`/`tab`/`tabpanel`; `Cmd/Ctrl+W` closes tab; menu bar reachable via `F10`/Alt.

## TopMenuBar
- **Purpose:** Secondary menu mirroring in-context actions + OS conventions.
- **Props:** `menus: {label, items:[{label,onSelect,disabled,shortcut}]}[]`.
- **Variants:** `mac` (in title area) · `windows/linux` (own row).
- **States:** enabled/disabled items; muted styling (it is secondary, never the only path).
- **A11y:** ARIA `menubar`; arrow-key navigation; every item duplicated by an in-context control.

## SiteTabBar
- **Purpose:** Home tab + one tab per open site + New tab.
- **Props:** `tabs`, `activeId`, `onSelect`, `onClose`, `onAdd`.
- **Variants:** default. Tab: `home` · `site` · `add`.
- **States:** active · inactive · hover · dirty (scan running → shows a running dot).
- **A11y:** `tablist`; close button has `aria-label="Close {siteName}"`; drag-reorder optional.

## SiteSidebar
- **Purpose:** Left nav within a site tab; encodes snapshot-first IA.
- **Props:** `active: NavKey`, `onNavigate(key)`, `snapshotStatus`, `hasAdvancedData`.
- **Groups:** Site (Overview, Apps, Scan) · Snapshot (Local Snapshot [source], Reports, Developer Files, History) · Configure (Settings, Advanced Internal Data [muted]).
- **Variants:** item `default` · `active` · `canonical` (Local Snapshot, with "source" tag) · `warn` (Advanced, muted).
- **States:** active, hover, disabled (a view with no data can be visited but shows its empty state).
- **A11y:** `nav` landmark; `aria-current="page"` on active; group labels via `role=group`+`aria-label`.

## StatusPill
- **Purpose:** Compact status label with the fixed vocabulary.
- **Props:** `status: 'ok'|'warn'|'err'|'info'|'idle'|'run'`, `label: string`, `dot?: boolean`.
- **Variants:** the 6 statuses (see tokens). Canonical labels: Completed(ok) · Completed with warnings(warn) · Failed(err) · Running(run) · Connected(ok) · Idle(idle) · Current snapshot(info).
- **States:** static (optional pulsing dot for `run`).
- **A11y:** color never sole signal — label text always present; `role="status"` when used for live updates.

## PrimaryActionButton
- **Purpose:** The one main action per screen.
- **Props:** `label`, `onClick`, `icon?`, `disabled?`, `loading?`, `size?: 'md'|'sm'`, `tone?: 'primary'|'danger'`.
- **Variants:** primary (default), danger (Cancel scan, destructive).
- **States:** default · hover · pressed · disabled (opacity .45) · loading (spinner + label).
- **A11y:** real `<button>`; `aria-busy` when loading; disabled conveys reason via tooltip/`aria-describedby`.

## SecondaryActionButton
- **Purpose:** Supporting actions.
- **Props:** same as Primary minus `tone`; adds `variant: 'secondary'|'ghost'`.
- **Variants:** secondary (bordered) · ghost (text).
- **States:** default · hover · disabled.
- **A11y:** same as above.

## ScanPresetCard
- **Purpose:** Selectable preset option (Quick / Standard / Full Discovery).
- **Props:** `title`, `description`, `selected`, `onSelect`, `badge?` ("Recommended"), `trailing?` (pill or "Configure ›" button), `opensConfig?: boolean`.
- **Variants:** `unselected` · `selected` (primary border + tint) · `full_discovery` (trailing "Configure ›", does not directly enable sensitive).
- **States:** default · hover · selected · focus.
- **A11y:** `radiogroup`/`radio` semantics across the three cards; `aria-checked`; arrow keys move selection.

## SensitiveOptionRow
- **Purpose:** A single capture category toggle within Sensitive Options Configuration or Settings.
- **Props:** `label`, `tier: 'required'|'recommended'|'additional'`, `sensitive?: boolean`, `value: boolean`, `onChange`, `locked?: boolean`, `meta?: string` ("Off by default", "max 25 when enabled").
- **Variants:** `locked` (required, filled+disabled) · `toggle` (recommended/additional) · `sensitive` (adds Sensitive pill).
- **States:** on · off · locked-on · disabled.
- **A11y:** `switch` role (or checkbox for locked); `aria-disabled` on locked; sensitive flag announced in the accessible name.

## ConfirmationModal
- **Purpose:** Generic gated confirm; used for Sensitive Capture Confirmation and destructive confirms.
- **Props:** `title`, `body`, `items?: string[]` (bulleted what-happens), `requireAck?: boolean`, `ackLabel?`, `confirmLabel`, `cancelLabel`, `tertiaryLabel?` ("Turn these off"), `tone: 'warn'|'danger'`, `onConfirm`, `onCancel`, `onTertiary?`.
- **Variants:** `sensitive-capture` (requireAck=true, items list) · `destructive` (danger tone) · `info-confirm`.
- **States:** confirm disabled until `requireAck` satisfied; loading on confirm.
- **A11y:** focus-trapped `role="dialog"` `aria-modal`; Esc = cancel; initial focus on body/first control; confirm re-enabled announcement.

## SnapshotCard
- **Purpose:** Summarize the canonical local snapshot (Overview + Local Snapshot).
- **Props:** `status`, `capturedAt`, `sizeOnDisk`, `folderPath`, `counts:{apps,plugins,redactions}`, `onOpenSnapshot`, `onOpenFolder`.
- **Variants:** `overview` (compact) · `full` (with Contents + integrity).
- **States:** populated · empty (no snapshot) · stale (older than a newer failed attempt) · integrity_error.
- **A11y:** headings for structure; folder path in a `<code>`; status pill labeled.

## ReportListItem
- **Purpose:** A generated report row.
- **Props:** `title`, `description`, `freshness: 'up_to_date'|'stale'`, `onOpen`, `onRegenerate?`.
- **Variants:** default · stale (offers Regenerate).
- **States:** up_to_date · stale · missing (regenerate) · opening.
- **A11y:** row is a link/button labeled by title; freshness in accessible name.

## DeveloperFileList
- **Purpose:** List of structured/developer files generated from the snapshot.
- **Props:** `files: {name, size, redacted?}[]`, `onOpen(name)`, `onReveal()`.
- **Variants:** default. File row shows mono name + size + optional Redacted pill.
- **States:** populated · empty · building-package.
- **A11y:** filenames in `<code>`; Redacted status in accessible name; list semantics.

## FileOrderList
- **Purpose:** Show customization JS/CSS in preserved execution order.
- **Props:** `files: {index, name, orderSource, confidence}[]`.
- **Variants:** JS · CSS (grouped headers).
- **States:** default. Never re-sortable A–Z (order is data, from the snapshot manifest).
- **A11y:** ordered list `<ol>`; each item announces "position N, {name}, order source {x}, confidence {y}".
- **Contract:** consumes order metadata stored in the snapshot; does not compute order itself.

## EmptyState
- **Purpose:** Friendly zero-data placeholder.
- **Props:** `icon`, `title`, `body`, `actionLabel?`, `onAction?`.
- **Variants:** `first-run` (big CTA) · `inline` (within a list/card).
- **States:** static.
- **A11y:** heading + description; action is a real button.

## ErrorState
- **Purpose:** Plain-language error with recovery, backed by the error taxonomy.
- **Props:** `code?: string` (small, for support), `title`, `body`, `actions: Button[]`, `tone:'warn'|'danger'`.
- **Variants:** inline (within content) · full (whole content area) · banner.
- **States:** static.
- **A11y:** `role="alert"` for critical; code de-emphasized and not the headline; actions focusable.
- **Contract:** headline is human copy; the raw code (e.g. OUTPUT_WRITE_FAILED) appears only as a small pill.

## SecretField
- **Purpose:** Password entry that is write-only.
- **Props:** `label`, `hasStoredSecret: boolean`, `onSet(value)`, `onForget?()`.
- **Variants:** empty (no credential) · stored (renders fixed `••••••`, offers Replace/Forget).
- **States:** empty · stored · saving.
- **A11y:** `<input type=password>` for entry; when stored, shows non-editable masked indicator (not a real password input bound to a value).
- **Contract:** value goes only to OS keychain; component never exposes a getter, never writes to project files, has no reveal control.

## FolderPickerRow
- **Purpose:** Choose/display a local folder.
- **Props:** `label`, `path`, `onBrowse()`, `writable?: boolean`.
- **Variants:** default · not-writable (warns).
- **States:** empty · chosen · not-writable (inline warning + fix).
- **A11y:** path readable; Browse is a labeled button; writability announced.

## WarningBanner
- **Purpose:** Inline contextual warning/info/success/danger banner.
- **Props:** `tone:'info'|'ok'|'warn'|'danger'`, `icon?`, `children`, `dismissible?`.
- **Variants:** info · ok · warn · danger (see tokens).
- **States:** static · dismissible.
- **A11y:** `role="status"` (info/ok) or `role="alert"` (warn/danger); icon is decorative (`aria-hidden`).

---

## Shared behaviors
- **Focus ring:** every interactive element uses `--primary-ring`.
- **Disabled reason:** disabled primary buttons expose why via tooltip/`aria-describedby`.
- **Status vocabulary:** only StatusPill renders result status, guaranteeing the fixed strings everywhere.
- **No secret rendering:** only SecretField touches credentials; nothing else accepts or displays a password value.
