# DESIGN_TOKENS

Implementation-ready tokens for Kintone Site Discovery. Values match the hi-fi file (`Kintone Site Discovery HiFi.dc.html`). Ship as CSS custom properties (shown) or a JS/JSON theme object with the same names.

## Typography

Font families:
- **UI / headings:** `'IBM Plex Sans', system-ui, sans-serif`
- **Mono (IDs, filenames, paths, developer files):** `'IBM Plex Mono', monospace`

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| `type-display` | 27 / 1.15, -0.01em | 700 | Page H1 (`h-display`) |
| `type-h1` | 21 / 1.25 | 600 | Section / dialog title |
| `type-h2` | 16.5 / 1.3 | 600 | Card / block heading |
| `type-h3` | 14 / 1.35 | 600 | List-item title, sub-heading |
| `type-body` | 13.5 / 1.5 | 400 | Default body |
| `type-small` | 12.5 / 1.45 | 400 | Secondary text |
| `type-cap` | 11 / 1.3, 0.06em, uppercase | 500 | Labels / eyebrows |
| `type-mono` | 12.5 / 1.5 | 500 | Code, filenames, paths |

## Spacing scale (4px base)

`--sp-1:4 · --sp-2:8 · --sp-3:12 · --sp-4:16 · --sp-5:20 · --sp-6:24 · --sp-8:32 · --sp-10:40 · --sp-12:48`
Page padding 22–26. Card padding 18. List row padding 13/16. Gaps: control rows 9–11, stacks 12–18.

## Border radius

`--r-xs:5 · --r-sm:7 · --r-md:9 · --r-lg:13 · --r-xl:18 · --r-pill:999`
Buttons `r-sm` (sm buttons `r-xs`), inputs `r-sm`, cards/lists `r-lg`, app window `r-xl`, pills/toggles `r-pill`.

## Shadows

```
--sh-sm: 0 1px 2px rgba(16,24,40,.06), 0 1px 1px rgba(16,24,40,.04);   /* cards, buttons */
--sh-md: 0 6px 16px rgba(16,24,40,.09), 0 2px 4px rgba(16,24,40,.05);  /* popovers, dropdowns */
--sh-lg: 0 22px 48px rgba(16,24,40,.20), 0 6px 14px rgba(16,24,40,.10);/* modals, app window */
```

## Semantic colors

```
--bg:#eef0f3          /* app canvas / content bg */
--surface:#ffffff     /* cards, lists, panels */
--surface-2:#f7f8fa   /* content area, subtle fills */
--surface-3:#f1f3f6   /* tracks, tab strip */
--border:#e4e7ec      /* hairlines */
--border-strong:#d3d8e0 /* inputs, buttons, dividers under emphasis */
--overlay:rgba(23,30,42,.44) /* modal scrim */
--text:#161d29        /* primary text */
--text-2:#5a6473      /* secondary text */
--text-3:#8a93a2      /* muted / placeholder */
--primary:#2f5bd0     /* brand / primary action */
--primary-600:#2647a8 /* primary hover/pressed */
--primary-tint:#eaf0fd/* active nav, selected card, info bg */
--primary-ring:rgba(47,91,208,.28) /* focus ring */
```

## Status colors

| Status | Fg | Tint (bg) | Used by |
|---|---|---|---|
| Success / Completed | `--success #1f8a53` | `--success-tint #e6f4ec` | Completed, Connected, Redacted, Up to date, Integrity OK |
| Warning / with warnings | `--warn #b26a05` | `--warn-tint #fbf0dc` | Completed with warnings, Skipped, Sensitive, Needs update, Stale |
| Danger / Failed | `--danger #c23b32` | `--danger-tint #fbeae8` | Failed, error banners, destructive |
| Info / Running | `--info #2f5bd0` | `--info-tint #eaf0fd` | Running, Current snapshot, informational banners |
| Neutral / Idle | `--neutral #697586` | `--neutral-tint #eef1f4` | Idle, Not captured, Required-only, Advanced tag |

> Status vocabulary is fixed: **Completed · Completed with warnings · Failed**. Map exactly these strings to ok / warn / err.

## Button styles

| Variant | Fill | Border | Text | Height |
|---|---|---|---|---|
| `btn--primary` | `--primary` (hover `--primary-600`) | same | #fff | 36 (sm 29) |
| `btn` (secondary) | `--surface` (hover `--surface-2`) | `--border-strong` | `--text` | 36 (sm 29) |
| `btn--ghost` | transparent (hover `--surface-3`) | none | `--text-2` | 36 (sm 29) |
| `btn--danger` | `--danger` | `--danger` | #fff | 36 |

Padding 0 15 (sm 0 11). Font 600 13px (sm 12). Radius `r-sm`/`r-xs`. Disabled: opacity .45, no pointer events. Gap between icon+label 7px.

## Form styles

- Input / select: height 38, padding 0 12, border 1px `--border-strong`, radius `r-sm`, bg `--surface`, text 13.5px. Placeholder color `--text-3`.
- Focus: border `--primary` + `0 0 0 3px --primary-ring`.
- Checkbox: 18×18, radius 5, border 1.5px `--border-strong`; checked = `--primary` fill white check; locked = `--neutral` fill (disabled).
- Toggle: 38×22 pill; off `--border-strong`, on `--primary`; 18px white knob, `--sh-sm`.
- Label 600 12.5px; hint 11.5px `--text-3`.
- **SecretField:** renders fixed `••••••`, no reveal control, never bound to a readable value.

## Table / list styles

- List container: `--surface`, border 1px `--border`, radius `r-lg`, overflow hidden.
- Row (`li`): padding 13/16, 1px `--border` bottom hairline (none on last), hover `--surface-2`, 13px gap, vertical-center.
- Row title `type-h3`; row meta `type-small` `--text-3`.
- KPI cell: `--surface`, border `--border`, radius `r-md`, padding 14/16; number 24px/600 -0.02em; label 11.5px uppercase `--text-3`.
- FileOrderList: monospace; numbered index chip 22×22 radius 5 `--primary-tint`/`--primary`; never re-sorted.

## Icons

Line-weight glyphs (Lucide/Phosphor recommended in build). In this static mock, unicode stand-ins are used. Nav: Overview ◱, Apps ▤, Scan ◎, Local Snapshot ⛃, Reports ▦, Developer Files 〈〉, History ⟳, Settings ⚙, Advanced ⚑.
