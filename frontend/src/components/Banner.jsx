// src/components/Banner.jsx
//
// Re-export shim. This component was promoted to components/ui/alert.jsx
// (docs/frontend/MIGRATION-PLAN.md Phase 3) - kept here unchanged so the
// 4 existing call sites (PmPartHistoryForm, PmPartFormPage, PmLineFormPage,
// PmLineStatusPage) don't need to change in this phase. New code should
// import { Alert } from '../components/ui/alert' directly; this file can
// be deleted once all 4 call sites are migrated (tracked in Phase 3/6-8
// of the migration plan, not yet done).
export { Alert as default } from './ui/alert';
