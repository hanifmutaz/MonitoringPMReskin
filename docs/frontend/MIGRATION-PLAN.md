# Migration Plan — PM Monitoring Frontend

Sequence follows the default order from `02-IMPLEMENTATION-PROMPT.md`; nothing in the audit surfaced a reason to reorder it. Each phase is a separate, reviewable unit — do not start phase N+1 before phase N's acceptance criteria are confirmed.

## Phase 1 — Stabilise design tokens *(this document set)*
- **Scope**: documentation only (`DESIGN-TOKENS.md`), no code changes yet, plus getting explicit sign-off on the Set A vs Set B decision.
- **Affected files**: none yet.
- **Dependencies**: none.
- **Risks**: if the token decision isn't confirmed explicitly, later phases inherit an unstated assumption.
- **Acceptance criteria**: project owner confirms `tokens.css` stays authoritative.
- **Rollback**: n/a (no code changed).

## Phase 2 — Stabilise global feedback and state patterns
- **Scope**: decide the Toast scope question (see `OPEN-QUESTIONS.md`), define Empty/No-Result/Error/Stale as distinct presentational contracts (props, not just copy) for `EmptyState`.
- **Affected files**: none yet — this is a design decision phase, implementation happens in Phase 3.
- **Dependencies**: Phase 1 token decision.
- **Risks**: building Toast before resolving the existing anti-toast precedent could conflict with a considered prior product decision.
- **Acceptance criteria**: written state-pattern spec exists (states, props, copy ownership) before any component is built.
- **Rollback**: n/a.

## Phase 3 — Build or refactor primitives
- **Scope**: `ui/Card`, `ui/Badge`, `ui/Checkbox`, `ui/Tabs`, `ui/Skeleton`, `ui/EmptyState`, promote `Banner.jsx` → `ui/Alert`, build `ui/Toast` only if Phase 2 confirmed it's wanted.
- **Affected files**: new files under `components/ui/`; `Banner.jsx` moved/renamed with all call sites updated.
- **Dependencies**: Phase 1, Phase 2.
- **Risks**: `Checkbox` risk is real — `global.css` has a documented history of an `appearance:none` regression on checkboxes; any new `Checkbox` primitive must preserve the existing `appearance:auto` + `accent-color` fix, not reintroduce the bug.
- **Acceptance criteria**: each primitive has no PM/Inventory/Line domain knowledge; Storybook or equivalent visual check (`Unknown` if Storybook exists — if not, manual check against the blueprint reference is the fallback) confirms visual parity with existing `Button`'s quality bar; `npm run build` and `npm run lint` pass.
- **Rollback**: primitives are additive; revert the specific new files if an issue surfaces, no page depends on them yet.
- **Components created or reused**: see above.
- **Routes affected**: none directly yet.
- **Testing required**: manual visual check per component (no automated frontend test infra exists — see audit risk).

## Phase 4 — Build or refactor layout shell
- **Scope**: `layout/` folder (Sidebar, Header/Topbar, Breadcrumb (new), PageHeader (reconcile with existing `PageHeaderContext`), ContentContainer (only if needed), AppShell (documentation-level rename of `MainLayout`, not necessarily a file move).
- **Affected files**: `layouts/MainLayout.jsx`, `components/Sidebar.jsx`, `components/Topbar.jsx`, `contexts/PageHeaderContext.jsx` (read, not necessarily changed).
- **Dependencies**: Phase 3 primitives (Sidebar/Header will likely consume `ui/Button`, `ui/Tooltip`, etc.).
- **Risks**: `MainLayout` is not lazy-loaded (deliberately, since it wraps every protected route) — any new dependency pulled into it lands in every route's critical path; keep the shell lean.
- **Acceptance criteria**: every existing protected route still renders inside the shell with no visual regression; `SidebarProvider`/`PageHeaderProvider` context contracts unchanged.
- **Rollback**: shell changes are high-blast-radius (affects every page) — keep this phase small and test against multiple pages before merging.
- **Testing required**: manual check across at least Dashboard, PM Part Monitoring, Settings (three different densities) to confirm the shell doesn't assume one density.
- **Status (verified against codebase, 23 Aug 2026)**: functionally complete already, pre-dating this plan. `Sidebar.jsx` and `Topbar.jsx` are already fully Tailwind-reskinned with the icon-collapse behaviour, sticky positioning, and `SidebarContext`/`PageHeaderContext` wiring this phase describes as the target. `usePageHeader({ title, actions })` is already the established pattern, consumed by all 17 pages that set a header — this **is** the `layout/PageHeader` reconciliation, no change needed. `MainLayout.jsx` composition (`SidebarProvider` > `PageHeaderProvider` > Sidebar + Topbar + content-area Outlet + FooterStatusBar) matches the target `AppShell` contract; per `FRONTEND-ARCHITECTURE.md`'s own recommendation the file stays at its current path, "AppShell" remains a documentation-only label.
  - **Breadcrumb**: deferred, not built. No route today has a parent/child hierarchy for it to reflect — resolving Open Question #4 (whether Detail screens get dedicated routes) is a prerequisite, not this phase.
  - **ContentContainer**: deferred, not built. `.content-area` (`global.css`) already applies one uniform `max-width`/padding shell-wide; no page currently needs density-aware variant behaviour, so promoting it to a component now would be speculative.
  - No code changed in this phase as a result — see `OPEN-QUESTIONS.md` item 4 before revisiting Breadcrumb.

## Phase 5 — Build data-display foundation
- **Scope**: `data-display/DataTable`, `FilterBar`, relocate `Pagination` and `StatusBadge`, resolve the `components.css` `.badge-*` duplication (after completing the call-site grep named in the audit).
- **Affected files**: new `components/data-display/` folder; `components/Pagination.jsx` and `components/StatusBadge.jsx` moved; `DashboardPage.jsx`'s `badgeClassFor` usage migrated to the component.
- **Dependencies**: Phase 3, Phase 4.
- **Risks**: this is the highest-value, lowest-risk extraction per the audit (three call sites already share the exact envelope) — but the `.badge-*` cleanup specifically carries medium risk until the grep confirms all call sites.
- **Acceptance criteria**: `DataTable` correctly renders the verified `{ items, total, page, limit }` envelope for at least one real endpoint in a non-production test harness before Phase 6 wires it into the actual Dashboard/PM Part slice.
- **Rollback**: `Pagination`/`StatusBadge` moves should keep re-exports at their old paths temporarily if multiple pages need to migrate on different schedules.
- **Testing required**: manual pagination behaviour check (page nav, boundary pages, total=0) against the existing `PmPartMonitoringPage` to confirm no calculation regression.
- **Status (implemented, 23 Aug 2026)**: `Pagination` and `StatusBadge` relocated to `components/data-display/` with unchanged props/logic; old paths kept as re-export shims (same pattern as `Banner.jsx` → `ui/alert.jsx` in Phase 3) so their existing call sites need no changes this phase. `DataTable` and `FilterBar` built new and additive — composed from Phase 3's `Skeleton`/`EmptyState` primitives, verified against the representative PM Part envelope via a temporary smoke harness (removed after; build+lint clean, baseline bundle size unchanged since nothing imports them yet). The `.badge-*` grep is done: **zero live call sites found** — `badgeClassFor` no longer exists in `DashboardPage.jsx`, so that duplication was already resolved before this phase (by an earlier, undocumented reskin pass). Dead `.badge-*` rules in `components.css` are left for Phase 14, not removed here. No page wired to `DataTable`/`FilterBar` yet — that's Phase 6/7.

## Phase 6 — Migrate Dashboard *(first vertical-slice target, per `02-IMPLEMENTATION-PROMPT.md`)*
- **Scope**: `DashboardPage.jsx`, its 7 aggregate hooks, `KpiCard`, `LineStatusDonut`, `GanttUpcomingPanel`, `CriticalAlertsPanel`.
- **Affected files**: `pages/DashboardPage.jsx`, `pages/DashboardPmPartPage.jsx`, `pages/DashboardPmLineWeeklyPage.jsx`, associated components.
- **Dependencies**: Phases 3–5.
- **Risks**: the `dashboard/multi-site` endpoint's permission-denied behavior (letting a 403 propagate uncaught) must be preserved as a distinct panel-level state, not swallowed into a page-level error.
- **Acceptance criteria**: all 7 aggregate calls still render; multi-site permission-denied renders correctly for a non-permitted role; Comfortable density maintained (no operational tables introduced here, per brief §6).
- **Testing required**: manual check as Admin (full access) and as a role without `dashboard.multi_site` permission.
- **Status (verified against codebase, 24 Aug 2026)**: functionally complete, pre-dating this plan (undocumented reskin pass, same pattern as Phase 4/5). `DashboardPage.jsx`, `DashboardPmPartPage.jsx`, `DashboardPmLineWeeklyPage.jsx` fully Tailwind, composition matches brief §6 (KPI → Compliance/Ketepatan → Line Health donut → Priority Attention + Gantt). All 7 aggregate hooks confirmed wired (`useDashboardSummary`, `useDashboardAttention`, `useDashboardUpcoming`, `useDashboardPartSummary`, `useDashboardLineSummary`, `useDashboardKetepatanAttention`, `useDashboardMultiSite`). Multi-site 403 handled via `enabled: canSwitchSite` in the query itself (confirmed in `useDashboardExtras.js`) — a non-permitted role's query simply never fires, so the 403-as-distinct-panel-state risk noted above never materializes; this is a deliberate, already-documented design, not a gap.
  - **Decision: do NOT migrate to `DataTable`/`FilterBar` (Phase 5 primitives) here.** This isn't deferral — Dashboard structurally has no operational tables (per this phase's own acceptance criteria, "no operational tables introduced here"), so there is nothing in scope for `DataTable` to replace. Do not treat this as a precedent that hand-rolled tables elsewhere should also skip `DataTable` — Phases 7–11 *do* have real tables and need their own evidence-based call (see each phase's status note).

## Phase 6.5 — Cross-phase finding: hand-rolled tables in Phases 7–11 (decided 24 Aug 2026)
A repo-wide grep (`className=` tokens, stripped of Tailwind arbitrary-value brackets to avoid `font-[var(--font-mono)]` false-positives) across all Phase 7–12 pages plus `components/masterdata/*` found **zero live legacy `.panel`/`.data-table`/`.badge-*`/`.form-input`/`.form-select`/`.mono`/`.caption` classes** — every remaining match was inside a historical `// Reskin ...` comment, not an actual `className`. Every page/component already carries its own "Reskin (checklist §3 item N, batch M/N)" comment documenting when this happened. None of them consume `DataTable`/`FilterBar`.

**Decision: same as Phase 6 — do not force-migrate these hand-rolled tables to `DataTable`/`FilterBar`.** Unlike Phase 6, this *is* a deferral (these pages do have real operational tables), made on the same cost/benefit basis: no user-visible change, and these tables are already battle-tested (multiple iteration comments per file). `DataTable`/`FilterBar` remain reserved for genuinely new table surfaces — see Phase 11 update below (Audit Log).

## Phase 7 — Migrate PM Part *(second vertical-slice target)*
- **Scope**: `PmPartMonitoringPage`, `PmPartFormPage`, `PmPartHistoryPage`, extract `domain/pm-part/`.
- **Dependencies**: Phases 3–6 (reuses Dashboard's established patterns).
- **Risks**: cross-CL counter aggregation logic must not be touched — this phase is presentation-only.
- **Acceptance criteria**: `usePmPartList` behaviour (server pagination, filter, `keepPreviousData`) unchanged; barcode scanning (`BarcodeScannerModal`) still functions; PM status calculation output identical before/after.
- **Testing required**: side-by-side comparison of PM status/counter values for a sample of parts, before and after.
  - **`domain/pm-part/` extraction: done (24 Aug 2026)**, following the `components/masterdata/` precedent (`components/pm-part/`, not the brief's illustrative nested `components/domain/pm-part/` — same reconciliation rule as `pm-line` naming above). Moved: `WearRing.jsx`, `StatusFilterPills.jsx`, `BarcodeScannerModal.jsx`, `PmPartHistoryForm.jsx` (all confirmed single-domain via grep before moving — `WearRing`/`StatusFilterPills` only ever imported by `PmPartMonitoringPage`, `BarcodeScannerModal` only by `PmPartHistoryForm`). Extracted out of `PmPartMonitoringPage.jsx` into their own files: `KetepatanPerLinePanel.jsx` (was a local function component) and `pmPartColumns.jsx` (was a local `buildColumns()`). `api/pmPartApi.js`/`api/pmPartHistoryApi.js` and `hooks/usePmPartList.js`/`hooks/usePmPartHistory.js` deliberately **not** moved — those follow the app-wide flat per-resource convention (13 api modules, 24 hooks) that `domain/` extraction doesn't touch, per `FRONTEND-ARCHITECTURE.md`'s domain-layer note being about markup/UI pieces embedded in pages, not the API/hook layer. New `constants.js` consolidates a real duplication found during the move: `PmPartHistoryForm.jsx`'s `JENIS_OPTIONS` ([{value,label}]) and `PmPartHistoryPage.jsx`'s `JENIS_LABEL` ({value:label}) encoded the identical TERJADWAL/PM_EARLY/BROKEN enum in two shapes, in two files, with nothing enforcing they'd stay in sync - now one source, both shapes derived. Old flat files deleted outright (not shimmed) since every consumer was updated in this same commit — the Pagination/StatusBadge shim pattern from Phase 5 was for components with call sites staying untouched across phases, which doesn't apply here. Verified via build+lint (clean) and a grep for the old import paths (zero remaining) before deleting.
- **Status (verified against codebase, 24 Aug 2026, after `ca80ee9 phase 7 pm part component`)**: fully migrated — `PmPartMonitoringPage.jsx` now imports and uses `DataTable`/`FilterBar` (`data-display/DataTable.jsx`), confirmed via source (not just commit message). This supersedes the earlier note in this doc that had said "table hand-rolled and left as-is per Phase 6.5 decision" for this phase — that was accurate when written (before this commit landed) but is stale now; Phase 6.5's "don't force-migrate" default was a starting point per page, not a rule applied uniformly, and this phase's own author overrode it here with a documented rationale (see extraction paragraph above). `PmPartFormPage.jsx`/`PmPartHistoryPage.jsx` remain hand-rolled/reskinned-only, unaffected by this phase's DataTable adoption.
  - **New finding, not yet in any phase note**: `components/data-display/DataTable.jsx` has **no row-selection support** (confirmed via grep — no `selected`/`checkbox`/`onSelect` props or state). `PmLineHistoryPage.jsx` (Phase 8, still hand-rolled `<table>`) has real bulk-delete functionality built on row selection (`useRowSelection` hook, checkboxes, `useBulkDeleteMutation`). **If Phase 8 migrates `PmLineHistoryPage` to `DataTable` as-is, bulk-delete breaks** — `DataTable` needs a selection API added first, or that page needs to keep its own checkbox column layered on top of `DataTable` (needs a design decision, not just a mechanical migration like Phase 7's was for `PmPartMonitoringPage`, which has no bulk actions).
  - **Open Question #4 (Part Detail) resolved — decided 24 Aug 2026**: `pmPartApi.js` had a `getPmPartDetail(partId)` calling `GET /pm-part/:partId` (backend endpoint fully implemented, returns computed metrics + recent history), but it had **zero call sites in the frontend** — confirmed via grep. `PmPartMonitoringPage.jsx`'s two `<Modal>` usages are for "Ganti Part" (replacement action) and "Input Penggantian Part" (form), not a detail view. Decided out of scope (see `OPEN-QUESTIONS.md` Resolved #8 for full reasoning) — building a Detail modal is new scope this reskin's brief never asked for, unlike Inventory's `ItemDetailModal` which served existing demand. The dead `fetchPmPartDetail` wrapper has been removed from `pmPartApi.js`; the backend endpoint is untouched.

## Phase 8 — Migrate PM Line (Monthly/Weekly)
- **Scope**: `PmLineStatusPage`, `PmLineFormPage`, `PmLineHistoryPage`, extract `pm-line/` — **read these files directly before designing `scheduling/` components**, per the architecture doc's explicit warning.
- **Risks (re-assessed 24 Aug 2026, all three files read line-by-line — see status note below for what changed)**: no longer "highest unknown-risk" — the actual risk is narrower and specific: `PmLineHistoryPage` has real bulk-delete (`useRowSelection`, `BulkDeleteBar`, `SelectAllAcrossPagesBar`, checkbox column, "select all matching filter" via re-fetch with `limit=total`) that Phase 7's `DataTable` migration pattern doesn't cover as-is (see Phase 7's new finding: `DataTable` has no selection support). If this page is migrated to `DataTable`, that's the one part needing new design, not a mechanical copy of Phase 7's approach.
- **Acceptance criteria**: PM Monthly accrual and Weekly formulas (doc §2.B/2.C) produce identical output; checklist submission flow unchanged.
- **Status (verified against codebase, 24 Aug 2026, all three files read line-by-line)**: visual reskin already done across all three files (`PmLineStatusPage.jsx` "batch 2/N", `PmLineFormPage.jsx` "batch 3/N", `PmLineHistoryPage.jsx` "batch 3/N") — no live legacy classes, hand-rolled tables left as-is (Phase 6.5 default holds here — neither page has Phase 7's override rationale). Each file's own comment confirms data/logic untouched by the reskin pass.
  - **Open Question #3 resolved**: Monthly and Weekly are **not** a mode/param split across the three `PmLine*Page` files — `PmLineStatusPage.jsx` renders both cycles' columns (`tgl_pm_monthly_terakhir`/`akumulasi_poin_monthly`/`sisa_hari_monthly`/`status_monthly` AND the `_weekly` equivalents) side-by-side in the same row, same table, same page (10 columns total, confirmed by reading the `<thead>` array directly). There is no separate "Weekly mode" of this page. This directly informs `scheduling/` component design (previously blocked): a `ScheduleCalendar`/`Checklist` component, if built, needs to represent one Line's two cycles simultaneously, not switch between them.
  - **New finding: `PmLineFormPage` is now largely redundant, but intentionally kept.** `PmLineStatusPage.jsx` already has its own "Input PM" modal with no line preset (`showInputForm` state) — the exact same no-preset use case `PmLineFormPage`'s standalone route serves. Confirmed via `Sidebar.jsx` comment: the `/pm-line/form` route is deliberately still live but removed from the nav menu ("Route /pm-line/form TETAP HIDUP, cuma gak lagi muncul di menu") when the modal was added to `PmLineStatusPage`. Not a bug — a conscious decision already made and documented at the point of change, just noting it here so Phase 8 doesn't "fix" it as an accidental duplication.
  - **`pm-line/` extraction readiness**: `PmLineHistoryForm.jsx` (the one component shared by all three pages) is single-domain — confirmed via grep, its only consumers are `PmLineHistoryPage.jsx`, `PmLineFormPage.jsx`, `PmLineStatusPage.jsx`. Same pre-condition Phase 7 checked before moving `WearRing`/`StatusFilterPills`. Safe to extract into `components/pm-line/` following the exact Phase 7 precedent, whenever this phase is picked up.

## Phase 9 — Migrate Master Data
- **Scope**: `MasterDataPage` and its 6 existing `components/masterdata/` files — likely the *lowest*-risk migration since a domain-component precedent already exists here.
- **Risks**: referential-integrity constraint (can't delete a Part with PM history) must surface correctly in the UI, not just fail silently at the API.
- **Status (verified against codebase, 24 Aug 2026)**: reskin already done for `MasterDataPage.jsx` and all 6 `components/masterdata/*.jsx` files (each carries its own "batch N/N" comment, e.g. `LinesTab.jsx` batch 1/N "lock the pattern", `SuppliersTab.jsx`/`PartsTab.jsx` following it, `InventoryTab.jsx` batch 5/N last) — no live legacy classes anywhere in the folder. Tables hand-rolled, left as-is per Phase 6.5.
  - **Open Question #7 not re-litigated here**: `MasterDataPage` still sits outside `App.jsx`'s `allowedRoles=['Admin']` group — confirmed unchanged, treating as intentional per the existing default.

## Phase 10 — Migrate Inventory
- **Scope**: `InventoryPage`, `InventoryHistoryPage`.
- **Risks**: the confirmed snake_case field leak in `GET /inventory/rop-status` must be normalised at the adapter boundary here, per `FRONTEND-ARCHITECTURE.md`.
- **Acceptance criteria**: `PackageRoute` upsell-in-place behavior for Package A instances preserved exactly.
- **Status (verified against codebase, 24 Aug 2026)**: `InventoryHistoryPage.jsx` reskinned (batch 5/N — last). `InventoryPage.jsx` itself has no `<table>` and no legacy classes because it delegates its table entirely to `components/masterdata/InventoryTab.jsx` (also already reskinned, batch 5/N) — **the same component Phase 9's `MasterDataPage` uses**. This wasn't obvious from the phase list (Phase 9 and 10 look independent) but they share one table implementation; any future table-level change here (DataTable migration or otherwise) affects both phases at once, not just one.

## Phase 11 — Migrate Administration
- **Scope**: `UserManagementPage`, `SettingsPage`, `RecycleBinPage`, plus wherever Roles & Permissions is found to live (per `OPEN-QUESTIONS.md`).
- **Risks**: user approve/reject workflow (pending-approval state) must be preserved — this is real functionality not in the original product map.
- **Status (verified against codebase, 24 Aug 2026)**: `UserManagementPage.jsx` (3 tables), `SettingsPage.jsx`, `RecycleBinPage.jsx` all reskinned, no live legacy classes.
  - **Open Question #1 resolved**: Roles & Permissions live **inside `UserManagementPage.jsx`** as additional tabs/sections in the same file (confirmed: `permissionCatalog`, `updatePermissions.mutateAsync`, role permission-editing table all present in `UserManagementPage.jsx`, not a separate route). No separate migration target needed — it's already covered by this phase's existing scope line for `UserManagementPage`.
  - **Open Question #2 resolved, differently than assumed**: Audit Log has **no frontend surface at all** — no route in `App.jsx`, no page file, confirmed via grep. This is not "needs refining," it needs to be **built new**. Since it would be a genuinely new table (not a migration of an existing hand-rolled one), this is the one place in Phase 7–12 where using the new `DataTable`/`FilterBar` (Phase 5) is the right default per the reasoning in Phase 6.5 — new surface, no existing implementation to risk regressing.

## Phase 12 — Migrate Profile
- **Scope**: `ProfilePage`. Lowest-risk remaining page — open to all roles, no complex state.
- **Status (verified against codebase, 24 Aug 2026)**: already reskinned, no legacy classes, no table (profile form only, matches "no complex state" expectation above).

## Phase 13 — Responsive and accessibility review
- **Scope**: systematic pass across all migrated pages against the brief's desktop/tablet/mobile rules and accessibility checklist — this is the first point where a real baseline exists to audit against (current responsive/a11y state is `Unknown` per the audit, not assessed pre-migration since there was nothing consistent yet to assess).

## Phase 14 — Remove confirmed dead code
- **Scope**: remove `components.css` `.badge-*`/legacy classes only after every call site (including `DashboardPage.badgeClassFor`) is confirmed migrated. Do not remove anything flagged `Unknown` in the audit without a fresh grep at this point in time (call sites may have shifted).

## Phase 15 — Final consistency audit
- **Scope**: re-run the same inspection checklist used for `FRONTEND-AUDIT.md` against the migrated codebase, confirm no `Unknown`s remain that should have been resolved, confirm token/spacing/density consistency across all pages.
