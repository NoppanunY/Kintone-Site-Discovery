# UX_COPY_SPEC

All important user-facing copy. Plain, non-developer language. Technical terms only on Developer Files and Advanced Internal Data. Status strings are fixed — use verbatim.

## Status labels (fixed vocabulary — never vary)
- `Completed`
- `Completed with warnings`
- `Failed`
- `Running`
- `Connected` · `Idle` · `Can't connect` · `Sign-in rejected`
- `Credential saved` · `Needs update` · `No password`
- `In snapshot` · `Not captured` · `Last scan: warning`
- `Up to date` · `Stale`
- `Redacted` · `Integrity OK` · `Current snapshot`
- Tiers: `Required` (Always on) · `Recommended` · `Additional · sensitive` (Off by default) · `Sensitive`

> Never write "completed · 2 warnings", "ok/fail", or a raw error code as a status. Split counts as **Required X/Y ok · Optional N skipped · Warnings N**.

## Button labels
- Global: `New project` · `Open` · `Add profile` · `Add site` · `Open in tab` · `Test` / `Test connection` · `Forget credential` · `Remove from list` · `Open local folder`
- Wizard: `Continue →` · `← Back` · `Browse…` · `Go to site Overview` · `Choose apps first`
- Apps: `Reload list` · `Select all` · `Clear` · `Continue to scan →`
- Scan: `Review & start →` · `Configure ›` · `Show advanced options` · `Hide` · `Back to presets` · `Confirm & start →` · `◎ Run scan` · `Re-run scan`
- Running: `Cancel scan`
- Results: `View reports` · `Open Local Snapshot` · `Developer files` · `Re-run skipped` · `Retry item` · `Retry scan` · `Fix connection` · `Review partial scan summary`
- Snapshot/Reports/Files: `Open` · `Reveal folder` · `Regenerate` · `Create review package`
- Settings: `Save changes` · `Cancel`
- Advanced: `Open .kintone folder`
- Modal: `Confirm & start scan` · `Turn these off` · `Cancel`

> Forbidden verbs (imply write-back/deploy): Deploy, Publish, Import, Push, Sync to kintone, Apply, Restore, Roll back. Use `Create review package` / `Create share package`, never `Export package`.

## Section / screen titles
- `Projects` · `Auth profiles` · `Site workspaces`
- `Overview` · `Apps` · `Choose a scan preset` · `Configure sensitive options`
- `Scanning…` · `Scan completed` · `Completed with warnings` · `Scan failed`
- `Local Snapshot` · `Reports` · `Developer Files` · `Scan history`
- `Scan defaults` · `Advanced Internal Data`

## Empty states
- Projects: **No projects yet** — "Create a project to start pulling from kintone." · `New project`
- Apps (never fetched): **Fetch the app list** — "Load the apps this account can see, then choose what to scan." · `Fetch app list`
- Apps (no results): **No apps visible to this account** — "This sign-in can't see any apps. Check permissions, then reload." · `Reload`
- Scan (no apps): **Select apps first** — "Pick at least one app on the Apps page." · `← Go to Apps`
- Snapshot: **No snapshot yet** — "Run a scan to create your first local snapshot." · `◎ Run scan`
- Reports: **No reports yet** — "Run a scan to generate readable reports." · `◎ Run scan`
- Developer Files: **No files yet** — "Run a scan to generate developer files." · `◎ Run scan`
- History: **No scans yet** — "Your scan runs will appear here."
- Advanced: **Nothing here until you run a scan.**

## Loading states
- Apps: `Fetching apps…`
- Wizard test: `Testing connection…` (checks: Domain reachable · Credentials accepted · Read permission confirmed)
- Scan: `Preparing…` → `Scanning… · App {i} of {n} · {appName}` → `Saving snapshot…`
- Reports: `Generating reports…`
- Developer Files: `Building review package…`

## Success messages
- Completed banner: **Completed.** "All required data was captured. The local snapshot is up to date."
- Completed-with-warnings banner: **Completed with warnings.** "All required data was captured. Some optional captures were skipped — safe to ignore or retry."
- Wizard finish: **You're all set.** "{Site} is connected and its apps are loaded. Choose a scan preset next — most people start with Standard."
- Package created: **Review package created.** "Saved to {path}." · `Reveal folder`

## Warning messages
- Read-only reassurance (Scan setup): "Every preset is read-only and always includes the required categories. Nothing is written back to kintone."
- Snapshot model (Overview / Snapshot): "The snapshot is the canonical record of this pull. Reports and Developer Files are generated from it."
- Sensitive tier (Config): "Off by default. Turning any of these on requires confirmation before the scan runs."
- Re-run: "Re-running creates a new snapshot and marks it as current. Older snapshots remain in History. Reports and Developer Files will read from the new current snapshot."
- Delete site/profile: "This removes it from the app. Your local files are kept."
- Advanced gate (danger): **"This folder is machine-managed. Do not edit files manually."** "The .kintone/ folder holds raw and internal data the app maintains for debugging only. You don't need it for normal use, and editing it can corrupt the snapshot."

## Confirmation modal text
- **Sensitive capture** — Title: "Confirm sensitive capture". Body: "This scan will capture data that may include proprietary code or personal information. It stays local and redacted." List header: "Will be captured" + each enabled item. Ack: "I understand these outputs may contain sensitive data." Buttons: `Confirm & start scan` (disabled until ack) · `Turn these off` · `Cancel`.
- **Cancel scan** — Title: "Cancel this scan?" Body: "Partial data is kept, but the snapshot won't be complete." Buttons: `Cancel scan` (danger) · `Keep scanning`.
- **Move files to Trash** — Title: "Move local files to Trash?" Body: "This deletes the snapshot, reports and files at {path}. This can't be undone from the app." Buttons: `Move to Trash` (danger) · `Cancel`.
- **Advanced acknowledgment** (inline, not modal): "I understand this folder is machine-managed and should not be edited manually." → enables `Open .kintone folder`.

## Error messages (taxonomy → human copy)
Codes appear only as a small pill for support; the headline is the human line.
- `AUTH_FAILED` — **Sign-in was rejected.** "Check the profile password or domain. No data was written." · `Retry` · `Edit profile`
- `SITE_UNREACHABLE` — **Can't reach the site.** "Check the domain and your internet connection." · `Retry`
- `OUTPUT_WRITE_FAILED` — **Can't write to the local folder.** "Partial results are not saved yet. Choose a writable folder to save them, or retry." · `Choose folder` · `Retry`
- `REQUIRED_COLLECTOR_FAILED` — **Scan failed.** "A required part of the data couldn't be captured, so this scan is not complete. Nothing was written back to kintone; partial data is kept for inspection." · `Retry scan` · `Review partial scan summary`
- `PERMISSION_DENIED` — **This account can't read that.** "The sign-in lacks permission for some data. Ask an admin or continue with what's available." · `Continue` · `Retry`
- `SCAN_CANCELED` — **Scan canceled.** "You stopped this scan. Partial data is kept but the snapshot isn't complete." · `Retry scan`
- Report/file missing — **Report not found.** "Regenerate it from the current snapshot." · `Regenerate`

## Microcopy / labels
- Freshness: "App list fetched {relativeTime} · Reload"
- Snapshot meta: "Captured {date} · {size} · {folderPath}"
- Result counts: "Required {x}/{y} ok · Optional {n} skipped · Warnings {n} · {r} redactions"
- Settings defaults: "Off by default" · "Off by default · max 25 when enabled" (Sample records) · "Always on" (Required) · "Locked on" (Redaction)
- Password display: always `••••••` (never a real or partial value)
