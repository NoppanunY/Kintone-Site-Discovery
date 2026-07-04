# Kintone Site Discovery

Kintone Site Discovery is a spec-first project for building a read-only desktop/CLI tool that pulls data from one or more kintone sites and stores it locally as complete snapshots.

The first MVP is **not** a deploy tool, **not** a Git client, and **not** an AI application. It is a kintone data extraction and local snapshot tool.

## MVP 1 goal

Build a production-usable MVP that can:

1. Create reusable authentication profiles/accounts.
2. Connect to a kintone site using an administrator username/password.
3. Open each configured site as a separate tab.
4. Store each site's extracted data in a separate local folder.
5. List apps available to the authenticated admin user.
6. Let the user select which apps to scan.
7. Let the user choose which data categories to pull.
8. Pull required app metadata/settings through kintone REST APIs.
9. Pull plugin inventory through REST APIs.
10. Pull plugin saved config through the kintone browser runtime where possible.
11. Optionally pull plugin asset files such as desktop runtime JS/CSS and plugin config page JS/CSS/HTML through browser/network collection.
12. Preserve JavaScript/CSS file order exactly when pulling customization or plugin assets.
13. Normalize, redact, summarize, and store the captured data as a local snapshot.
14. Generate readable reports and developer files from the local snapshot for inspection or handoff.

## MVP 1 non-goals

The following are explicitly out of scope for MVP 1:

- Built-in AI features.
- Chat interface.
- AI insights, AI recommendations, or automatic analysis inside the app.
- Deploying app settings to kintone.
- Updating app settings.
- Safe deploy, rollback, deploy lock, or CI/CD.
- Git workflow, merge, conflict resolver, branch graph, or commit UI.
- Full record backup by default.
- Automatically modifying kintone apps.

## Main specs

- [MVP 1 Specification](docs/MVP1_SPEC.md)
- [Data Model and Storage Specification](docs/DATA_MODEL.md)
- [Workspace, Profile, Account, and Site Tab Specification](docs/WORKSPACE_PROFILE_SPEC.md)
- [JavaScript and CSS File Order Preservation Specification](docs/FILE_ORDER_SPEC.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Codex Implementation Handoff](docs/CODEX_IMPLEMENTATION_HANDOFF.md)
- [UX/UI Implementation Handoff](docs/ui-handoff/README.md)

## Product principle

> Pull kintone data safely, store it locally as a complete snapshot, and make that snapshot easy to inspect.

The **Local Snapshot** is the canonical output. Reports and Developer Files are generated from the current snapshot. They are not separate core workflows, and they must not imply import, deploy, sync, or write-back to kintone.

Internally the tool may keep raw snapshots, normalized JSON, hashes, structured developer files, error reports, ordered customization file lists, and plugin asset captures. User-facing output should remain simple: local snapshot status, site summary, app summary, plugin summary, dependency report, scan history, and review package status.

## UX principle

The app should work as a multi-site desktop workspace. Users should be able to create reusable auth profiles/accounts, open each site in a separate tab, set a separate local folder per site, open the folder from the UI, and configure scan/browser/output settings per site.

For desktop UX/UI implementation, use `docs/ui-handoff/` as the source of truth for screens, components, state naming, copy, routes, design tokens, local snapshot behavior, and Codex task order.

## Security principle

Admin credentials, session cookies, API tokens, OAuth tokens, and any secrets discovered in plugin config or JavaScript must never be written into project files, logs, raw snapshots, normalized output, reports, developer files, or review packages. Store credentials only in the operating system keychain or an equivalent secure secret store.
