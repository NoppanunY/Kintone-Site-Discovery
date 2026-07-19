# Ideas and Proposals

This directory contains product and technical ideas that are worth preserving but have not yet been approved for implementation.

Documents in this directory are **non-binding**. They must not be treated as committed scope, an accepted specification, or an instruction for Codex or other implementation agents.

## Status lifecycle

Each idea should declare one of these statuses near the top of the document:

- `proposed` — captured for discussion; no decision has been made.
- `under-review` — actively being evaluated.
- `accepted` — approved in principle and ready to be promoted into the relevant specification or implementation plan.
- `parked` — retained for later consideration but not currently prioritized.
- `rejected` — considered and intentionally not pursued; retain the reasoning for future reference.

## Promotion rule

An accepted idea should not remain the implementation source of truth in this directory. Promote the accepted parts into the appropriate documents under `docs/`, update the implementation plan if needed, and leave a short decision record in the original idea document.

## Recommended idea structure

```text
# Idea title

Status: proposed
Created: YYYY-MM-DD
Decision owner: TBD

## Problem
## Proposed capability
## Scope boundaries
## Risks and constraints
## Open questions
## Decision record
```

## Current ideas

- [Browser Snapshot / HTML Capture](browser-snapshot.md) — capture the rendered HTML and related page data from the current browser page for user-directed later use.
