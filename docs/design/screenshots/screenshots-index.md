# Screenshots Index — Kintone Site Discovery (MVP 1, high-fidelity)

Implementation reference images. Visual source of truth: `../Kintone-Site-Discovery-HiFi.html` (open it and pan/zoom; every screen carries its SCR-id + route). Screenshots are exported from that file at a consistent 1240px desktop app frame and a uniform zoom. Read-only product — no deploy / import / write-back / Git / AI / rollback anywhere.

Global frame present in every screenshot: **title bar → secondary menu bar (Project · Account · Site · Scan · Snapshot · Window · Help) → site tab bar (Home + site tabs + New tab) → left SiteSidebar → content area**. Sidebar groups: **Site** (Overview · Apps · Scan) · **Snapshot** (Local Snapshot _source_ · Reports · Developer Files · History) · **Configure** (Settings · Advanced Internal Data, muted). Status labels are exactly **Completed / Completed with warnings / Failed**.

| # | File | Screen | Route |
|---|---|---|---|
| 01 | `SCR-01-onboarding.png` | First-run onboarding wizard | `/onboarding` |
| 02 | `SCR-02-project-home.png` | Project Home | `/` (Home tab) |
| 03 | `SCR-03-site-overview.png` | Site Overview | `/site/:siteId/overview` |
| 04 | `SCR-04-apps.png` | Apps | `/site/:siteId/apps` |
| 05 | `SCR-05-scan-setup.png` | Scan Setup / Choose scan preset | `/site/:siteId/scan` |
| 06 | `SCR-06-sensitive-options.png` | Sensitive Options Configuration | `/site/:siteId/scan/advanced` |
| 07 | `SCR-07-sensitive-confirmation.png` | Sensitive Capture Confirmation Modal | modal over `/site/:siteId/scan` |
| 08 | `SCR-08-scan-running.png` | Scan Running | `/site/:siteId/scan/run` |
| 09 | `SCR-09-scan-completed.png` | Scan Completed | `/site/:siteId/scan/result` |
| 10 | `SCR-10-completed-with-warnings.png` | Scan Completed with Warnings | `/site/:siteId/scan/result` |
| 11 | `SCR-11-scan-failed.png` | Scan Failed | `/site/:siteId/scan/result` |
| 12 | `SCR-12-local-snapshot.png` | Local Snapshot | `/site/:siteId/snapshot` |
| 13 | `SCR-13-reports.png` | Reports | `/site/:siteId/reports` |
| 14 | `SCR-14-developer-files.png` | Developer Files | `/site/:siteId/developer-files` |
| 15 | `SCR-15-history.png` | History | `/site/:siteId/history` |
| 16 | `SCR-16-settings.png` | Site Settings | `/site/:siteId/settings` |
| 17 | `SCR-17-advanced-internal-data.png` | Advanced Internal Data warning gate | `/site/:siteId/advanced` |

---

## SCR-01 · First-run onboarding wizard
- **Description:** Guided 5-step first-run setup, showing Step 3 (Site) active with Steps 1–2 done. Ends on Site Overview.
- **Match:** centered card on `--surface-2`; 5-dot **stepper** (Project ✓ · Sign-in ✓ · Site ● · Test · Apps); form fields (Site display name, kintone domain + hint, Save snapshot to + Browse…); footer `← Back` / "Step 3 of 5" / **Continue →** (primary). Title bar visible; no site tabs/sidebar (wizard owns the window).

## SCR-02 · Project Home
- **Description:** Home tab. Projects, Auth profiles, Site workspaces.
- **Match:** Home tab active in tab bar; page H1 "Projects" + **New project** primary; recent-project rows (folder icon, name, mono path, Open); Auth profiles rows with StatusPill (Credential saved / Needs update), "Used by N sites", masked `••••••`; Site workspaces rows with Connected/Idle pills + **Open** primary.

## SCR-03 · Site Overview
- **Description:** Site cockpit — connection + snapshot status, primary Run scan.
- **Match:** sidebar Overview active; header status pill **Connected** + Test connection + **◎ Run scan** (primary); 4 KPI cells (Apps available / Apps in snapshot / Plugins / Redactions); Local snapshot card with **Completed with warnings** pill, captured/size/folder; action row (Open Local Snapshot, View reports, Developer files); info banner "snapshot is canonical…".

## SCR-04 · Apps
- **Description:** App selection for the next scan; friendly facts only.
- **Match:** sidebar Apps active; header "Apps" + "18 apps · 4 selected · app list fetched 2 hours ago" + Reload + **Continue to scan →**; toolbar (search input, Space filter, Select all, Clear); list rows with checkboxes, app name, `ID · Space · has plugins/customization`, StatusPill (In snapshot / Not captured / Last scan: warning); footer "4 of 18 selected".

## SCR-05 · Scan Setup / Choose scan preset
- **Description:** Preset chooser (Quick / Standard / Full Discovery). Standard selected.
- **Match:** sidebar Scan active; info banner "read-only · required categories always included"; 3 preset cards — Quick (Required only pill), **Standard selected** (primary border/tint + Recommended pill + checked), Full Discovery (has **Configure ›** button, not one-click enable-all); footer "▾ Show advanced options" + "17 required · always on 🔒" + **Review & start →**.

## SCR-06 · Sensitive Options Configuration
- **Description:** Three-tier category control reached from Full Discovery / advanced.
- **Match:** header "Configure sensitive options" + Hide; **Required** card (pill + locked checkbox 🔒, disabled, category list); **Recommended** card (toggles ON); **Additional · sensitive** card ("Off by default"; each row a toggle + **Sensitive** pill; two shown ON to arm confirmation); footer `← Back to presets` + **Confirm & start →**.

## SCR-07 · Sensitive Capture Confirmation Modal
- **Description:** Confirmation modal shown **over the Scan Setup / Configure screen** (underlying screen dimmed by scrim). Appears only when a sensitive capture is armed.
- **Match:** full app frame behind, dimmed by `--overlay` scrim; centered 520px modal — warning ⚠ header "Confirm sensitive capture" + body; "Will be captured" list (Plugin assets; Sample records — redacted · max 25, both checked); **acknowledgment checkbox** "I understand these outputs may contain sensitive data." (unchecked); footer `Cancel` · `Turn these off` · **Confirm & start scan** (disabled until acknowledged).

## SCR-08 · Scan Running
- **Description:** Live per-collector progress building the snapshot; cancelable; partial-success friendly.
- **Match:** header "Scanning…" + **Running** pill + "App 3 of 4 · Support Tickets" + **Cancel scan** (danger); overall progress bar 62%; collector list with StatusPills Done / Running / **Skipped** (amber, optional) / Queued; info banner "optional failures skipped, only required stops the run".

## SCR-09 · Scan Completed
- **Description:** Green result — shown only when every required collector succeeded.
- **Match:** green **Completed** banner "All required data captured…"; header + **Completed** pill; 3 KPIs (Apps / Plugins / Redactions); summary card "Required: 69/69 ok…"; actions **View reports** (primary) · Open Local Snapshot · Developer files (ghost).

## SCR-10 · Scan Completed with Warnings
- **Description:** Amber result — required complete, optional collectors skipped.
- **Match:** amber **Completed with warnings** banner; header + warn pill; KPIs split **Required 68/68 · Optional 1 skipped · Warnings 2**; warnings card listing skipped items with Retry item; actions View reports · Open Local Snapshot · Re-run skipped.

## SCR-11 · Scan Failed
- **Description:** Red result — a required collector failed / hard-stop. Never green.
- **Match:** danger **Failed** banner "not complete… nothing written back to kintone; partial data kept"; header + **Failed** pill; reason card (reason pill + plain explanation + "2 of 4 apps usable"); actions **Retry scan** · Fix connection · Review partial scan summary.

## SCR-12 · Local Snapshot
- **Description:** The canonical local output as a first-class object.
- **Match:** sidebar Local Snapshot active (canonical, "source" tag); header + Open folder + **◎ Re-run scan**; banner "canonical record… Reports & Developer Files generated from it"; 4 KPIs (MB / Apps / Plugins / Redactions); Contents list (apps, plugins, customization files "order preserved", org, dependencies); integrity card "Integrity OK · manifest verified".

## SCR-13 · Reports
- **Description:** Primary admin output — readable summaries generated from the snapshot.
- **Match:** sidebar Reports active; header "generated from snapshot captured…" + Reveal folder; report rows (icon, plain title + description, **Up to date** pill, Open — Open is primary on first row); info banner "reports regenerate from the snapshot".

## SCR-14 · Developer Files
- **Description:** Advanced/developer output; structured files + preserved-order customization. "Create review package" (not export/deploy).
- **Match:** sidebar Developer Files active; header "Developer Files" + **Advanced** tag + Reveal folder + **Create review package**; structured file rows (mono names `structured-data.jsonl`, `export-manifest.json`, Redacted pill); customization card with **FileOrderList** numbered 1·2·3 (execution order, confidence tags) + "Order from snapshot" pill; banner "order stored in manifest, never re-sorted".

## SCR-15 · History
- **Description:** Past runs with split counts and fixed status labels.
- **Match:** sidebar History active; header "Scan history"; run rows — latest tagged **Current snapshot** + **Completed with warnings** pill and "Required 68/68 · Optional 1 skipped · Warnings 2"; a **Completed** row; a **Failed** row with "View reason"; per-row Reports / Files actions.

## SCR-16 · Site Settings
- **Description:** Per-site config; Scan defaults panel; sensitive off-by-default; redaction locked on.
- **Match:** sidebar Settings active; settings sub-nav (General · Authentication · **Scan defaults** · Output folder · Privacy); default preset select (Standard Scan); Default categories card — **Required** locked (🔒 "Always on"), Recommended toggle ON, **Plugin assets / Sample records / Full record export** toggles OFF with "Off by default" (Sample records "· max 25 when enabled"); Redaction card locked-on ("Locked on"); Save changes / Cancel.

## SCR-17 · Advanced Internal Data warning gate
- **Description:** De-emphasized, warning-gated access to the machine-managed `.kintone/` folder.
- **Match:** sidebar Advanced Internal Data active (muted); muted page title; **danger banner** "This folder is machine-managed. Do not edit files manually."; "What's inside" list (raw / normalized / collector results / logs with mono counts); **acknowledgment checkbox**; **Open .kintone folder** disabled with "Enabled after you acknowledge above".
