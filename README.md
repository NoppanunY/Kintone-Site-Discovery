# Kintone Site Discovery

Kintone Site Discovery is a spec-first project for building a read-only desktop/CLI tool that pulls data from one or more kintone sites and stores it locally as snapshots, reports, and structured export files.

The first MVP is **not** a deploy tool, **not** a Git client, and **not** an AI application. It is a kintone data extraction and local export tool.

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
12. Normalize, redact, summarize, and export the captured data.
13. Create local snapshots and readable reports that users can inspect or use with any external tool.

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
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## Product principle

> Pull kintone data safely, store it locally, and make the exported files easy to inspect.

Internally the tool may keep raw snapshots, normalized JSON, hashes, structured export files, error reports, and plugin asset captures. User-facing output should remain simple: site summary, app summary, plugin summary, dependency report, scan history, and export package status.

## UX principle

The app should work as a multi-site desktop workspace. Users should be able to create reusable auth profiles/accounts, open each site in a separate tab, set a separate local folder per site, open the folder from the UI, and configure scan/browser/output settings per site.

## Security principle

Admin credentials, session cookies, API tokens, OAuth tokens, and any secrets discovered in plugin config or JavaScript must never be written into project files, logs, raw snapshots, normalized output, or export files. Store credentials only in the operating system keychain or an equivalent secure secret store.
