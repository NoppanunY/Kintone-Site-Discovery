# Claude Design Prompt: Wireframe V0

Date: 2026-07-03

This prompt was used to generate the first low-fidelity wireframe set for the Kintone Site Discovery desktop app.

```text
You are helping design a desktop app for Kintone Site Discovery.

Use the repository specs as the source of truth.

First, create low-fidelity wireframes only. Do not create high-fidelity UI, branding, colors, or final visual design yet.

The current MVP is a read-only kintone pull/discovery/export tool. It should help users:

1. Create/open a local project.
2. Manage auth profiles/accounts.
3. Add and manage kintone site workspaces.
4. Open each site as a separate tab.
5. Fetch app list.
6. Select apps.
7. Choose scan categories.
8. Run scan.
9. Review reports, exports, scan history, errors, and local folders.

Important constraints:

- The app must be simple enough for non-developer kintone admins.
- Advanced raw/internal data should not be prominent.
- Credentials and secrets must never be shown or written to project files.
- Required scan options must be checked and disabled.
- Plugin asset capture, sample records, and full record export must be opt-in.
- Preserve JavaScript/CSS file order in reports and export views.

Please produce:

1. Main navigation structure.
2. Page list.
3. User flow diagram in text.
4. Low-fidelity wireframes for each main screen.
5. Empty/loading/error/success states.
6. Suggested component hierarchy.
7. UX risks and simplification opportunities.
8. Questions that must be answered before high-fidelity design.
```

## Intended use

Use this prompt as traceability for `WIREFRAME_V0_SUMMARY.md`, `WIREFRAME_V0_REVIEW.md`, and `CODEX_FRONTEND_SCAFFOLD_BRIEF.md`.

Codex should not treat the generated wireframe as final visual design. It is a temporary UX scaffold for MVP discussion and frontend skeleton planning.
