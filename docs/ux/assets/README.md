# UX Assets

This folder is reserved for source wireframe/design artifacts.

## Wireframe V0

The original Claude Design output was provided as a bundled HTML file named:

```text
Kintone Site Discovery Wireframes.html
```

That bundled HTML is useful for visual review, but it is not the best primary source for Codex because it contains generated script/assets and is difficult to inspect as source text.

Codex should use these Markdown handoff files as the primary implementation reference:

- `../CLAUDE_DESIGN_PROMPT.md`
- `../WIREFRAME_V0_SUMMARY.md`
- `../WIREFRAME_V0_REVIEW.md`
- `../CODEX_FRONTEND_SCAFFOLD_BRIEF.md`
- `../../decisions/ADR-0001-read-only-discovery-mvp.md`

If the raw HTML artifact is needed for visual comparison, add it here as:

```text
kintone-site-discovery-wireframes-v0.html
```

Do not treat the raw HTML file as production UI source code.
