# SCREEN_SPEC

Every screen in the MVP 1 hi-fi UI. Screen ids match the hi-fi file (`Kintone Site Discovery HiFi.dc.html`). Fields per screen: purpose · primary goal · sections · required data · primary/secondary actions · empty / loading / error / disabled states · confirmations · acceptance criteria.

Global product model (applies to all): the app **pulls from kintone → writes one complete local snapshot**. Reports and Developer Files are **views generated from the snapshot**. Read-only — no deploy/import/write-back. Secrets never render or persist to project files.

---

## SCR-01 · First-run onboarding wizard
- **Route:** `/onboarding`
- **Purpose:** Get a first-time user from install to a ready-to-scan site in one guided path.
- **Primary goal:** Create/open a project, choose an existing global auth profile or enter project-only auth, choose a site target, test that pairing, fetch apps.
- **Sections:** Stepper (5 steps); step body (Project / Auth profile / Site / Test / Apps); footer nav (Back · Continue).
- **Required data:** project name+folder; existing global auth profile or project-only auth draft username+password (→ keychain later); site name+domain; connection test result for the selected site+auth pair; app list count.
- **Primary actions:** Continue → (advance/validate); Finish → Go to site Overview.
- **Secondary actions:** Back; Browse folder; Cancel setup.
- **Empty:** N/A (wizard is the empty state of the app).
- **Loading:** Step 4 test shows per-check spinners (domain, credentials, read permission); Step 5 shows "Fetching apps…".
- **Error:** Test failure keeps user on Step 4 with plain-language reason (wrong password / bad domain / no network) + Retry; never advances on a broken connection.
- **Disabled:** Continue disabled until the current step's required fields are valid.
- **Confirmations:** Cancel setup → confirm discard of entered site (credentials already in keychain are kept or removed per choice).
- **Acceptance criteria:**
  - Password uses SecretField; never echoed, never written to project files.
  - Step 4 must pass before Step 5; failure blocks Continue.
  - Finish creates a Project that stores `siteId` plus either a selected global `authProfileId` or the project-only auth draft from the wizard, then routes to the Project overview with Run scan primary. No snapshot is created until the first scan writes a snapshot folder.
  - A project-only auth draft entered inside New Project does not appear in Home > Auth profiles. Standalone Add profile remains the path for creating a reusable global auth profile.
  - Re-runnable later to create another Project or add another reusable Site.

## SCR-02 · Project Home
- **Route:** `/` (Home tab)
- **Purpose:** Manage projects, global reusable auth profiles, and reusable site targets.
- **Primary goal:** Open a project; keep credentials and sites organized separately.
- **Sections:** Projects list; Sites list; Auth profiles list.
- **Required data:** recent projects (name, path, opened-at, linked site, selected auth profile); global profiles (name, username, credential status, linked-project count); sites (name, domain, saved status, usage count).
- **Primary actions:** New project; Open project; Add profile; Add site; Use site in new project.
- **Secondary actions:** Test profile; Edit; Forget credential; Remove from list; Open folder.
- **Empty:** No projects → large "Create your first project" CTA; empty profiles/sites → inline add prompt.
- **Loading:** Skeleton rows while reading local project index.
- **Error:** Project folder missing/moved → row shows "Folder not found" with Locate / Remove.
- **Disabled:** Open disabled for a project whose selected auth profile has a missing credential (tooltip: "Add a password to connect").
- **Confirmations:** Remove project/site (default = remove from app, keep files); "Move files to Trash" is a separate explicit confirm showing the path; Forget credential confirms.
- **Acceptance criteria:**
  - Passwords render as fixed `••••••`; no reveal anywhere.
  - Delete/remove never deletes local files unless the explicit trash confirm is used.
  - Profile shows linked project usage; site rows do not show auth because auth is selected by Projects.

## SCR-03 · Site Overview
- **Route:** `/site/:siteId/overview`
- **Purpose:** Status cockpit for one site; launch point for a scan and for snapshot views.
- **Primary goal:** See connection + snapshot status and Run scan.
- **Sections:** Header (project name, site name/domain, selected auth profile + status + actions); KPI row (apps available / in snapshot / plugins / redactions); Snapshot card; snapshot-model info banner.
- **Required data:** connection status; counts; last snapshot (status, captured-at, size, folder path).
- **Primary actions:** Run scan.
- **Secondary actions:** Test connection; Open Local Snapshot; View reports; Developer files; Open folder.
- **Empty:** Never scanned → Snapshot card shows "No snapshot yet — run a scan to create one"; KPIs show em-dash.
- **Loading:** Test connection shows inline spinner on the pill.
- **Error:** Disconnected → red pill "Can't connect" + Fix connection; last snapshot still shown (stale).
- **Disabled:** Run scan disabled while a scan is already running (shows "Scanning…").
- **Confirmations:** Run scan when a current snapshot exists → "Re-running creates a new snapshot and marks it as current. Older snapshots remain in History." (non-blocking inline note; hard confirm only if sensitive captures are armed — see SCR-07).
- **Acceptance criteria:**
  - Status label uses the fixed vocabulary; shows "Completed with warnings", never "completed · 2 warnings".
  - Snapshot is presented as the canonical object; Reports/Developer Files are described as generated from it.

## SCR-04 · Apps
- **Route:** `/site/:siteId/apps`
- **Purpose:** Choose which apps the next scan pulls into the snapshot.
- **Primary goal:** Find and multi-select apps.
- **Sections:** Header with count + freshness + actions; toolbar (search, space filter, select all, clear); app list; selection summary.
- **Required data:** apps (name, id, space/guest, has-plugins, has-customization, per-app snapshot status); list fetched-at.
- **Primary actions:** Continue to scan →.
- **Secondary actions:** Reload list; Search; Filter by space; Select all; Clear.
- **Empty:** No apps returned → "No apps visible to this account" + Reload + link to permissions help. Never fetched → "Fetch the app list to begin".
- **Loading:** "Fetching apps…" with skeleton rows.
- **Error:** Fetch failed (auth/network) → ErrorState with reason + Retry; keeps previous list if any (marked stale).
- **Disabled:** Continue disabled when 0 selected.
- **Confirmations:** none.
- **Acceptance criteria:**
  - Freshness shown as "App list fetched 2 hours ago · Reload".
  - Rows show friendly facts only — no JSON, hashes, or endpoints.
  - Per-app status uses: In snapshot / Not captured / Last scan: warning.

## SCR-05 · Scan Setup (presets)
- **Route:** `/site/:siteId/scan`
- **Purpose:** Pick capture scope via presets without a wall of checkboxes.
- **Primary goal:** Choose Quick / Standard / Full Discovery and start.
- **Sections:** Header (selected apps + freshness); read-only info banner; 3 preset cards; footer (Show advanced options · required note · Review & start).
- **Required data:** selected app count; current preset; freshness.
- **Primary actions:** Review & start → (or Configure › for Full Discovery).
- **Secondary actions:** Show advanced options; Reload app list.
- **Empty:** 0 apps selected → redirect/guard to Apps ("Select apps first").
- **Loading:** none (instant).
- **Error:** none here; surfaced during run.
- **Disabled:** Review & start disabled if 0 apps.
- **Confirmations:** Full Discovery / any sensitive item → routes through SCR-06 then SCR-07.
- **Acceptance criteria:**
  - Standard is pre-selected and labeled Recommended.
  - Quick = required only; Full Discovery is **not** one-click enable-all (opens Configure).
  - Read-only reassurance visible ("nothing written back to kintone").

## SCR-06 · Sensitive Options Configuration
- **Route:** `/site/:siteId/scan/advanced`
- **Purpose:** Fine-grained category control across the three tiers.
- **Primary goal:** Review/enable specific captures, understanding which are sensitive.
- **Sections:** Required tier (locked); Recommended tier (toggles); Additional/sensitive tier (toggles, off by default); footer (Back to presets · Confirm & start).
- **Required data:** category definitions with tier + sensitive flag + current on/off.
- **Primary actions:** Confirm & start →.
- **Secondary actions:** Back to presets; Hide.
- **Empty:** N/A.
- **Loading:** none.
- **Error:** none.
- **Disabled:** Required rows are locked-on (cannot toggle).
- **Confirmations:** If ≥1 sensitive item on → SCR-07 before run; else start directly.
- **Acceptance criteria:**
  - Required tier always checked + disabled.
  - Every additional item flagged "Sensitive" and off unless explicitly enabled.
  - Enabling a sensitive item arms the confirmation modal.

## SCR-07 · Sensitive Capture Confirmation Modal
- **Route:** modal over `/scan` (`/scan/confirm`)
- **Purpose:** Make sensitive capture an explicit, acknowledged choice.
- **Primary goal:** Confirm exactly what sensitive data will be captured, or back out.
- **Sections:** Warning header; list of armed sensitive captures; acknowledgment checkbox; footer (Cancel · Turn these off · Confirm & start scan).
- **Required data:** the list of enabled sensitive categories.
- **Primary actions:** Confirm & start scan (enabled only after acknowledgment).
- **Secondary actions:** Cancel (return to config); Turn these off (drop sensitive items, start safe scan).
- **Empty:** N/A — modal only exists when ≥1 sensitive item is armed.
- **Loading:** on confirm → transitions to SCR-08.
- **Error:** none (pre-run).
- **Disabled:** Confirm disabled until acknowledgment checked.
- **Confirmations:** this **is** the confirmation.
- **Acceptance criteria:**
  - Appears only when a sensitive capture is enabled; never for Quick/Standard.
  - Lists each sensitive category by name.
  - Confirm blocked until "I understand…" is checked.

## SCR-08 · Scan Running
- **Route:** `/site/:siteId/scan/run`
- **Purpose:** Show live progress of the pull building the snapshot.
- **Primary goal:** Monitor progress; cancel if needed.
- **Sections:** Header (running pill + current app/collector); overall progress bar; per-collector status list; partial-success info banner.
- **Required data:** overall %, current app index/total, current collector, per-collector statuses (Done/Running/Skipped/Queued).
- **Primary actions:** Cancel scan.
- **Secondary actions:** none (focus mode).
- **Empty:** N/A.
- **Loading:** this is the loading screen.
- **Error:** hard-stop (auth lost, unreachable, folder not writable, required collector failed) → SCR-11 Failed.
- **Disabled:** Cancel disabled during final write commit (brief).
- **Confirmations:** Cancel → "Cancel this scan? Partial data is kept but the snapshot won't be complete."
- **Acceptance criteria:**
  - Optional collector failures are shown as amber "Skipped" and do not stop the run.
  - Only a required-collector failure or hard-stop aborts.

## SCR-09 · Scan Completed
- **Route:** `/site/:siteId/scan/result` (status = completed)
- **Purpose:** Confirm a clean pull and route to snapshot views.
- **Primary goal:** View the reports generated from the new snapshot.
- **Sections:** Success banner; header + Completed pill; KPI row; required summary card; action row.
- **Required data:** duration, captured-at, apps/plugins/redactions counts, required N/N ok.
- **Primary actions:** View reports.
- **Secondary actions:** Open Local Snapshot; Developer files.
- **States:** empty/loading/error N/A (terminal success).
- **Disabled:** none.
- **Confirmations:** none.
- **Acceptance criteria:** Shown **only** when every required collector succeeded (0 required failures). Reports is the primary action; Developer Files de-emphasized.

## SCR-10 · Scan Completed with Warnings
- **Route:** `/site/:siteId/scan/result` (status = completed_with_warnings)
- **Purpose:** Confirm required data is complete while surfacing optional skips.
- **Primary goal:** Understand what was skipped; proceed or re-run skipped items.
- **Sections:** Warning banner; header + pill; KPI row (Required N/N ok · Optional skipped · Warnings); warnings list with per-item Retry; action row.
- **Required data:** required ok count, optional-skipped count, warning list (item + reason).
- **Primary actions:** View reports.
- **Secondary actions:** Open Local Snapshot; Re-run skipped; Retry item.
- **Acceptance criteria:**
  - All required collectors succeeded (else Failed).
  - Counts split as Required / Optional / Warnings — no mixed "ok/fail".
  - Status label exactly "Completed with warnings".

## SCR-11 · Scan Failed
- **Route:** `/site/:siteId/scan/result` (status = failed)
- **Purpose:** Communicate that the scan is not complete and how to recover, honestly.
- **Primary goal:** Fix the cause and retry.
- **Sections:** Danger banner; header + Failed pill; reason card (plain reason + partial-capture note); action row.
- **Required data:** reason (mapped error), elapsed, partial-capture summary.
- **Primary actions:** Retry scan.
- **Secondary actions:** Fix connection; Review partial scan summary.
- **Acceptance criteria:**
  - Never green — any required failure or hard-stop lands here even if optional collectors ran.
  - Reassures nothing was written back to kintone.
  - "Review partial scan summary" opens the report view; raw/internal stays behind Advanced Internal Data.
  - **OUTPUT_WRITE_FAILED copy:** "Partial results are not saved yet. Choose a writable folder to save them, or retry." (never claims data is safely kept in memory).

## SCR-12 · Local Snapshot
- **Route:** `/site/:siteId/snapshot`
- **Purpose:** Present the canonical local output as a first-class object.
- **Primary goal:** Understand what the snapshot contains and its integrity.
- **Sections:** Header + actions; snapshot-model banner; KPI row (size/apps/plugins/redactions); Contents list; integrity/manifest card.
- **Required data:** size, counts, contents breakdown, status, captured-at, manifest verification.
- **Primary actions:** Re-run scan.
- **Secondary actions:** Open folder; (implicitly) navigate to Reports/Developer Files.
- **Empty:** No snapshot → "No snapshot yet" with Run scan CTA.
- **Loading:** reading manifest → skeleton.
- **Error:** manifest missing/corrupt → red "Integrity check failed" + Re-run scan.
- **Disabled:** none.
- **Confirmations:** Re-run creates a new snapshot and marks it as current. Older snapshots remain in History (inline note).
- **Acceptance criteria:**
  - Framed as canonical; states that Reports + Developer Files are generated from it.
  - File-order metadata is stored here (manifest), not only in Developer Files.

## SCR-13 · Reports
- **Route:** `/site/:siteId/reports`
- **Purpose:** Primary admin output — readable summaries.
- **Primary goal:** Open a report.
- **Sections:** Header (generated-from note + Reveal folder); report list (title, description, up-to-date/stale, Open); regeneration info banner.
- **Required data:** report list with freshness vs snapshot.
- **Primary actions:** Open (report).
- **Secondary actions:** Reveal folder.
- **Empty:** No snapshot → "No reports yet — run a scan"; snapshot exists but reports not generated → "Generate reports".
- **Loading:** generating reports → progress.
- **Error:** report file missing → "Report not found — regenerate".
- **Disabled:** Open disabled on a stale report until regenerated (or offers Regenerate).
- **Acceptance criteria:**
  - Plain-language titles/descriptions; no technical jargon.
  - Freshness tied to snapshot (Up to date / Stale); reports regenerate from snapshot.

## SCR-14 · Developer Files
- **Route:** `/site/:siteId/developer-files`
- **Purpose:** Advanced/developer output — structured files + preserved-order customization.
- **Primary goal:** Open structured files or create a review package for handoff.
- **Sections:** Header (Advanced tag + generated-from note + actions); structured file list; customization FileOrderList; order-source info banner.
- **Required data:** file list (name, size, redaction status); per-app customization files with orderIndex/orderSource/confidence.
- **Primary actions:** Create review package.
- **Secondary actions:** Reveal folder; Open (file).
- **Empty:** No snapshot → "No files yet — run a scan".
- **Loading:** building package → progress.
- **Error:** package build failed (folder not writable) → same writable-folder guidance as OUTPUT_WRITE_FAILED.
- **Disabled:** Create review package disabled if snapshot empty.
- **Acceptance criteria:**
  - Labeled Advanced; monospace filenames.
  - "Create review package" (never export/import/deploy).
  - File order shown verbatim from snapshot, numbered, never re-sorted A–Z.

## SCR-15 · History
- **Route:** `/site/:siteId/history`
- **Purpose:** Record of past runs and what they produced.
- **Primary goal:** Reopen a run's reports/files or see why one failed.
- **Sections:** Header; run list (date, counts, status pill, actions; latest success tagged "Current snapshot").
- **Required data:** per run: timestamp, apps, required ok, optional skipped, warnings, redactions, status, produced artifacts.
- **Primary actions:** Reports (per row).
- **Secondary actions:** Files; View reason (failed rows).
- **Empty:** No runs → "No scans yet".
- **Loading:** skeleton rows.
- **Error:** run artifacts missing → "Artifacts removed" note.
- **Acceptance criteria:**
  - Counts split Required / Optional / Warnings; no "ok/fail" mixing.
  - Status uses the fixed vocabulary; current snapshot is marked.

## SCR-16 · Site Settings
- **Route:** `/site/:siteId/settings` (sub-tabs: general, authentication, scan-defaults, output, privacy)
- **Purpose:** Per-site configuration.
- **Primary goal:** Set scan defaults and connection/output preferences.
- **Sections:** Settings sub-nav; active panel (Scan defaults shown): default preset, default categories (Required locked; Recommended; sensitive off-by-default), Redaction locked-on; save bar.
- **Required data:** current settings values.
- **Primary actions:** Save changes.
- **Secondary actions:** Cancel; switch panel.
- **Empty:** N/A.
- **Loading:** save → inline spinner.
- **Error:** save failed → inline error, values retained.
- **Disabled:** Save disabled until a change is made; Required + Redaction controls disabled (locked).
- **Confirmations:** changing output folder with an existing snapshot → confirm (new scans write to new folder).
- **Acceptance criteria:**
  - Sensitive defaults explicitly state "Off by default" (Plugin assets; Sample records — "max 25 when enabled"; Full record export).
  - Redaction locked on; Required categories locked on.

## SCR-17 · Advanced Internal Data — warning gate
- **Route:** `/site/:siteId/advanced`
- **Purpose:** Gated, de-emphasized access to the machine-managed `.kintone/` folder for debugging.
- **Primary goal:** Open the internal folder only after acknowledging the risk.
- **Sections:** Muted title; danger warning banner; "What's inside" list; acknowledgment checkbox; Open action.
- **Required data:** internal folder inventory counts.
- **Primary actions:** Open .kintone folder (disabled until acknowledged).
- **Secondary actions:** none.
- **Empty:** No internal data yet → "Nothing here until you run a scan".
- **Loading:** none.
- **Error:** folder missing → "Internal folder not found".
- **Disabled:** Open disabled until the acknowledgment checkbox is checked.
- **Confirmations:** the acknowledgment gate is the confirmation.
- **Acceptance criteria:**
  - Warning reads: "This folder is machine-managed. Do not edit files manually."
  - Entry is visually de-emphasized (muted nav + title); nothing raw appears on primary screens.
  - Open enabled only after acknowledgment.
