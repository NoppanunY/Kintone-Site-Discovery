# Kintone Site Discovery

Kintone Site Discovery is a spec-first project for building a read-only desktop/CLI tool that captures as much useful structure as possible from one or more kintone sites and turns it into an AI-ready knowledge base.

The first MVP is **not** a deploy tool and **not** a Git client. It is a discovery and RAG ingestion tool.

## MVP 1 goal

Build a production-usable MVP that can:

1. Connect to a kintone site using an administrator username/password.
2. List apps available to the authenticated admin user.
3. Let the user select which apps to scan.
4. Let the user choose which data categories to capture.
5. Capture required app metadata/settings through kintone REST APIs.
6. Capture plugin inventory through REST APIs.
7. Capture plugin saved config through the kintone browser runtime where possible.
8. Optionally capture plugin asset files such as desktop runtime JS/CSS and plugin config page JS/CSS/HTML through browser/network collection.
9. Normalize, redact, summarize, and index the captured data.
10. Generate an AI-readable knowledge pack for analysis, redesign, documentation, and future safe-deploy planning.

## MVP 1 non-goals

The following are explicitly out of scope for MVP 1:

- Deploying app settings to kintone.
- Updating app settings.
- Safe deploy, rollback, deploy lock, or CI/CD.
- Git workflow, merge, conflict resolver, branch graph, or commit UI.
- Full record backup by default.
- AI automatically modifying kintone apps.

## Main specs

- [MVP 1 Specification](docs/MVP1_SPEC.md)
- [Data Model and Storage Specification](docs/DATA_MODEL.md)
- [Workspace, Profile, Account, and Site Tab Specification](docs/WORKSPACE_PROFILE_SPEC.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## Product principle

> Capture deep metadata for the system, but show users only the decisions they need.

Internally the tool may keep raw snapshots, normalized JSON, hashes, RAG chunks, error reports, and plugin asset captures. User-facing output should remain simple: site summary, app summary, plugin summary, dependency map, AI context, and scan result status.

## UX principle

The app should work as a multi-site desktop workspace. Users should be able to create reusable auth profiles/accounts, open each site in a separate tab, set a separate local folder per site, open the folder from the UI, and configure scan/browser/output settings per site.

## Security principle

Admin credentials, session cookies, API tokens, OAuth tokens, and any secrets discovered in plugin config or JavaScript must never be written into project files, logs, raw snapshots, normalized output, or RAG indexes. Store credentials only in the operating system keychain or an equivalent secure secret store.
