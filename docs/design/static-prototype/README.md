# Static Extracted Hi-Fi Screens

This folder contains per-screen static HTML extracted from `../Kintone-Site-Discovery-HiFi-rendered.html`, which was saved from the rendered Claude Design Hi-Fi page.

Unlike `../static-prototype/`, these files are intended to be the closer implementation reference for Codex because they preserve the rendered Hi-Fi DOM structure, class names, inline layout styles, app frame, menu bar, site tab bar, sidebar, content area, cards, buttons, pills, tables, banners, and modal composition.

## Important

- The original visual source of truth remains `../Kintone-Site-Discovery-HiFi.html`.
- This extracted set removes the Claude Design annotation wrapper: screen title, purpose text, and explanatory callout cards.
- Each screen file contains only the product UI frame for that screen.
- Embedded font files are not included. Typography may fall back to system fonts; layout should remain the reference target.
- This is a design reference for Codex to port into React, not production application code.

## Files

- `index.html` — screen index.
- `styles/extracted.css` — extracted design tokens and component styles.
- `screens/*.html` — one product-only screen per file.

## Screens

| ID | Screen | Route | File |
|---|---|---|---|
| SCR-01 | First-run onboarding wizard | `/onboarding` | [`SCR-01-onboarding.html`](screens/SCR-01-onboarding.html) |
| SCR-02 | Project Home | `/ (Home tab)` | [`SCR-02-project-home.html`](screens/SCR-02-project-home.html) |
| SCR-03 | Site Overview | `/site/:siteId/overview` | [`SCR-03-site-overview.html`](screens/SCR-03-site-overview.html) |
| SCR-04 | Apps | `/site/:siteId/apps` | [`SCR-04-apps.html`](screens/SCR-04-apps.html) |
| SCR-05 | Scan Setup | `/site/:siteId/scan` | [`SCR-05-scan-setup.html`](screens/SCR-05-scan-setup.html) |
| SCR-06 | Sensitive Options Configuration | `/site/:siteId/scan/advanced` | [`SCR-06-sensitive-options.html`](screens/SCR-06-sensitive-options.html) |
| SCR-07 | Sensitive Capture Confirmation Modal | `modal · over /scan` | [`SCR-07-sensitive-confirmation.html`](screens/SCR-07-sensitive-confirmation.html) |
| SCR-08 | Scan Running | `/site/:siteId/scan/run` | [`SCR-08-scan-running.html`](screens/SCR-08-scan-running.html) |
| SCR-09 | Scan Completed | `/site/:siteId/scan/result` | [`SCR-09-scan-completed.html`](screens/SCR-09-scan-completed.html) |
| SCR-10 | Scan Completed with Warnings | `/site/:siteId/scan/result` | [`SCR-10-completed-with-warnings.html`](screens/SCR-10-completed-with-warnings.html) |
| SCR-11 | Scan Failed | `/site/:siteId/scan/result` | [`SCR-11-scan-failed.html`](screens/SCR-11-scan-failed.html) |
| SCR-12 | Local Snapshot | `/site/:siteId/snapshot` | [`SCR-12-local-snapshot.html`](screens/SCR-12-local-snapshot.html) |
| SCR-13 | Reports | `/site/:siteId/reports` | [`SCR-13-reports.html`](screens/SCR-13-reports.html) |
| SCR-14 | Developer Files | `/site/:siteId/developer-files` | [`SCR-14-developer-files.html`](screens/SCR-14-developer-files.html) |
| SCR-15 | History | `/site/:siteId/history` | [`SCR-15-history.html`](screens/SCR-15-history.html) |
| SCR-16 | Site Settings | `/site/:siteId/settings` | [`SCR-16-settings.html`](screens/SCR-16-settings.html) |
| SCR-17 | Advanced Internal Data — warning gate | `/site/:siteId/advanced` | [`SCR-17-advanced-internal-data.html`](screens/SCR-17-advanced-internal-data.html) |

## Codex usage

Use these files before porting UI:

1. Open `docs/design/Kintone-Site-Discovery-HiFi.html` as the original visual source of truth.
2. Open `docs/design/static-extracted/index.html` and the per-screen files as readable implementation references.
3. Port the screen structure into reusable React components.
4. Preserve visual layout and component composition.
5. Do not add deploy, import, write-back, Git client, AI, rollback, or safe deploy behavior.
