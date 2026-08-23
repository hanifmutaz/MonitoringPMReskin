# Frontend Audit — PM Monitoring

Produced by direct inspection of `hanifmutaz/MonitoringPMReskin` (branch `master`, commit `e726079 fix-production-cache`), against `01-PRODUCT-UX-BRIEF.md`, `03-CURRENT-CODEBASE.md`, `04-REPRESENTATIVE-DATA.md`, and the interactive blueprint. Every line below is `Verified`, `Interpretation`, or `Unknown` — treat unmarked lines as `Verified`.

## Verified current stack

- React 18.3.1, Vite 6.4.3, plain JavaScript/JSX — **no TypeScript** anywhere in `frontend/`.
- Routing: react-router-dom v7, 20 pages, route-based code splitting via `React.lazy` (only `LoginPage` is eager — deliberate, per its own code comment about avoiding an unnecessary round-trip on the one page everyone hits first).
- Server state: TanStack Query v5 + axios, one `api/*.js` module per resource (13 modules), one `hooks/use*.js` wrapper per resource (24 hooks). `usePmPartList` uses `placeholderData: keepPreviousData` — this is the confirmed pattern for smooth server-paginated refetching.
- Client state: four React Contexts (`Auth`, `ConfirmDialog`, `PageHeader`, `Sidebar`) — no Redux/Zustand/Jotai.
- Styling: Tailwind CSS v4 (`@tailwindcss/vite`, CSS-first config, no `tailwind.config.js`) layered with hand-written CSS in `tokens.css` / `global.css` / `components.css`, imported in that order in `main.jsx` (confirmed load order matters — see Cascade Layers note below).
- UI primitives: Radix UI (`alert-dialog`, `dialog`, `label`, `select`, `slot`, `tooltip`) + `class-variance-authority` + `tailwind-merge` + `clsx` — this is the shadcn/ui pattern without the CLI, hand-assembled in `components/ui/`.
- Icons: lucide-react. Dates: dayjs. Barcode scanning: `@zxing/browser` + `@zxing/library` (`BarcodeScannerModal.jsx`), confirming factory-floor iPad scanning is real and live, not aspirational.
- Auth: JWT in HttpOnly cookie (documented rationale in `doc/001-httponly-cookie-vs-localstorage.md`), session bootstrapped via `authApi.fetchMe()` on app load in `AuthContext`.

## Verified project structure

See the full tree in `03-CURRENT-CODEBASE.md`. Key structural facts confirmed by direct read, not just directory listing:

- `components/ui/` (8 files) is the only primitive layer that exists today. There is **no dedicated `Card`, `Badge` (as a primitive — `StatusBadge` is domain-flavoured), `Tabs`, `Drawer`, `Skeleton`, `EmptyState`, or `Toast`/notification-toast primitive.**
- `components/masterdata/` (6 files) is the only existing "domain component" folder — a precedent for the `domain/` layer proposed in the brief, scoped to Master Data only so far.
- No `data-display/` or `scheduling/` folder exists yet — `Pagination.jsx` and `StatusBadge.jsx` currently live loose in `components/`.

## Reusable assets (high confidence — build on these, don't replace)

- **`usePmPartList` + `Pagination.jsx` + the `{ items, total, page, limit }` envelope.** This is the single strongest asset in the codebase for the brief's "1.2M+ records, server-side everything" constraint. It's already correct: server params in, current-page-only out, `keepPreviousData` for smooth refetch. The identical envelope shape is repeated verbatim in `inventoryApi`, `pmPartHistoryApi`, and `GET /inventory/movements/all` — meaning a generalised `DataTable` + `usePaginatedResource(endpoint, params)` hook is a very low-risk extraction, not new design.
- **`components/ui/button.jsx`** — a clean CVA-variant Radix Slot button (`default/destructive/outline/secondary/ghost/link` × `default/sm/lg/icon`) with `focus-visible:ring-2` already wired. This is production-ready as the `ui/Button` primitive; no rebuild needed.
- **RBAC + package-gating split** (`ProtectedRoute` vs `PackageRoute`) — two deliberately different UX behaviours (redirect vs. render-upsell-in-place) already correctly separated into two composable route guards. Reuse both as-is.
- **`AuthContext.hasPermission()`** — already implements the `'*'`-wildcard-for-Admin pattern matching the backend's `permissionMiddleware.js`, with an explicit comment that this is UX-only and the backend remains the enforcer. This is exactly the discipline the brief asks for ("backend TETAP jadi penegak utama") — already followed, not something to introduce.
- **Cascade Layers discipline in `global.css`**: the codebase has already hit and fixed two real Tailwind v4 + `@layer` bugs (a base-layer specificity bug that broke `LinesTab` text colors, and a checkbox `appearance:none` regression during bulk-delete work) — both are documented inline with root cause. **Any new global CSS must go through `@layer base`/`@layer utilities` deliberately**, this is a proven footgun in this specific codebase, not a generic warning.

## Duplication (verified, not assumed)

- `StatusBadge.jsx`'s own header comment states that its CSS-class equivalents (`.badge`, `.badge-ok`, `.badge-warning`, `.badge-danger` in `components.css`) are **still used directly** — bypassing the component — in `DashboardPage.jsx` via a local `badgeClassFor` helper, and "tempat lain yang belum dimigrasi" (other not-yet-migrated places, unspecified). This is a live, self-documented partial migration, not a hypothesis.
- `components.css` (310 lines) still exists in full alongside the Tailwind migration — its exact remaining call sites beyond `DashboardPage` are `Unknown` and need a grep-level pass before Phase 2 removes anything.

## Technical risks

- **No toast/notification-toast library or component exists.** `grep`-ing the entire `src/` tree for "toast" only turns up two code *comments* explicitly discussing why a persistent `Banner` was chosen over a toast for a save-completion message (`PmPartFormPage.jsx`, `PmPartMonitoringPage.jsx`) — i.e., the team has already made a **deliberate product decision** to prefer persistent inline confirmation over transient toasts for at least one flow. `01-PRODUCT-UX-BRIEF.md` §9 calls for a toast system (success/warning/error/information) — this is a genuine gap to fill, but the existing anti-toast reasoning for save-confirmation flows should be read before adding a global toast system that might get misused for the same case it was deliberately avoided in.
- **No frontend test suite at all** — no `test` script in `frontend/package.json`, no test files found under `frontend/src`. The backend has `node --test`; frontend has nothing. Any Phase-2-onward refactor of shared primitives is currently **unguarded by regression tests** — manual verification against the acceptance criteria in each migration phase is the only safety net until this is addressed (out of scope to fix here, but must be named as a standing risk).
- **snake_case leak into an otherwise camelCase API surface**: `GET /inventory/rop-status` returns fields the source comment itself writes in snake_case (`konsumsi_spare_per_hari`, `kebutuhan_spare`, `safety_stock`, `rop`, `order_qty`) while the rest of the inventory/pm-part surface is camelCase. This must be handled at a data-adapter boundary, not normalised silently — otherwise a future dev will "fix" it inconsistently per call site.
- **No shared Card, Tabs, Drawer, Skeleton, or EmptyState primitive** despite these being load-bearing in the brief's density model (Structured density, tabbed Master Data, etc.). `MasterDataPage`'s existing tab UI is hand-rolled (no Radix Tabs dependency present) — its exact implementation needs a direct read before deciding refactor vs. replace.
- **No form library** (`react-hook-form`/`formik` absent) and **no validation library** (`zod`/`yup` absent) — form state and validation appear to be local `useState` per page. This is workable but means a shared `ui/Input`/`ui/Select` primitive can't assume a form-library integration contract; confirm the actual pattern per-page (e.g. `PmPartFormPage.jsx`) before designing `ui/` form primitives.

## UX inconsistencies

- Partial Tailwind migration leaves two parallel styling systems live simultaneously (Tailwind utility classes + legacy `components.css` classes), confirmed at minimum for status badges on `DashboardPage`.
- No confirmed shared Empty/No-Result/Error/Stale state components — brief §8 explicitly requires these to be visually distinct; current implementation status per-page is `Unknown` and must be sampled (e.g. `PmPartMonitoringPage`, `InventoryPage`) before Phase 2.

## Accessibility risks

- **Positive finding, verified**: `global.css` already has an explicit `:focus-visible` rule and comments confirming keyboard focus visibility was a deliberate concern during the reskin (not accidentally preserved). This is a real asset, not a risk — carry the same discipline into new primitives.
- Icon-only buttons (`IconButton`-style usage, e.g. pagination chevrons in `Pagination.jsx`) — screen-reader labelling (`aria-label`) on these is `Unknown`, not confirmed present or absent; sample and confirm in Phase 2.
- Table semantics (`<table>` vs. div-grid) for the hand-rolled tables: `Unknown`, needs a direct read of one representative table (e.g. `PmPartMonitoringPage`) before `COMPONENT-INVENTORY.md`'s `DataTable` spec can commit to a semantic base element.

## Performance risks

- Route-level code splitting is already implemented and its rationale documented (reduced initial bundle from ~1MB to ~129KB, per prior stated project history) — this is a maintained asset, not a risk, but any new shared primitive imported eagerly into `MainLayout` (which is *not* lazy) will land in every route's critical path. New `AppShell`/`Sidebar`/`Header` work should be weighed against this bundle-splitting discipline.
- No virtualisation library present (no `react-window`/`react-virtual`) — consistent with the brief's "don't add virtualisation by default" guidance; nothing to change here unless a specific dense table proves it's needed.

## Likely migration impact

- **Low risk**: extracting `Pagination` + the paginated-list pattern into a shared `data-display/DataTable` + `usePaginatedResource` hook. Three call sites already share the identical envelope.
- **Medium risk**: reconciling `tokens.css` vs. the blueprint's proposed palette (see `DESIGN-TOKENS.md`) — touches every component that reads a CSS variable, but is additive/renaming, not logic-changing.
- **Medium risk**: introducing a toast system, given the documented deliberate anti-toast decision on at least one save flow — needs a product decision on scope, not just a component build.
- **Higher risk**: touching `components.css` / the legacy `.badge-*` classes, because their full set of remaining call sites is unconfirmed (`Unknown`) — do not remove until a full grep-and-verify pass is done (this is exactly why `MIGRATION-PLAN.md` places dead-code removal near the end, not the start).

## Items that must remain unchanged

PM status/counter calculation, ConMas sync and its graceful-degradation behaviour, RBAC (`allowedRoles` + `requiredPermission`) enforcement, package-gating behaviour (`PackageRoute`'s render-in-place upsell, not redirect), audit log semantics, HttpOnly-cookie session handling, the `{ items, total, page, limit }` API envelope. See `03-CURRENT-CODEBASE.md` for the full verified list with source citations.

## Unknowns requiring evidence (do not resolve without reading the file)

- Exact remaining call sites of `components.css` `.badge-*`/`.tab-item`/`.btn` classes beyond `DashboardPage.badgeClassFor`.
- Whether `Card` exists as an ad hoc pattern anywhere, or is genuinely absent everywhere.
- `MasterDataPage`'s actual tab implementation (hand-rolled vs. hidden dependency).
- Exact frontend-facing field names for PM Line Weekly/Monthly (`pmLineApi.js`, `PmLineFormPage.jsx`, `PmLineStatusPage.jsx` not yet read line-by-line).
- Whether a dedicated Audit Log frontend route/page exists anywhere outside `App.jsx`'s confirmed route list (none found there).
- Icon-only button accessible-labelling coverage.
- Table semantic markup (`<table>` vs div-grid) across pages.
- Whether a `browserslist`/target-browser policy exists beyond Vite defaults.
