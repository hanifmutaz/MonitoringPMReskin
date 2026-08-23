// src/components/ui/alert.jsx
//
// Promoted from components/Banner.jsx per docs/frontend/MIGRATION-PLAN.md
// Phase 3. Props (children, tag) are UNCHANGED from Banner.jsx - that file
// itself already documents its visual output as stable through the earlier
// Tailwind reskin, so this move only relocates the component, it does not
// redesign it. Banner.jsx now re-exports this file so its 4 existing call
// sites (PmPartHistoryForm, PmPartFormPage, PmLineFormPage,
// PmLineStatusPage) keep working without being touched in this phase -
// they migrate to importing Alert directly in a later, page-level phase.
import { Info } from 'lucide-react';

function Alert({ children, tag }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-primary bg-[var(--accent-dim)] px-3.5 py-2.5 text-[13px] text-foreground">
      <Info size={16} className="shrink-0 text-primary" />
      <span className="flex-1">{children}</span>
      {tag && (
        <span className="rounded-full bg-primary px-2 py-0.5 font-[var(--font-mono)] text-[11px] text-white">
          {tag}
        </span>
      )}
    </div>
  );
}

export { Alert };
