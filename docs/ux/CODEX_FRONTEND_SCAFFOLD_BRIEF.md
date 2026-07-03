# Codex Frontend Scaffold Brief

Date: 2026-07-03

## Purpose

Use the wireframe V0 handoff documents to build a replaceable frontend scaffold for the Kintone Site Discovery desktop app.

This is not a production implementation request.

## Source documents

Read these files first:

1. `docs/ux/CLAUDE_DESIGN_PROMPT.md`
2. `docs/ux/WIREFRAME_V0_SUMMARY.md`
3. `docs/ux/WIREFRAME_V0_REVIEW.md`
4. `docs/decisions/ADR-0001-read-only-discovery-mvp.md`

## Scope

Build only the frontend/app scaffold implied by the wireframe.

Allowed work:

1. App shell
2. Main navigation structure
3. Site tab placeholder structure
4. Page routes
5. Placeholder components for each screen
6. Mock data
7. Mock scan status
8. Empty/loading/error/success UI states
9. Component boundaries that can survive layout changes
10. Basic non-final low-fidelity styling if needed for development clarity

## Required pages/routes

Create placeholder routes or screens for:

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

## Important UX concepts to preserve

### Read-only MVP

This app is currently a read-only kintone pull/discovery/export tool.

Do not add deploy, safe deploy, rollback, import, or remote mutation functionality.

### Non-dev first

The default UI should be understandable by non-developer kintone admins.

Advanced/raw/internal data should not be prominent.

### First-run wizard placeholder

Prepare component boundaries for a future first-run wizard:

```text
Create/Open Project
  -> Add Auth Profile
  -> Add Site Workspace
  -> Test Connection
  -> Fetch Apps
  -> Continue to Site Overview
```

The wizard does not need production behavior yet. It can use mock data.

### Scan presets

Prepare UI placeholders for:

- Quick Scan
- Standard Scan
- Full Discovery

Advanced scan categories should be collapsible.

### Sensitive opt-ins

Prepare a placeholder confirmation modal for sensitive optional capture categories:

- Plugin assets
- Sample records
- Full record export
- Comments
- Attachments
- Screenshots

### Scan result states

Use these status labels:

- Completed
- Completed with warnings
- Failed

Avoid a successful-looking status when required collectors fail.

### Reports vs Exports

Reports are the primary output for non-dev users.

Exports are advanced/developer output.

Avoid wording that suggests deploy/import.

Use:

- Create review package
- Create share package

Avoid:

- Deploy package
- Import package

## Explicit non-goals

Do not implement:

1. Real kintone API calls
2. Real authentication or credential storage
3. Real local file writes
4. Real scan runner
5. Real report generation
6. Real export generation
7. Real plugin asset capture
8. Real record/comment/attachment/screenshot capture
9. Deploy
10. Safe deploy
11. Rollback
12. Git client
13. Branch graph
14. Merge/conflict UI
15. AI/RAG/chat features
16. Pixel-perfect final styling
17. Branding or final visual design

## Implementation expectation

Prioritize:

1. Clean folder/component structure
2. Route/page naming
3. Reusable layout components
4. Mock state shape
5. Replaceable UI skeleton

Do not overfit to V0 layout. Claude Design may produce a revised wireframe V1.

Expected future change after V1:

- Navigation refinements
- Wizard changes
- Scan setup simplification
- Wording updates
- Modal/state additions
- Page layout adjustments

The scaffold should be easy to update without reworking business logic.

## Suggested component boundaries

These names are suggestions, not hard requirements:

```text
AppShell
ProjectHomePage
AuthProfilesPage
SiteWorkspacesPage
SiteTabShell
SiteOverviewPage
AppsPage
ScanPage
ReportsPage
ExportsPage
HistoryPage
SiteSettingsPage
AdvancedInternalDataPage
FirstRunWizard
ScanPresetSelector
ScanCategoryPanel
SensitiveCaptureConfirmDialog
ScanStatusBanner
ReportSummaryCard
ExportOutputList
LocalFolderLink
```

## Suggested mock data domains

Use mock data for:

- Projects
- Auth profiles
- Sites
- Apps
- Scan presets
- Scan categories
- Scan progress
- Reports
- Exports
- Scan history
- Warnings/errors

## Acceptance criteria for scaffold

The scaffold is acceptable when:

1. A developer can navigate through every required page.
2. The app does not perform real network/file/credential actions.
3. The UI communicates the read-only MVP direction.
4. Reports are easier to find than advanced exports.
5. Sensitive opt-ins have visible confirmation treatment.
6. Advanced/internal data is not prominent.
7. The code is modular enough to update after wireframe V1.
