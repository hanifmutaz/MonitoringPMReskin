// src/components/data-display/StatusBadge.jsx
//
// Relocated from components/StatusBadge.jsx (docs/frontend/MIGRATION-PLAN.md
// Phase 5). Props (status) and visual output unchanged - only the file's
// location changes. components/StatusBadge.jsx now re-exports this file.
//
// Re-verified at relocation time (23 Aug 2026): the legacy `.badge`/
// `.badge-ok`/`.badge-warning`/`.badge-danger`/`.badge-muted` CSS classes
// in components.css that the original comment said were "still used
// directly in DashboardPage.jsx (badgeClassFor)" are NO LONGER referenced
// anywhere in the codebase - a repo-wide grep found zero live className
// usages of those classes (badgeClassFor itself no longer exists in
// DashboardPage.jsx). That duplication the audit flagged is already
// resolved; the dead `.badge-*` rules in components.css remain for Phase
// 14 (confirmed dead code removal) to clean up, not this phase.
const CONFIG = {
  OK: { label: 'OK', bg: 'bg-ok-dim', text: 'text-ok', dot: 'bg-ok' },
  WARNING: { label: 'Warning', bg: 'bg-warn-dim', text: 'text-warn', dot: 'bg-warn' },
  DANGER: { label: 'Danger', bg: 'bg-danger-dim', text: 'text-danger', dot: 'bg-danger' },
};
const FALLBACK = { bg: 'bg-[var(--panel-3)]', text: 'text-[var(--text-faint)]', dot: 'bg-[var(--text-faint)]' };

function StatusBadge({ status }) {
  const normalized = (status || '').toUpperCase();
  const cfg = CONFIG[normalized] || FALLBACK;
  const label = cfg.label || status;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-[10px] py-[3px] text-xs font-[var(--font-mono)] ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
}

export default StatusBadge;
