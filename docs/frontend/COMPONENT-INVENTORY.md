# Component Inventory — PM Monitoring

Status legend: **Existing** = present, keep as-is. **Refactor** = present, needs internal changes but same responsibility. **Replace** = present, but wrong shape, rebuild against the same call sites. **Merge** = duplicate logic to consolidate. **New** = no equivalent exists.

## `ui/` (primitives — must stay domain-agnostic)

| Component | Status | Current location | Responsibility | Domain knowledge allowed | Major props | States | Notes |
|---|---|---|---|---|---|---|---|
| Button | Existing | `components/ui/button.jsx` | Generic action trigger | None | `variant, size, asChild, className` | default/hover/focus-visible/disabled (all present) | Production-ready, CVA variants already cover the brief's semantic set. Do not rebuild. |
| Input | Existing | `components/ui/input.jsx` | Text entry | None | `Unknown — not yet read directly` | `Unknown` | Read before Phase 2; likely fine given Button's quality bar. |
| Select | Existing | `components/ui/select.jsx` | Choice entry | None | `Unknown` | `Unknown` | Radix-based — confirm keyboard/aria behaviour inherited correctly. |
| Label | Existing | `components/ui/label.jsx` | Form label | None | `Unknown` | — | — |
| Textarea | Existing | `components/ui/textarea.jsx` | Multi-line entry | None | `Unknown` | `Unknown` | — |
| Tooltip | Existing | `components/ui/tooltip.jsx` | Contextual hint | None | `Unknown` | — | Radix-based. |
| Dialog | Existing | `components/ui/dialog.jsx` | Modal | None | `Unknown` | — | Brief says "no small modal for complex detail" — audit which current dialogs are used for complex content and flag for migration to a full-page/Drawer pattern instead. |
| AlertDialog | Existing | `components/ui/alert-dialog.jsx` | Confirmation modal | None | `Unknown` | — | Likely backs `ConfirmDialogContext` — confirm the link before touching either. |
| Checkbox | New (currently raw `<input type="checkbox">`) | n/a — used inline (e.g. bulk-delete rows) | Selection toggle | None | `checked, onChange, accent-*` | checked/unchecked/indeterminate (`Unknown` if indeterminate is used) | `global.css` has a documented fix restoring native `appearance:auto` for checkboxes/radios after a global reset regression — read that comment before wrapping this in a component so the fix isn't accidentally undone. |
| Card | New | none found | Content container | None | `Unknown — design in Phase 2` | — | Confirmed absent; used ad hoc via divs per audit. |
| Badge | New (domain-agnostic) | none — `StatusBadge` exists but is domain-flavoured | Generic label pill | None (contrast with `StatusBadge` below) | `variant, children` | — | Distinct from `StatusBadge`; `StatusBadge` moves to `data-display/`. |
| Tabs | New | none — `MasterDataPage` likely hand-rolls tabs (`Unknown`, no Radix Tabs dependency in package.json) | Tabbed navigation within a page | None | `Unknown — design in Phase 2` | — | Read `MasterDataPage.jsx` before designing; may be extractable from its existing markup rather than built fresh. |
| Skeleton | New | none — `PageLoader.jsx` exists but is route-level, not component-level | Loading placeholder | None | `Unknown` | — | — |
| EmptyState | New | none | Empty/no-result/error/permission-denied/stale display | None — copy is domain-specific but supplied via props, never hardcoded | `icon, title, description, action` | n/a (this component *is* a state) | Per brief §8, needs distinct presets or at least distinct prop values for Empty/No-Result/Error/Stale — do not collapse into one generic "No Data" look. |
| Alert (inline) | Existing (rename candidate) | `components/Banner.jsx` | Contextual message for a form/section | None — `children, tag` already generic | `children, tag` | — | Functionally already matches the brief's "Inline Alert" description. Promote into `ui/`, keep props unchanged (explicitly documented as stable through the reskin). |
| Toast | New | none — confirmed absent, see audit | Transient cross-page notification | None | `Unknown — design in Phase 2, product decision needed first` | — | **Do not build until the open question about the existing anti-toast decision is resolved** (see `OPEN-QUESTIONS.md`). |

## `data-display/`

| Component | Status | Current location | Responsibility | Domain knowledge allowed | Major props | States | Pages using it | Migration notes |
|---|---|---|---|---|---|---|---|---|
| Pagination | **Done (Phase 5)** | `components/data-display/Pagination.jsx` (`components/Pagination.jsx` is now a re-export shim) | Page navigation for a list | None | `page, limit, total, onPageChange` (verified, unchanged) | — | `PmPartMonitoringPage`, `PmPartHistoryPage`, `PmLineHistoryPage`, `InventoryHistoryPage` (all still import the shim path) | Calculation logic untouched, only relocated. Page-level imports migrate to the direct path in Phase 6-10, not this phase. |
| StatusBadge | **Done (Phase 5)** | `components/data-display/StatusBadge.jsx` (`components/StatusBadge.jsx` is now a re-export shim) | OK/Warning/Danger status pill | PM/Inventory status semantics — allowed domain knowledge, not a `ui/` primitive | `status` | OK/WARNING/DANGER/fallback | `DashboardPmLineWeeklyPage`, `PmPartMonitoringPage`, `PmLineStatusPage` (all still import the shim path) | The `components.css` `.badge-*` duplication named in the original audit is confirmed **already resolved** — a repo-wide grep at relocation time found zero live `className` usages of `.badge`/`.badge-*` (`badgeClassFor` no longer exists in `DashboardPage.jsx`). The dead CSS rules remain for Phase 14 cleanup. |
| DataTable | **Wired into PmPartMonitoringPage (Phase 7), PmLineStatusPage/PmLineHistoryPage (Phase 8), LinesTab/PartsTab/InventoryTab×2 (Phase 9)** | `components/data-display/DataTable.jsx` | Presentational table: renders columns/rows against the verified envelope + loading/refreshing/empty/error states | None — receives columns/rows via props, all state copy caller-supplied | `columns, rows, getRowKey, isLoading, isRefreshing, isError, errorState, emptyState, page, limit, total, onPageChange, skeletonRows, selection` | loading (skeleton rows, accounts for the selection column too when present) / refreshing (dimmed, rows stay visible) / populated / empty / error — no-result is caller-composed via the exported `DataTableNoResult` helper, since only the page knows whether zero rows means "no data" or "filters matched nothing" | `selection` (added Phase 8, opt-in, shape matches `useRowSelection`'s return value) | Confirmed via 7 live consumers + clean `npm run build`/`eslint`. `page/limit/total/onPageChange` are all optional as a set — `PmLineStatusPage` omits them entirely since its API returns a flat unpaginated array. `LinesTab` (Phase 9) is the first *client-side*-paginated consumer. `PartsTab`/`InventoryTab`'s item list (Phase 9) are server-side paginated with `SelectAllAcrossPagesBar` composed above, same pattern as Phase 7/8. `InventoryTab`'s movement-history table (inside `ItemDetailModal`, Phase 9) is the first consumer to omit `page`/`limit`/`total` **and** `selection` together — just `columns`/`rows`/`isLoading`/`emptyState`, confirming the loading/empty/populated states alone are useful without either optional feature. `ImportMasterDataTab.jsx` was evaluated and deliberately **not** migrated — its per-row `include` checkbox is row data (via `updateRow`), not `useRowSelection`-style bulk-action selection, and it needs a sticky header `DataTable` doesn't support; forcing it into `selection` would be a category mismatch, not a fit. Sorting/column-filter callbacks still intentionally **not** included — still no page needs them. |
| FilterBar | **Built, not yet wired (Phase 5)** | `components/data-display/FilterBar.jsx` | Layout wrapper for filter controls above a table (wrap + gap + actions-push-right) | None | `children, actions, className` | — | None yet | Deliberately thin — generalises exactly the `flex flex-wrap items-center gap-3` + `ml-auto` pattern already working in `PmPartMonitoringPage.jsx`'s filter row. Does not know about search/select/pills; those stay as the existing domain components composed as children. |
| ColumnControl | New | none | Show/hide table columns | None | `Unknown` | — | None yet — only build if a real page needs it; brief lists it as a capability, not confirmed as currently used anywhere. |
| ActivityList | New | `Unknown` — may overlap with `CriticalAlertsPanel.jsx`/`NotificationBell.jsx` | Recent activity feed | None | `Unknown` | — | Check `CriticalAlertsPanel.jsx` and `NotificationBell.jsx` before building — may already partially exist under different names. |
| DetailField | New | none | Label-value pair in a Structured-density detail view | None | `label, value, span` | — | Needed once Part Detail / Inventory Detail vertical slices are built. |


## `scheduling/`

| Component | Status | Current location | Responsibility | Notes |
|---|---|---|---|---|
| ScheduleCalendar | New | none — needs `PmLineStatusPage.jsx` read first | Calendar/schedule view for PM Line | Do not design before reading the actual page; brief explicitly says don't force Monthly/Weekly to copy PM Part's shape. |
| ScheduleSummary | New | none | Summary panel for schedule | Same as above. |
| ScheduleStatus | New | none | Status indicator for a schedule item | May be able to reuse `StatusBadge` rather than building a parallel component — check before building. |
| Checklist | New | none — `PmLineFormPage.jsx` likely contains the actual submission UI today | PM checklist execution UI | Extract from `PmLineFormPage.jsx`, don't design from scratch. |

## `domain/`

| Folder | Status | Notes |
|---|---|---|
| `masterdata/` (existing name, brief expects lowercase-hyphen convention like others — reconcile naming, low priority) | Existing | 6 files, already a working precedent for the whole `domain/` layer. Use its file-per-tab pattern as the template for other domains. |
| `pm-part/` (`components/pm-part/`, not the nested `components/domain/pm-part/` the brief illustrates — see `MIGRATION-PLAN.md` Phase 7) | **Done (24 Aug 2026)** | 7 files: `WearRing.jsx`, `StatusFilterPills.jsx`, `BarcodeScannerModal.jsx`, `PmPartHistoryForm.jsx` (all relocated from flat `components/`), `KetepatanPerLinePanel.jsx` + `pmPartColumns.jsx` (extracted out of `PmPartMonitoringPage.jsx`), `constants.js` (new — single source for the `jenis_penggantian` enum, replacing a real two-shape duplication found during the move). `PmPartFormPage`/`PmPartHistoryPage` updated to import from here. `api/pmPartApi.js` etc. stay in the app-wide flat `api/`/`hooks/` layer, not moved. |
| `pm-line/` (brief says "monthly-pm"/"weekly-pm" — codebase term kept, see `ROUTE-MAP.md` note) | Done (24 Aug 2026) | `PmLineHistoryForm.jsx` moved here from flat `components/`. Two new column-definition files added: `pmLineColumns.jsx` (`PmLineStatusPage`, 10 cols) and `pmLineHistoryColumns.jsx` (`PmLineHistoryPage`, 7 cols) — following the `pm-part/pmPartColumns.jsx` precedent. `OnTimeBadge` deliberately stayed in flat `components/` (also used by `PmPartHistoryPage.jsx`, cross-domain). |
| `inventory/` | New | Extract from `InventoryPage`, `InventoryHistoryPage`. |
| `administration/` | New | Extract from `UserManagementPage`, `SettingsPage`, `RecycleBinPage`, and wherever Roles & Permissions turns out to live (see `OPEN-QUESTIONS.md`). |

## `layout/`

| Component | Status | Current location | Notes |
|---|---|---|---|
| AppShell | Existing (document only, don't rename by default) | `layouts/MainLayout.jsx` | See `FRONTEND-ARCHITECTURE.md`. |
| Sidebar | Existing | `components/Sidebar.jsx` | Move to `layout/` folder in Phase 2 if adopting the new folder structure; check `SiteSwitcher.jsx` for whether it's a Sidebar sub-component. |
| Header | Existing | `components/Topbar.jsx` | Rename to `Header` only in documentation/new-folder terms unless the team wants the file renamed too. |
| Breadcrumb | New/`Unknown` | not found in a dedicated file | Check `PageHeaderContext` usage — may already render something breadcrumb-like inside `Topbar`. |
| PageHeader | Existing (context, not component — reconcile) | `contexts/PageHeaderContext.jsx` | The brief expects a `PageHeader` *component*; codebase currently has a `PageHeaderContext`. Read its consumer(s) before deciding whether a wrapping component is needed or the context alone suffices. |
| ContentContainer | New (trivial) | currently an inline `content-area` div in `MainLayout.jsx` | Only extract into a component if density-aware behaviour (e.g. max-width per density level) is actually needed — don't over-abstract a single div prematurely. |
| FooterStatusBar | Existing, no brief equivalent named | `components/FooterStatusBar.jsx` | Likely shows sync status (ties to `dashboardApi.fetchSyncStatus`) — keep as-is, it's a real existing feature not covered by the brief's layout list, don't remove it to match the brief exactly. |
