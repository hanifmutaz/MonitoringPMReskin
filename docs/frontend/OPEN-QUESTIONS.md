# Open Questions — PM Monitoring Frontend

## Resolved (verified against codebase, 24 Aug 2026 — see MIGRATION-PLAN.md Phase 7/8/11 status notes for detail)

1. **Roles & Permissions location**: inside `UserManagementPage.jsx` (same file, additional tabs/sections) — not a separate route. No new migration target needed.
2. **Audit Log frontend surface**: does not exist — no route in `App.jsx`, no page file. Phase 11 needs to *build* this, not refine an existing page. Recommended as the one place to default to the new `DataTable`/`FilterBar` primitives (Phase 5), since it's genuinely new rather than a migration of a battle-tested hand-rolled table.
3. **PM Line Weekly vs Monthly structure**: not a mode/param split — `PmLineStatusPage.jsx` shows both cycles' columns side-by-side per Line in one table. Any `scheduling/` component built later needs to represent both cycles at once.
4. **Part Detail existence — checked across all 4 modules**: pattern is **not uniform**, resolved per module:
   - **PM Part**: backend endpoint exists (`GET /pm-part/:partId`), frontend `pmPartApi.getPmPartDetail()` has zero call sites — dead capability, not built.
   - **PM Line**: no detail endpoint on backend at all (`pmLineRoutes.js` only has `GET /`) — no gap on either side, Detail genuinely isn't a concept here.
   - **Inventory**: backend endpoint exists (`GET /inventory/:id`, `GET /inventory/:id/movements`) **and is consumed** — `components/masterdata/InventoryTab.jsx`'s `ItemDetailModal` calls `useInventoryItemDetail`/`useInventoryMovements`. Already built, as a modal (not a route). No gap.
   - **User**: no detail endpoint on backend (`userManagementRoutes.js` only has `GET /`) — same as PM Line, not a concept here.
   - **Net finding**: PM Part is the *only* module with a real gap (built on backend, unused on frontend).
5. **`doc/` vs `docs/frontend/` duplication**: confirmed `docs/frontend/` is canonical — 8 component files (`ui/badge.jsx`, `ui/alert.jsx`, `ui/tabs.jsx`, `ui/card.jsx`, `data-display/DataTable.jsx`, `data-display/FilterBar.jsx`, `data-display/Pagination.jsx`, `data-display/StatusBadge.jsx`, plus `components/Pagination.jsx`/`StatusBadge.jsx` shims) reference `docs/frontend/*.md` in comments; zero code anywhere referenced `doc/*.md` for these same files. The 7 duplicated frontend files (`COMPONENT-INVENTORY.md`, `DESIGN-TOKENS.md`, `FRONTEND-ARCHITECTURE.md`, `FRONTEND-AUDIT.md`, `MIGRATION-PLAN.md`, `OPEN-QUESTIONS.md`, `ROUTE-MAP.md`) have been removed from `doc/` — that folder now holds only its original backend ADRs (`001`–`007`, `Architecture.md`, `PROJECT_SCOPE.md`, `SECURITY_REVIEW.md`), untouched.

## Blocking (need an answer before the relevant migration phase can start correctly)

1. **Is `pmPartApi.getPmPartDetail()` (dead code — implemented, unused) intentional scaffolding for a future Detail view, or safe to remove?** Now confirmed as PM Part's own isolated gap (see #4 above — every other module either has no detail concept or already built and wired it as a modal). Recommend either: (a) build a PM Part detail modal following Inventory's exact pattern (`ItemDetailModal` in `InventoryTab.jsx` as the reference implementation), or (b) remove the unused API function if Detail is out of scope for PM Part. Leaving it unused indefinitely is the one option not recommended.

## Non-blocking (can proceed with the stated default, but worth confirming)

5. **Toast system scope**: given the documented deliberate decision to use a persistent `Banner` instead of a toast for at least one save-confirmation flow, should a new Toast primitive be built at all, and if so, for which specific interaction types (e.g. background sync completion only, vs. also covering current Banner use cases)? Default assumed: build Toast narrowly for cross-cutting transient notifications, leave existing Banner-based confirmations alone.
6. **Design token decision (Set A vs Set B)**: `DESIGN-TOKENS.md` recommends keeping the existing `tokens.css` as authoritative over the blueprint's proposed palette, given its explicit "don't change without approval" governance comment. This is the single highest-leverage decision in the whole audit — recommend explicit written confirmation before Phase 1 (tokens) is considered closed, even though a default (keep existing) has been assumed throughout this document set.
7. **`MasterDataPage`'s Admin-only status**: it's not inside `App.jsx`'s `allowedRoles=['Admin']` route group, unlike Settings/Users/Recycle Bin. Is this intentional (e.g. Engineers also need Master Data access) or a gap? Default assumed: treat current behavior as intentional until told otherwise — do not add a role restriction as part of a "cleanup."
8. **Frontend test coverage**: no test infrastructure exists today. Is adding test coverage in scope for this migration (even minimally, e.g. smoke tests for `DataTable`/`Pagination`), or explicitly out of scope for this phase of work? Default assumed: out of scope per the brief's "do not create new business modules/scope" spirit, but flagged since it directly affects how safely Phases 3–15 can be verified.

## Assumptions to validate

9. Assumed `PmPartFormPage`/`PmLineFormPage` role restrictions match their parent monitoring pages (both currently sit outside the explicit `allowedRoles=['Admin']` group in `App.jsx`) — not verified against any internal role check inside those page components.
10. Assumed the existing four-Context state architecture (Auth/ConfirmDialog/PageHeader/Sidebar) is sufficient for all new shared UI state (e.g. a future Toast queue) rather than needing a new state library — based on the small, well-scoped nature of current contexts, not an exhaustive review of context complexity.
11. Assumed Tailwind v4's default breakpoints apply (no custom `tailwind.config.js`/breakpoint tokens found) — not confirmed against actual rendered behavior at tablet/mobile widths.
