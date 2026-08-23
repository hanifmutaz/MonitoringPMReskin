// src/components/StatusBadge.jsx
//
// Re-export shim. This component was relocated to
// components/data-display/StatusBadge.jsx (docs/frontend/MIGRATION-PLAN.md
// Phase 5) - kept here unchanged so the existing call sites
// (DashboardPmLineWeeklyPage, PmPartMonitoringPage, PmLineStatusPage)
// don't need to change in this phase. New code should import from
// '../components/data-display/StatusBadge' directly; this file can be
// deleted once all call sites are migrated (tracked in Phase 6-8 of the
// migration plan, not yet done).
export { default } from './data-display/StatusBadge';
