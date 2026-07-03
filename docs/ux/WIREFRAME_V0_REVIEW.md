# Wireframe V0 Review

Date: 2026-07-03

Reviewer: ChatGPT

Source: Claude Design low-fidelity wireframe output generated from `CLAUDE_DESIGN_PROMPT.md`.

## Verdict

Wireframe V0 is usable as a first UX scaffold.

It is aligned with the current MVP direction: read-only pull/discovery/export. It does not incorrectly introduce Git client features, deploy, rollback, AI, or safe deploy workflows.

Recommended score for V0: 8.5 / 10.

Do not move directly to high-fidelity design yet. Revise the wireframe once more before implementation detail or visual polish.

## What is working well

### Navigation direction is correct

The proposed structure of global navigation, site tabs, and site-level navigation fits the desktop app model and supports multi-site workflows.

It also avoids turning the app into a Git IDE.

### Page coverage is complete

The wireframe covers the expected MVP surfaces:

- Project Home
- Accounts / Auth Profiles
- Site Workspaces
- Site Overview
- Apps
- Scan
- Reports
- Exports
- History
- Site Settings
- Advanced / Internal Data

### Non-dev friendliness is generally good

The wireframe keeps advanced raw/internal data out of the primary path and uses practical labels such as reports, exports, local folders, scan history, and connection status.

### Safety constraints are visible

The wireframe includes:

- Write-only password/token treatment
- Credential status instead of secret display
- Required scan options locked on
- Optional sensitive scan categories
- Redaction behavior
- Warnings around machine-managed internal files

### JS/CSS order preservation is represented

The wireframe explicitly treats JavaScript/CSS order as meaningful and avoids showing ordered assets as a simple alphabetical list.

This is important because custom JavaScript/CSS load order can affect behavior.

## Required improvements before high-fidelity

### 1. Add a first-run wizard

Current flow is correct but too fragmented for non-developer users.

Add a guided setup wizard:

```text
Create/Open Project
  -> Add Auth Profile
  -> Add Site Workspace
  -> Test Connection
  -> Fetch Apps
  -> Continue to Site Overview
```

This should be the primary first-run experience.

### 2. Reduce visible navigation complexity

The wireframe currently has several navigation layers.

Keep the menu bar secondary/native. Put primary actions in context on the active page.

Examples:

- Site Overview should contain `Fetch apps`, `Run scan`, `Open reports`, and `Open local folder`.
- Apps page should contain `Refresh app list` and app selection actions.
- Scan page should contain scan preset and run actions.

### 3. Add scan presets

Add three scan modes:

1. Quick Scan
2. Standard Scan
3. Full Discovery

Advanced collector-level options should be behind `Show advanced options`.

This reduces cognitive load for non-dev users while preserving advanced control.

### 4. Add sensitive capture confirmation

If the user enables sensitive optional categories, show a pre-scan confirmation modal.

Sensitive categories include:

- Plugin assets
- Sample records
- Full record export
- Comments
- Attachments
- Screenshots

The modal should explain:

- These categories may include personal data, customer data, attachments, proprietary code, or confidential content.
- Redaction is enabled where applicable.
- The user should review generated outputs before sharing.

### 5. Clarify scan result states

Use these states consistently:

- Completed
- Completed with warnings
- Failed

Do not show a green `complete` state if required collectors failed.

If optional collectors fail, show `Completed with warnings`.

If required collectors fail, prefer `Failed` or `Completed with warnings` only when the core required scan output remains valid.

### 6. Prioritize Reports over Exports for non-dev users

Reports should be the primary output path.

Exports should be treated as advanced/developer output.

### 7. Rename export package wording

Avoid wording that suggests deploy/import.

Prefer:

- Create review package
- Create share package
- Export review bundle

Avoid:

- Deploy package
- Import package
- Export package, if unclear

### 8. Keep Advanced / Internal Data de-emphasized

Advanced raw metadata should be accessible but not visually prominent.

Use a warning-gated screen or advanced toggle.

## Recommended prompt for next Claude Design revision

```text
Please revise the wireframes before high-fidelity.

Keep the MVP read-only. Do not add deploy, Git client, AI, rollback, or safe deploy features.

Revise these areas:
1. Add a first-run onboarding wizard that combines project creation/opening, auth profile creation, site workspace setup, test connection, and first app fetch.
2. Reduce visible navigation complexity for non-developer users. Keep the menu bar secondary; make primary actions available in context.
3. Add scan presets: Quick Scan, Standard Scan, Full Discovery. Keep advanced capture categories behind “Show advanced options”.
4. Add a pre-scan confirmation modal when sensitive opt-in categories are enabled, especially plugin assets, sample records, full record export, comments, attachments, and screenshots.
5. Clarify scan result states: Completed, Completed with warnings, Failed. Avoid showing a green “complete” state when required collectors failed.
6. Make Reports the primary output for non-dev users and Exports the advanced/developer output.
7. Rename “Export package” to avoid implying deploy/import. Use “Create review package” or “Create share package”.
8. Keep Advanced Internal Data de-emphasized and warning-gated.
```

## Implementation guidance

Codex can begin with frontend scaffold work only after reading `CODEX_FRONTEND_SCAFFOLD_BRIEF.md`.

Avoid production implementation until wireframe V1 is reviewed.
