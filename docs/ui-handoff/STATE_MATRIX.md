# STATE_MATRIX

States for each stateful entity, their UI treatment, and allowed transitions. Read-only MVP — no state ever writes back to kintone.

Legend for treatment: pill = StatusPill variant; banner = WarningBanner tone.

---

## 1. Auth profile
| State | Meaning | UI | Actions |
|---|---|---|---|
| `no_credential` | profile exists, no password in keychain | pill idle "No password" | Add password (SecretField) |
| `saved` | password in OS keychain | pill ok "Credential saved" | Test · Replace · Forget |
| `needs_update` | last use rejected | pill warn "Needs update" | Replace password · Test |
| `testing` | test in progress | inline spinner | — |
| `invalid` | test failed | pill err + reason | Replace · Retry |
Transitions: no_credential→saved (set); saved→needs_update/invalid (rejected); any→no_credential (forget). Secret value never displayed in any state.

## 2. Site connection
| State | UI | Actions |
|---|---|---|
| `idle` | pill idle "Idle" (never tested) | Test connection |
| `testing` | pill run "Testing…" | — |
| `connected` | pill ok "Connected" | Run scan · Fetch apps |
| `unreachable` | pill err "Can't connect" + banner danger | Fix connection · Retry |
| `auth_failed` | pill err "Sign-in rejected" | Edit profile · Retry |
Transitions: idle→testing→connected|unreachable|auth_failed. Overview keeps last snapshot visible even when disconnected (marked stale).

## 3. App list
| State | UI | Actions |
|---|---|---|
| `never_fetched` | EmptyState "Fetch the app list" | Fetch |
| `fetching` | skeleton + "Fetching apps…" | — |
| `loaded` | list + "fetched N ago · Reload" | Search · Select · Continue |
| `stale` | list + amber "fetched N ago" (old) | Reload |
| `empty_result` | EmptyState "No apps visible to this account" | Reload · Permissions help |
| `error` | ErrorState + reason | Retry (keeps previous list if any) |
Freshness label always present when loaded/stale.

## 4. Scan setup
| State | UI | Actions |
|---|---|---|
| `no-apps-selected` | Continue/Start disabled; guard to Apps | Go to Apps |
| `preset-quick` | Quick selected (required only) | Review & start |
| `preset-standard` | Standard selected (default) | Review & start |
| `preset-full` | Full Discovery → Configure route | Configure › |
| `advanced-open` | Sensitive Options Configuration visible | toggle categories |
| `sensitive-armed` | ≥1 sensitive on → confirm required | Confirm & start (→ modal) |
| `ready` | valid, no sensitive | Start scan (direct) |
Transitions: preset-full & sensitive-armed both require SCR-07 before run.

## 5. Scan running
| State | UI | Actions |
|---|---|---|
| `starting` | progress 0%, "Preparing…" | Cancel |
| `running` | progress %, per-collector list, current app | Cancel |
| `collector-skipped` | amber "Skipped" row; run continues | — |
| `committing` | "Saving snapshot…"; Cancel briefly disabled | — |
| `canceled` | → result as Failed (reason: canceled) | Retry |
Only hard-stops (auth lost / unreachable / not-writable / required-collector-failed / cancel) leave `running` for Failed.

## 6. Scan result
| State | Condition | UI | Primary action |
|---|---|---|---|
| `completed` | 0 required failures, 0 optional skips | banner ok + pill ok "Completed" | View reports |
| `completed_with_warnings` | 0 required failures, ≥1 optional skip | banner warn + pill warn "Completed with warnings" | View reports |
| `failed` | ≥1 required failure OR hard-stop | banner danger + pill err "Failed" | Retry scan |
Rule: **never `completed` if any required collector failed.** Counts always split Required / Optional / Warnings.

## 7. Local snapshot
| State | UI | Actions |
|---|---|---|
| `none` | EmptyState "No snapshot yet" | Run scan |
| `building` | "Scan running…" (mirror of run) | — |
| `ready` | SnapshotCard full + Contents + integrity ok | Open · Re-run |
| `ready_with_warnings` | as ready + pill warn | Open · Re-run · Re-run skipped |
| `stale_vs_attempt` | newer failed attempt exists | banner info "Newer scan failed; this snapshot is from {date}" | Re-run |
| `integrity_error` | manifest missing/corrupt | banner danger "Integrity check failed" | Re-run |
Snapshot is canonical; Reports & Developer Files derive from `ready`/`ready_with_warnings`.

## 8. Reports
| State | UI | Actions |
|---|---|---|
| `none` | EmptyState "No reports yet — run a scan" | Run scan |
| `generating` | progress "Generating reports…" | — |
| `up_to_date` | list, each ReportListItem ok | Open · Reveal folder |
| `stale` | items marked stale (snapshot changed) | Regenerate · Open |
| `missing-file` | item "Report not found" | Regenerate |
Freshness derived from snapshot version.

## 9. Developer files
| State | UI | Actions |
|---|---|---|
| `none` | EmptyState "No files yet — run a scan" | Run scan |
| `ready` | DeveloperFileList + FileOrderList | Open · Reveal · Create review package |
| `building-package` | progress "Building review package…" | — |
| `package-error` | ErrorState (writable-folder guidance) | Choose folder · Retry |
File order always reflects snapshot manifest; never re-sorted.

## 10. Output folder writeability
| State | UI | Actions |
|---|---|---|
| `writable` | (silent) | — |
| `checking` | inline during scan start | — |
| `not-writable` | ErrorState OUTPUT_WRITE_FAILED | Choose folder · Retry |
| `path-missing` | "Folder not found" | Locate · Choose folder |
OUTPUT_WRITE_FAILED copy (fixed): "Partial results are not saved yet. Choose a writable folder to save them, or retry." Never claims data is safely held in memory. A not-writable folder detected mid-scan → Failed with this guidance.
