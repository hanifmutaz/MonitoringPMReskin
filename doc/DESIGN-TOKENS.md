# Design Tokens — PM Monitoring

## Reconciliation decision (read this before touching any CSS)

Two token sets exist:

**A — Currently in production**, `frontend/src/styles/tokens.css`:
```css
--bg:#0d1117; --panel:#151b23; --panel-2:#1b222c; --panel-3:#212a36;
--border:#252e3a; --border-soft:#1c232d;
--text:#e7ebf0; --text-dim:#8d97a6; --text-faint:#5c6675;
--accent:#4c8dff; --accent-dim:rgba(76,141,255,.14);
--ok:#34c77b; --warn:#f5a623; --danger:#f5484b;
--font-display:'Space Grotesk'; --font-body:'Inter'; --font-mono:'IBM Plex Mono';
--radius:12px; --radius-sm:8px;
--space-1..5: 4/8/12/14/16/18/22px;
--sidebar-width:300px; --content-max-width:1400px;
```
Its own header comment states it was taken **exactly** from an internal `05_UI_UX_SPECIFICATION.md` and is explicitly marked "JANGAN ubah nilai di sini tanpa persetujuan eksplisit" (do not change without explicit approval). The `--sidebar-width` value has a documented history of being deliberately changed once already (280px → 300px) through an explicit chat request — proving this file is actively governed, not stale.

**B — Proposed in the blueprint / `01-PRODUCT-UX-BRIEF.md` §10**:
```css
--background:#0F172A; --sidebar:#111827; --surface:#172033; --surface-raised:#1B263B;
--border:#28364D; --text-primary:#F1F5F9; --text-secondary:#A3B1C6; --text-muted:#708198;
--primary:#3B82F6; --success:#22C55E; --warning:#F59E0B; --danger:#EF4444; --information:#38BDF8;
font: "Segoe UI Variable", "Segoe UI", Arial, sans-serif;
radius: control 8px / card 10px / panel 10px / dialog 12px / badge 6px-or-pill;
spacing: 4,8,12,16,20,24,32;
```

**Decision: Set A (existing `tokens.css`) wins.** Reasoning:
1. It's explicitly approved and governed — the brief's own precedence rules (`02-IMPLEMENTATION-PROMPT.md`) place "existing business behaviour and validated domain rules" above the blueprint, and a design-review-approved token file with an explicit change-control comment qualifies as validated, not just incidental.
2. Set B is sourced from the *blueprint HTML*, which `01-PRODUCT-UX-BRIEF.md` §15 itself says is "not... a final permission model... not evidence that every displayed sample value is production data" — the same logic applies to its embedded CSS variables.
3. Overwriting a token file with an explicit "don't change without approval" comment, based on a visual reference document, is exactly the kind of silent business-decision override the brief prohibits in its "Hard scope constraints."

**Action**: do not copy Set B's hex values into `tokens.css`. Instead, map every semantic role the brief uses (`--background`, `--primary`, `--success`, etc.) onto the existing equivalent (`--bg`, `--accent`, `--ok`, etc.) via a documentation table (below), and use that table when reading the blueprint for density/hierarchy/layout guidance — translate its colors mentally to the production palette rather than importing its literal values. **This decision should be confirmed explicitly with the project owner before Phase 2 starts** — it's the single highest-leverage call in this whole audit and is flagged again in `OPEN-QUESTIONS.md` as non-blocking-but-should-be-explicit.

## Semantic mapping table (Set B name → Set A production token)

| Brief/blueprint token | Production token | Notes |
|---|---|---|
| `--background` | `--bg` | |
| `--sidebar` | *(no direct equivalent — sidebar currently uses `--side`-equivalent styling inline/in `components.css`, `Unknown` exact token)* | Confirm in Phase 2 whether Sidebar needs its own token or reuses `--panel`. |
| `--surface` | `--panel` | |
| `--surface-raised` | `--panel-2` or `--panel-3` (two raised levels exist in production vs. one in the blueprint — production has *more* granularity, keep it) | |
| `--border` | `--border` (same name, different value — production wins) | |
| `--text-primary` | `--text` | |
| `--text-secondary` | `--text-dim` | |
| `--text-muted` | `--text-faint` | |
| `--primary` | `--accent` | |
| `--success` | `--ok` | |
| `--warning` | `--warn` | |
| `--danger` | `--danger` (same name) | |
| `--information` | *(no direct equivalent in production — `Unknown`, likely reuses `--accent`)* | Confirm before building any "information" toast/badge variant. |
| Font stack (Segoe UI) | `--font-display` (Space Grotesk) / `--font-body` (Inter) / `--font-mono` (IBM Plex Mono) | Production already has a considered three-font system; do not collapse to the blueprint's single Segoe UI stack. |
| Radius 8/10/10/12/6-pill | `--radius` (12px) / `--radius-sm` (8px) — production has two radius tokens, not four | Confirm in Phase 2 whether card/panel/dialog need distinct radii or the existing two-token system is sufficient (it likely is — most of the brief's distinctions collapse to "small control" vs. "everything else"). |
| Spacing 4/8/12/16/20/24/32 | `--space-1..5` (4/8/12/14/16/18/22) | Production's scale is denser at the top end (22 vs 32 max) — **do not add a `--space-6/7` to reach 24/32 without confirming a real layout needs it**; the brief's scale may simply be more generous than what this specific dark, dense, industrial UI calls for. |

## Density definitions (new — not previously formalized in the codebase)

These don't exist as named tokens today; they're compositional rules using the existing spacing/radius scale, per `01-PRODUCT-UX-BRIEF.md` §5:

- **Comfortable** (Login, Dashboard): generous use of `--space-5` (22px) and above between sections, single-column or wide-grid KPI layout, larger type scale for headline numbers.
- **Compact** (Line Monitoring, Schedule, Inventory Summary): `--space-3`/`--space-3-5` (12–14px) between elements, card-grid or summary-row layout.
- **Dense** (Operational Tables, History, Audit Log): `--space-1`/`--space-2` (4–8px) row padding, `--font-mono` for numeric columns (already the established pattern — `Pagination.jsx` and `StatusBadge.jsx` both already use `--font-mono` for counts/labels, extend this consistently).
- **Structured** (Details, Checklist, Settings): `--space-4`/`--space-4-5` (16–18px) between label-value groups, single or two-column form grid.

## Focus / disabled / hover / active states

- **Focus**: `global.css` already defines `:focus-visible` with the accent color, explicitly preserved as an accessibility requirement during the reskin. Reuse this rule for every new primitive — do not redefine focus styling per-component.
- **Disabled**: `button.jsx` already establishes the pattern (`disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed`) — reuse this exact utility combination for Input/Select/Checkbox when built.
- **Hover**: `button.jsx` uses `hover:opacity-90` (filled variants) / `hover:bg-secondary` (outline/ghost variants) — reuse this split by variant type for other interactive primitives.
- **Active**: `Unknown` — no explicit `:active` styling confirmed yet in `button.jsx` or elsewhere; verify whether this is intentional (relying on browser default) or a gap before Phase 2.

## Semantic badge behaviour

Confirmed via `StatusBadge.jsx`: `OK` (green/`--ok`), `WARNING` (amber/`--warn`), `DANGER` (red/`--danger`), plus a `FALLBACK` (muted/`--panel-3` + `--text-faint`) for unrecognized status strings — this fallback behavior is a good existing pattern (never renders a broken/blank badge) and should be preserved in the generalized `data-display/StatusBadge`.

## Elevation rules

`Unknown` — no `box-shadow` tokens found in `tokens.css`. Production currently distinguishes surfaces by background color layering (`--panel` → `--panel-2` → `--panel-3`) rather than shadow. Brief §10 says "shadow only for genuinely elevated surfaces" — this is consistent with the existing no-shadow-by-default approach; only add shadow tokens if a genuinely elevated surface (e.g. a Dialog/Drawer) needs one and doesn't already have layering-based separation.

## Responsive breakpoints

`Unknown` — no breakpoint tokens found in `tokens.css`, and Tailwind v4's CSS-first config means breakpoints may be using Tailwind defaults (`sm/md/lg/xl` = 640/768/1024/1280px) rather than custom values. Confirm in Phase 2 before writing any responsive rule that assumes custom breakpoints exist.
