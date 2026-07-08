# ROUTING_SPEC

Kintone Site Discovery — MVP 1 (read-only). Desktop app (single window, tab-based). Routes are logical; a desktop shell may implement them as views rather than URLs.

## Route model

- The window hosts a **tab bar**. `Home` is always tab 0. Each open Project is a tab.
- A Project tab represents one local project folder plus its linked Connected Site.
- Within a **Project tab**, the left **SiteSidebar** switches sub-routes for that Project.
- First launch with no project → `/onboarding` takes over the whole window (no tabs/sidebar).
- Tabs, active tab, and last sub-route persist across restarts. **Secrets never persist** (keychain only).
- The current renderer still uses `/site/:siteId` as the logical route prefix for compatibility with the hi-fi skeleton. For new storage work, treat the route parameter as the active Project context id; the Project then resolves its linked Connected Site.

## Global routes

| Route | Screen | Notes |
|---|---|---|
| `/onboarding` | SCR-01 First-run wizard | Full-window; shown when no project exists, via "New project", or via "Add connected site". Steps: `/onboarding/project`, `/sign-in`, `/site`, `/test`, `/apps`. |
| `/` | SCR-02 Project Home | The Home tab. Projects, Auth profiles, Connected Sites. |
| `/home/accounts` | Project Home (Accounts focus) | Same tab, anchored section / detail dialog. |
| `/home/sites` | Project Home (Sites focus) | Same tab. |
| `/new-tab` | New Tab chooser | Open existing workspace / create new / open folder. |

## Project-tab routes  (current prefix `/site/:siteId`)

| Route | Screen | Sidebar group |
|---|---|---|
| `/site/:siteId/overview` | SCR-03 Site Overview | Site |
| `/site/:siteId/apps` | SCR-04 Apps | Site |
| `/site/:siteId/scan` | SCR-05 Scan Setup (presets) | Site |
| `/site/:siteId/scan/advanced` | SCR-06 Sensitive Options Configuration | Site (Scan) |
| `/site/:siteId/scan/confirm` | SCR-07 Confirmation Modal (overlay) | modal over Scan |
| `/site/:siteId/scan/run` | SCR-08 Scan Running | Site (Scan) |
| `/site/:siteId/scan/result` | SCR-09/10/11 Result (Completed / Warnings / Failed) | Site (Scan) — one route, three status renders |
| `/site/:siteId/snapshot` | SCR-12 Local Snapshot | Snapshot (source) |
| `/site/:siteId/reports` | SCR-13 Reports | Snapshot |
| `/site/:siteId/reports/:reportId` | Report viewer / OS open | Snapshot |
| `/site/:siteId/developer-files` | SCR-14 Developer Files | Snapshot |
| `/site/:siteId/history` | SCR-15 History | Snapshot |
| `/site/:siteId/history/:runId` | Run detail | Snapshot |
| `/site/:siteId/settings` | SCR-16 Site Settings | Configure. Sub-tabs: `general`, `authentication`, `scan-defaults`, `output`, `privacy`. |
| `/site/:siteId/advanced` | SCR-17 Advanced Internal Data gate | Configure (de-emphasized) |

## Route guards

- `/site/:siteId/*` requires a Project tab context and its linked Connected Site to exist.
- `/scan/*` requires ≥1 app selected; otherwise redirect to `/apps` with an empty-scan prompt.
- `/scan/confirm` only reachable when ≥1 sensitive capture is armed; otherwise `Confirm & start` goes straight to `/scan/run`.
- `/scan/result` is derived from the run outcome; status render (Completed / Completed with warnings / Failed) is decided by the scan engine, not the route.
- `/advanced` renders the gate; the "Open .kintone folder" action is disabled until acknowledgment.

## Menu bar (secondary)

The top menu bar (`Project · Account · Site · Scan · Snapshot · Window · Help`) mirrors in-context actions and OS conventions. It is never the only path to any action. Project/Scan/Snapshot actions operate on the active Project tab; Site actions operate on reusable Connected Sites or on the active Project's linked site, depending on the label.
