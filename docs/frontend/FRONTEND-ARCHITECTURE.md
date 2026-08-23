# Frontend Architecture Proposal — PM Monitoring

Recommendation: **incremental restructuring on top of the existing codebase**, not a greenfield rewrite. The existing stack (React 18 + Vite + TanStack Query + Radix/CVA/Tailwind) is already the right stack for the brief's requirements — the gap is a missing shared component layer (`data-display/`, `scheduling/`, a fuller `ui/`), not a wrong foundation.

## Layout architecture

Current: `MainLayout.jsx` composes `Sidebar` + `Topbar` + `content-area` (`Outlet`) + `FooterStatusBar`, wrapped in `SidebarProvider` + `PageHeaderProvider`.

Recommendation: promote this into the brief's target `layout/AppShell` naming without changing its composition contract:

- `layout/AppShell` = current `MainLayout.jsx`, renamed/relocated only if it doesn't break the route tree in `App.jsx`. **Prefer keeping the file at its current path and treating "AppShell" as a documentation term for it**, unless a rename is explicitly requested — an unforced rename is exactly the kind of unnecessary business-logic-adjacent churn the brief warns against.
- `layout/Sidebar`, `layout/Header` (= current `Topbar.jsx`), `layout/Breadcrumb` (new — not currently present, `Unknown` if any breadcrumb exists today, verify before building), `layout/PageHeader` (current `PageHeaderContext` + wherever it's consumed — needs a direct read), `layout/ContentContainer` (new — currently just a `content-area` div in `MainLayout`, promote to a component only if it needs variant behaviour, e.g. density-aware max-width).

## Design-token strategy

See `DESIGN-TOKENS.md` for the full reconciliation. Summary: **keep `tokens.css` as the base**, treat the blueprint's palette as superseded by the already-approved production tokens (per the explicit "JANGAN ubah nilai di sini tanpa persetujuan eksplisit" comment in `tokens.css`), and extend — not replace — with any *new* tokens the brief introduces that don't already exist (e.g. explicit density-level spacing presets, if not already covered by `--space-*`).

## Primitive component layer (`ui/`)

Existing: `button`, `input`, `label`, `select`, `textarea`, `tooltip`, `dialog`, `alert-dialog` (all Radix-based).

To build, in priority order (per Migration Plan phase 3): `Card`, `Badge` (domain-agnostic — distinct from `StatusBadge`, which stays a `data-display` component), `Checkbox` (currently raw `<input type="checkbox">` with a documented `appearance:auto` fix in `global.css` — wrap it once the appearance bug is understood, don't refight it), `Tabs` (needed for `MasterDataPage` and the brief's Structured-density tabs rule), `Skeleton`, `EmptyState`, `Alert` (promote `Banner.jsx` into this slot — it already matches the brief's "Inline Alert" description functionally), `Toast` (new — see risk note in `FRONTEND-AUDIT.md` about the existing deliberate anti-toast decision on save flows; scope this carefully, likely for cross-cutting async operations rather than blanket-replacing every existing confirmation pattern).

Rule carried over from the brief and already respected by the existing `button.jsx`/`Banner.jsx`: primitives take `children`/`variant`/`tag`-style generic props, never a PM- or Inventory-specific prop.

## Data-display layer

New folder, `components/data-display/`. Core piece: generalise `Pagination.jsx` + the `usePmPartList` pattern into:

- `data-display/DataTable` — presentational, takes columns + rows + the verified `{ items, total, page, limit }` shape, renders states (loading/refreshing/empty/no-result/error) via composed `Skeleton`/`EmptyState`/`Alert`, not its own bespoke state markup.
- `data-display/FilterBar`, `data-display/ColumnControl` — new, no existing equivalent found; scope minimally to what `PmPartMonitoringPage`'s actual filters need (read that page directly before designing the props).
- `data-display/Pagination` — move `Pagination.jsx` here as-is; **props and logic are explicitly documented as unchanged through the Tailwind reskin already** — do not touch the calculation logic again, only its location.
- `data-display/StatusBadge` — move `StatusBadge.jsx` here; this is the point to also resolve the `components.css` `.badge-*` duplication named in the audit, but only after the full call-site grep is done.

## Scheduling layer

New folder, `components/scheduling/`. No existing equivalent — PM Line Weekly/Monthly currently lives in `PmLineStatusPage.jsx`/`PmLineFormPage.jsx`/`PmLineHistoryPage.jsx` with `Unknown` internal structure (not yet read line-by-line). **Do not design `ScheduleCalendar`/`Checklist` props before reading those three files** — the brief is explicit that Monthly/Weekly should not be forced to copy PM Part's shape, and the existing PM Line pages are the actual source of truth for what data they already render.

## Domain component layer

Existing precedent: `components/masterdata/` (6 files: `LinesTab`, `PartsTab`, `SuppliersTab`, `ClMappingModal`, `PartSupplierModal`, `ImportMasterDataTab`). Extend this pattern to `pm-part/`, `pm-line/` (brief calls this "monthly-pm"/"weekly-pm" — reconcile naming with the codebase's actual `pm-line` terminology, don't introduce a second name for the same thing), `inventory/`, `administration/`. Populate these folders by extracting the domain-specific pieces currently embedded directly in page files, incrementally, one page per migration phase — not all at once.

## Page composition layer

Existing: 20 files in `pages/`, already route-code-split. Keep this structure. Pages become thinner as domain/data-display components absorb their current markup, but the page-per-route file organization itself doesn't need to change.

## State-handling strategy

Keep TanStack Query as the sole server-state layer (already correctly scoped — no need for a second state library). Keep the four existing Contexts for cross-cutting client state (auth, sidebar, page header, confirm dialog) — this is a small, well-scoped set, not sprawl. New shared UI state (e.g. a toast queue, if built) should follow the same Context pattern already established, for consistency, rather than introducing a new state paradigm.

## Responsive strategy

`Unknown` — no responsive audit has been done yet on the current pages (see Open Questions). Before writing new responsive rules, sample at least `PmPartMonitoringPage` (Dense) and `DashboardPage` (Comfortable) at tablet/mobile breakpoints to establish an actual baseline, per the brief's "do not merely shrink desktop layouts" rule.

## Error and feedback strategy

Given the audit finding that toasts were deliberately avoided for at least one save flow: the recommended approach is **Banner/Alert-first**, with a Toast primitive added only for genuinely transient, non-blocking cross-page notifications (e.g. "sync completed in background") — not as a blanket replacement for existing persistent confirmation patterns. This needs explicit confirmation from the project owner before Phase 2 builds the Toast primitive, since it touches a documented prior product decision — see `OPEN-QUESTIONS.md`.

## Data-adapter boundary between UI and API

New, thin layer: keep the existing `api/*.js` modules as the transport layer (already clean — one file per resource, already unwrap `.data.data`), and introduce adapter functions only where a verified inconsistency exists — currently, exactly one confirmed case: the snake_case fields in `GET /inventory/rop-status`. Normalise at the point where `useInventoryItems`-style hooks return data, not inside components.

## Approach for preserving current business behaviour

Every migration phase in `MIGRATION-PLAN.md` treats "business behaviour preserved" as an explicit acceptance criterion, verified against the list in `03-CURRENT-CODEBASE.md`'s "Existing Business-Critical Behaviour" section and this audit's "Items that must remain unchanged" section — not re-derived per phase.
