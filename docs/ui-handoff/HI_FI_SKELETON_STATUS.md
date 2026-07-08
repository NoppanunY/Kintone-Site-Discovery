# Hi-Fi UI Skeleton Status

This note records the first UI skeleton batch implemented from the Claude Design reference.

## Implemented batch

- T0 Design tokens: centralized CSS variables based on `docs/design/Kintone-Site-Discovery-HiFi.html`.
- T1 Component library: internal React components matching the MVP component contracts.
- T2 App shell: title bar, menu bar, site tab bar, sidebar, and content frame.
- T3 Routing: logical routes from `ROUTING_SPEC.md` are represented in the mock SPA.
- T4 Onboarding: five-step first-run wizard using mock data only.

## Mock-only boundaries

- No kintone API calls.
- No scan runner.
- No snapshot storage.
- No credential storage.
- No CLI behavior.
- No write-back, deploy, import, Git client, AI, rollback, or safe deploy flow.

## Product model update

- Desktop mock now separates reusable Sites from Projects.
- `Site` means a reusable kintone target: display name, domain, and saved-site status. It does not own an auth profile.
- `Auth profile` means a reusable global credential identity.
- `Project` means a local folder/workspace that selects one Site and one Auth profile. Multiple Projects may reference the same Site/domain.
- The Home screen should show Projects, Sites, and Auth profiles as separate sections. Tabs and scan/snapshot/report/history routes are Project-scoped, while page copy still shows the linked Site for context.
- The New project wizard uses five steps: Project, Auth profile, Site, Test, Apps. The Test step validates the selected Site + Auth profile pair for that Project.

## Visual verification notes

- Screens were checked against the Hi-Fi HTML at a 1240px app frame.
- Browser screenshot emission succeeded for the key T0-T4 views.
- Local disk screenshot saving was blocked by the runtime file-permission sandbox, so screenshots were emitted in the Codex thread instead of written under the repo.

## Known visual differences

- Browser fallback fonts may render slightly differently when IBM Plex fonts are not installed locally.
- Unicode stand-in icons are used instead of a production icon library.
- Some non-T4 screens are visual route placeholders and are not final behavior implementations.
