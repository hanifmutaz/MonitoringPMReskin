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

## Phase 7 — Migrate PM Part *(second vertical-slice target)*
- **Scope**: `PmPartMonitoringPage`, `PmPartFormPage`, `PmPartHistoryPage`, extract `domain/pm-part/`.
- **Dependencies**: Phases 3–6 (reuses Dashboard's established patterns).
- **Risks**: cross-CL counter aggregation logic must not be touched — this phase is presentation-only.
- **Acceptance criteria**: `usePmPartList` behaviour (server pagination, filter, `keepPreviousData`) unchanged; barcode scanning (`BarcodeScannerModal`) still functions; PM status calculation output identical before/after.
- **Testing required**: side-by-side comparison of PM status/counter values for a sample of parts, before and after.

## Phase 8 — Migrate PM Line (Monthly/Weekly)
- **Scope**: `PmLineStatusPage`, `PmLineFormPage`, `PmLineHistoryPage` — **read these files directly before designing `scheduling/` components**, per the architecture doc's explicit warning.
- **Risks**: highest unknown-risk phase currently, since these files haven't been read line-by-line yet in this audit.
- **Acceptance criteria**: PM Monthly accrual and Weekly formulas (doc §2.B/2.C) produce identical output; checklist submission flow unchanged.

## Phase 9 — Migrate Master Data
- **Scope**: `MasterDataPage` and its 6 existing `components/masterdata/` files — likely the *lowest*-risk migration since a domain-component precedent already exists here.
- **Risks**: referential-integrity constraint (can't delete a Part with PM history) must surface correctly in the UI, not just fail silently at the API.

## Phase 10 — Migrate Inventory
- **Scope**: `InventoryPage`, `InventoryHistoryPage`.
- **Risks**: the confirmed snake_case field leak in `GET /inventory/rop-status` must be normalised at the adapter boundary here, per `FRONTEND-ARCHITECTURE.md`.
- **Acceptance criteria**: `PackageRoute` upsell-in-place behavior for Package A instances preserved exactly.

## Phase 11 — Migrate Administration
- **Scope**: `UserManagementPage`, `SettingsPage`, `RecycleBinPage`, plus wherever Roles & Permissions is found to live (per `OPEN-QUESTIONS.md`).
- **Risks**: user approve/reject workflow (pending-approval state) must be preserved — this is real functionality not in the original product map.

## Phase 12 — Migrate Profile
- **Scope**: `ProfilePage`. Lowest-risk remaining page — open to all roles, no complex state.

## Phase 13 — Responsive and accessibility review
- **Scope**: systematic pass across all migrated pages against the brief's desktop/tablet/mobile rules and accessibility checklist — this is the first point where a real baseline exists to audit against (current responsive/a11y state is `Unknown` per the audit, not assessed pre-migration since there was nothing consistent yet to assess).

## Phase 14 — Remove confirmed dead code
- **Scope**: remove `components.css` `.badge-*`/legacy classes only after every call site (including `DashboardPage.badgeClassFor`) is confirmed migrated. Do not remove anything flagged `Unknown` in the audit without a fresh grep at this point in time (call sites may have shifted).

## Phase 15 — Final consistency audit
- **Scope**: re-run the same inspection checklist used for `FRONTEND-AUDIT.md` against the migrated codebase, confirm no `Unknown`s remain that should have been resolved, confirm token/spacing/density consistency across all pages.
