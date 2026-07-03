# Wireframe V0 Summary

Date: 2026-07-03

Source: Claude Design low-fidelity wireframe output generated from `CLAUDE_DESIGN_PROMPT.md`.

## Status

This is a wireframe summary for MVP 1 only.

MVP 1 is a read-only Kintone Site Discovery desktop app. It is not a deploy tool, Git client, rollback tool, CI/CD tool, or safe deploy workflow.

## Product intent

The app helps users create a local project, connect to one or more kintone sites, discover selected apps, run read-only scans, and review outputs such as reports, exports, history, errors, and local folders.

The primary users are:

1. Non-developer kintone admins or business analysts who need clear, safe, guided discovery.
2. Developer/admin users who need structured exports, scan evidence, raw metadata, and reproducible local files.

## Main navigation concept

The proposed wireframe uses three layers:

1. Global app layer
   - Project Home
   - Accounts / Auth Profiles
   - Site Workspaces
   - Help / About

2. Site tab layer
   - Each connected site can be opened as a separate tab.
   - This supports multi-site work without turning the app into a Git client.

3. Site-level left rail
   - Overview
   - Apps
   - Scan
   - Reports
   - Exports
   - History
   - Settings
   - Advanced / Internal Data

## Required pages

### Project Home

Purpose:

- Create a new local project.
- Open an existing local project.
- Show recent projects.
- Explain that project files are stored locally.

Key states:

- Empty state for first launch.
- Recent project list.
- Project open success.
- Project load error.

### Accounts / Auth Profiles

Purpose:

- Manage local authentication profiles.
- Store credential references securely.
- Avoid writing secrets into project files.

Key UI rules:

- Passwords/tokens should be write-only.
- Show only connection status, credential type, profile name, and last validation.
- Never show raw credentials.

### Site Workspaces

Purpose:

- Add and manage kintone site workspaces.
- Associate a site with an auth profile.
- Test connection before opening the site tab.

Key states:

- No sites yet.
- Connection success.
- Connection failed.
- Site inaccessible.

### Site Overview

Purpose:

- Show selected site status.
- Show last scan summary.
- Provide primary actions such as Fetch apps, Run scan, Open reports, and Open local folder.

Recommended simplification:

- Use this screen as the main dashboard for non-dev users.
- Keep raw/internal metadata out of this page.

### Apps

Purpose:

- Fetch and display app list.
- Select apps for scan.
- Show app ID, name, status, last scan, and warnings.

Key states:

- No app list fetched.
- Loading app list.
- Empty app list.
- Partial fetch failure.
- App selection changed.

### Scan

Purpose:

- Choose scan categories.
- Run read-only collectors.
- Show progress and results.

Important constraints:

- Required scan options must be checked and disabled.
- Optional sensitive scan categories must be opt-in.
- Plugin asset capture, sample records, full record export, comments, attachments, and screenshots must require clear opt-in treatment.

Recommended improvement:

- Add scan presets: Quick Scan, Standard Scan, Full Discovery.
- Hide advanced collector details behind `Show advanced options`.

### Reports

Purpose:

- Provide human-readable outputs for non-dev users.
- Show summary, warnings, app findings, customization findings, JS/CSS order, and scan status.

Recommended priority:

- Reports should be the primary output for non-developer users.

### Exports

Purpose:

- Provide structured files for developer/admin users.
- Show generated local folders, JSON/JSONL exports, and review/share package outputs.

Important wording rule:

- Avoid the phrase `Export package` if it can imply deploy/import capability.
- Prefer `Create review package` or `Create share package`.

### History

Purpose:

- List prior scans.
- Show scan status, timestamp, selected apps, scan categories, warnings, and output folder.

Key states:

- No scan history.
- Completed.
- Completed with warnings.
- Failed.

### Site Settings

Purpose:

- Site-level settings such as site name, auth profile association, local path, and scan preferences.

Safety rule:

- Deleting/removing a site workspace must not silently delete local files.

### Advanced / Internal Data

Purpose:

- Expose machine-readable metadata and raw internals for advanced users only.

UI rule:

- Keep this area de-emphasized and warning-gated.
- It should not be the default path for non-dev users.

## Primary user flow

```text
Launch app
  -> Create/Open Project
  -> Add Auth Profile
  -> Add Site Workspace
  -> Test Connection
  -> Open Site Tab
  -> Fetch App List
  -> Select Apps
  -> Choose Scan Preset / Categories
  -> Run Scan
  -> Review Result Status
  -> Open Reports
  -> Optionally Open Exports / Local Folder / History
```

## Recommended first-run wizard

The next revision should add a guided setup wizard:

```text
Create/Open Project
  -> Add Auth Profile
  -> Add Site Workspace
  -> Test Connection
  -> Fetch Apps
  -> Continue to Site Overview
```

This reduces navigation complexity for non-developer users.

## Result states

Use these top-level scan result states:

1. Completed
2. Completed with warnings
3. Failed

Avoid showing a green `Complete` state when required collectors failed.

## Sensitive capture UX

If the user enables any sensitive optional category, show a pre-scan confirmation modal.

Sensitive opt-ins include:

- Plugin assets
- Sample records
- Full record export
- Comments
- Attachments
- Screenshots

The modal should explain that redaction is enabled, but the user must review generated outputs before sharing.

## Codex implementation guidance

Codex may use this document to build a frontend scaffold only.

Codex should not implement production logic, real kintone API calls, credential storage, local file writing, scan runners, report generation, or any deploy/safe deploy capability from this wireframe.
