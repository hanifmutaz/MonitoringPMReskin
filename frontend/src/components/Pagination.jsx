// src/components/Pagination.jsx
//
// Re-export shim. This component was relocated to
// components/data-display/Pagination.jsx (docs/frontend/MIGRATION-PLAN.md
// Phase 5) - kept here unchanged so the existing call sites
// (PmPartHistoryPage, PmLineHistoryPage, PmPartMonitoringPage,
// InventoryHistoryPage) don't need to change in this phase. New code
// should import from '../components/data-display/Pagination' directly;
// this file can be deleted once all call sites are migrated (tracked in
// Phase 6-10 of the migration plan, not yet done).
export { default } from './data-display/Pagination';
