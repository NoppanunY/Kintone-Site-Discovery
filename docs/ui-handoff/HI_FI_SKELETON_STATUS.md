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

## Desktop foundation status

- N0 Baseline verification is complete.
- N1 Windows desktop runtime ADR is complete: Electron is accepted in `docs/adr/0001-windows-desktop-runtime.md`.
- N2 Desktop shell scaffold is complete: the renderer runs inside the Windows desktop shell.
- N3 Typed platform bridge stubs are complete: runtime info, folder/open-folder stubs, window/tab state stubs, and credential-store status stubs are typed.
- The latest readiness pass completed with `pnpm typecheck`, `pnpm desktop:compile`, `git diff --check`, and `pnpm desktop:build` passing outside the sandbox. The sandboxed `desktop:build` still hits the known Vite/esbuild access block.

## Product model update

- Desktop mock now separates reusable Sites from Projects.
- `Site` means a reusable kintone target: display name, domain, and saved-site status. It does not own an auth profile.
- `Auth profile` means a reusable global credential identity.
- `Project` means a local folder/workspace that selects one Site and either one global Auth profile or a project-only auth draft created in the New project wizard. Multiple Projects may reference the same Site/domain.
- The Home screen should show Projects, Sites, and Auth profiles as separate sections. Tabs and scan/snapshot/report/history routes are Project-scoped, while page copy still shows the linked Site for context.
- The New project wizard uses five steps: Project, Auth profile, Site, Test, Apps. The Test step validates the selected Site + project auth pair for that Project.
- `Use new auth for this project` inside New project is project-only preview data and must not be added to Home > Auth profiles. The standalone Add Auth Profile flow remains the reusable global profile path.

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

The next batch is local foundation only:

- N4 Core domain package
- N5 Local workspace storage primitives

Do not implement real kintone access, scan runner, OS secure credential storage, CLI behavior, deploy/import/write-back, Git client, AI, rollback, or safe deploy in the next batch. N5 may add local metadata persistence and project-folder primitives, but not scan snapshot capture.
