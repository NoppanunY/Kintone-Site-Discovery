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

## Visual verification notes

- Screens were checked against the Hi-Fi HTML at a 1240px app frame.
- Browser screenshot emission succeeded for the key T0-T4 views.
- Local disk screenshot saving was blocked by the runtime file-permission sandbox, so screenshots were emitted in the Codex thread instead of written under the repo.

## Known visual differences

- Browser fallback fonts may render slightly differently when IBM Plex fonts are not installed locally.
- Unicode stand-in icons are used instead of a production icon library.
- Some non-T4 screens are visual route placeholders and are not final behavior implementations.

## Next implementation plan

Continue with `docs/CODEX_NEXT_WINDOWS_DESKTOP_PLAN.md`.

The next batch is Windows desktop foundation only:

- N0 Baseline verification
- N1 Windows desktop runtime ADR
- N2 Desktop shell scaffold
- N3 Typed platform bridge stubs

Do not implement real kintone access, snapshot storage, scan runner, CLI behavior, deploy/import/write-back, Git client, AI, rollback, or safe deploy in the next batch.
