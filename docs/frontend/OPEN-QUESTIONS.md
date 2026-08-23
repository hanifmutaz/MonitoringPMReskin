# Open Questions — PM Monitoring Frontend

## Blocking (need an answer before the relevant migration phase can start correctly)

1. **Where do Roles & Permissions live in the UI today, if anywhere?** `rolesApi.js` (`GET /roles`, `GET /roles/permissions`, `updateRolePermissions`) is fully implemented, but no dedicated route was found in `App.jsx`. Likely embedded in `/users` or `/settings`. Blocks: `ROUTE-MAP.md` finalization for this module, `MIGRATION-PLAN.md` Phase 11 scope.
2. **Where does Audit Log surface to users, if at all?** The append-only audit trigger exists at the data layer (`doc/003-audit-log-append-only-trigger.md`), but no confirmed frontend route/page was found. Blocks: whether Phase 11 needs to build a new page or just refine an existing one.
3. **Is PM Line Weekly vs. Monthly a mode/param within the existing three `PmLine*Page` files, or are they already visually distinct in ways not yet read?** Blocks: `scheduling/` component design in Phase 8 — building `ScheduleCalendar`/`Checklist` before this is confirmed risks designing against the wrong shape.
4. **Does `Part Detail` (and other "Detail" screens named in the product map) exist as a separate route, a drawer, or same-page expanded state today?** No dedicated detail route was found for PM Part, PM Line, Inventory, or User despite the product map treating Detail as a first-class node. Blocks: whether Phase 6–11 need new routes or just new in-page components.

## Non-blocking (can proceed with the stated default, but worth confirming)

5. **Toast system scope**: given the documented deliberate decision to use a persistent `Banner` instead of a toast for at least one save-confirmation flow, should a new Toast primitive be built at all, and if so, for which specific interaction types (e.g. background sync completion only, vs. also covering current Banner use cases)? Default assumed: build Toast narrowly for cross-cutting transient notifications, leave existing Banner-based confirmations alone.
6. **Design token decision (Set A vs Set B)**: `DESIGN-TOKENS.md` recommends keeping the existing `tokens.css` as authoritative over the blueprint's proposed palette, given its explicit "don't change without approval" governance comment. This is the single highest-leverage decision in the whole audit — recommend explicit written confirmation before Phase 1 (tokens) is considered closed, even though a default (keep existing) has been assumed throughout this document set.
7. **`MasterDataPage`'s Admin-only status**: it's not inside `App.jsx`'s `allowedRoles=['Admin']` route group, unlike Settings/Users/Recycle Bin. Is this intentional (e.g. Engineers also need Master Data access) or a gap? Default assumed: treat current behavior as intentional until told otherwise — do not add a role restriction as part of a "cleanup."
8. **Frontend test coverage**: no test infrastructure exists today. Is adding test coverage in scope for this migration (even minimally, e.g. smoke tests for `DataTable`/`Pagination`), or explicitly out of scope for this phase of work? Default assumed: out of scope per the brief's "do not create new business modules/scope" spirit, but flagged since it directly affects how safely Phases 3–15 can be verified.

## Assumptions to validate

9. Assumed `PmPartFormPage`/`PmLineFormPage` role restrictions match their parent monitoring pages (both currently sit outside the explicit `allowedRoles=['Admin']` group in `App.jsx`) — not verified against any internal role check inside those page components.
10. Assumed the existing four-Context state architecture (Auth/ConfirmDialog/PageHeader/Sidebar) is sufficient for all new shared UI state (e.g. a future Toast queue) rather than needing a new state library — based on the small, well-scoped nature of current contexts, not an exhaustive review of context complexity.
11. Assumed Tailwind v4's default breakpoints apply (no custom `tailwind.config.js`/breakpoint tokens found) — not confirmed against actual rendered behavior at tablet/mobile widths.
