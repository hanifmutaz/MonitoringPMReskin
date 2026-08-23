// src/components/pm-part/constants.js
//
// New (docs/frontend/MIGRATION-PLAN.md Phase 7 - domain/pm-part/
// extraction). The jenis_penggantian enum (TERJADWAL/PM_EARLY/BROKEN) was
// duplicated in two shapes across two files before this: PmPartHistoryForm
// had JENIS_OPTIONS ([{value,label}], for the Select), PmPartHistoryPage
// had JENIS_LABEL ({value: label}, for the table cell). Same values, same
// labels, no drift today - but nothing enforced that. One source now;
// JENIS_LABEL is derived from JENIS_OPTIONS, not maintained separately.
export const JENIS_OPTIONS = [
  { value: 'TERJADWAL', label: 'Terjadwal' },
  { value: 'PM_EARLY', label: 'PM Early' },
  { value: 'BROKEN', label: 'Broken' },
];

export const JENIS_LABEL = Object.fromEntries(JENIS_OPTIONS.map((opt) => [opt.value, opt.label]));
