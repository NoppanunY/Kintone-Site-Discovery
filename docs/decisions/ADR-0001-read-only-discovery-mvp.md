# ADR-0001: MVP 1 is Read-Only Kintone Site Discovery

Date: 2026-07-03

## Status

Accepted

## Context

The project is currently focused on Kintone Site Discovery.

The MVP should help users connect to kintone, discover selected apps, run read-only scans, and produce local reports/exports/snapshots for review and documentation.

There is a future product direction around pull, compare, and safe deploy, but that is not part of the current MVP 1 scope.

## Decision

MVP 1 is a read-only discovery/export tool.

MVP 1 must not perform remote mutations against kintone.

MVP 1 must not include deploy, safe deploy, rollback, import, Git client, branch graph, merge UI, CI/CD workflow, or AI/RAG/chat features.

## Allowed in MVP 1

- Create/open a local project
- Manage auth profiles without exposing secrets
- Add/manage kintone site workspaces
- Fetch app list
- Select apps
- Choose scan categories
- Run read-only scans
- Capture metadata and allowed optional data
- Generate local reports
- Generate structured exports
- Show scan history
- Show warnings and errors
- Open local folders
- Preserve JavaScript/CSS order in reports and export views

## Explicitly out of scope for MVP 1

- Deploy to kintone
- Safe deploy
- Rollback
- Importing local files into kintone
- Updating app settings remotely
- Updating app customizations remotely
- Git client features
- Branch graph
- Merge/conflict resolver
- CI/CD
- AI recommendations
- RAG/chat over project files

## Rationale

Keeping MVP 1 read-only reduces product, UX, and implementation risk.

It lets the product first establish safe local discovery, project structure, snapshots, reports, exports, and evidence before introducing remote mutation/deploy risk.

This also makes the app safer for non-developer kintone admins.

## UX implications

The UI should communicate that MVP 1 is safe and read-only.

Avoid wording that suggests deploy/import capability.

For example, prefer:

- Create review package
- Create share package
- Open local folder
- View report

Avoid:

- Deploy package
- Import package
- Push changes
- Apply to kintone

## Engineering implications

Codex or developers may build frontend scaffolding around the read-only flow.

They must not implement real deploy or mutation workflows from wireframe V0.

Future safe deploy work should be designed as a separate ADR and MVP phase.

## Future ADR candidates

- ADR-0002: Local project structure and machine-managed directories
- ADR-0003: Snapshot model and evidence retention
- ADR-0004: Safe deploy readiness checks
- ADR-0005: Compare local project with latest kintone state
