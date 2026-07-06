# Static Hi-Fi Prototype

Readable static HTML/CSS reference for Codex visual-parity work.

This prototype is derived from the approved Claude Design high-fidelity HTML:

- `../Kintone-Site-Discovery-HiFi.html`

Use this folder as the **implementation reference** for layout, component composition, and screen structure. The bundled Hi-Fi HTML remains the original visual source of truth; this folder is the readable static reference that Codex should port into React.

## Files

- `index.html` — navigation index for all 17 reference screens.
- `styles/prototype.css` — extracted/simplified design tokens and component CSS.
- `screens/*.html` — one standalone HTML page per screen.

## Screen map

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

## Codex rules

Codex should:

1. Port this static prototype into reusable React components.
2. Preserve the app frame, title bar, menu bar, site tab bar, sidebar, content layout, cards, buttons, forms, pills, tables, banners, and modals.
3. Use `Local Snapshot` as the canonical output.
4. Use `Reports` and `Developer Files` as views generated from Local Snapshot.
5. Avoid `Exports` terminology.
6. Keep MVP read-only: no deploy, import, write-back, Git client, AI, rollback, or safe deploy.
7. Stop after visual parity for the requested implementation batch and provide screenshots.

Do not treat this static prototype as production application code. It is a design implementation reference.
