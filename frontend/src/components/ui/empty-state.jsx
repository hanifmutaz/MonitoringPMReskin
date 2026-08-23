// src/components/ui/empty-state.jsx
//
// Generic state-display primitive. Per 01-PRODUCT-UX-BRIEF.md §8, Empty,
// No Result, Error, and Stale Data must NOT collapse into one generic
// "No Data" look - this component enforces that by taking icon/title/
// description/action as props rather than hardcoding any copy or a single
// "empty" visual. Domain pages decide the actual copy per state (e.g.
// "Belum ada PM Schedule" vs "Tidak ada record yang cocok dengan filter"),
// this component only owns the layout.
//
// `tone` (added during DashboardPage's Phase 6 migration): the original
// hand-rolled error state used bg-danger-dim/text-danger, not a neutral
// gray icon - collapsing that into the default neutral look would have
// been exactly the "Error looks the same as Empty" outcome §8 warns
// against. tone lets a caller opt into the semantic color without
// hardcoding it as the only option (most Empty/No-Result cases genuinely
// are neutral, per the same verified DataTable default usage).
import { cn } from '../../lib/utils';

const TONE_CLASS = {
  neutral: 'bg-secondary text-muted-foreground',
  danger: 'bg-danger-dim text-danger',
  warning: 'bg-warn-dim text-warn',
};

function EmptyState({ icon: Icon, title, description, action, tone = 'neutral', className, ...props }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center',
        className
      )}
      {...props}
    >
      {Icon && (
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', TONE_CLASS[tone] || TONE_CLASS.neutral)}>
          <Icon className="h-5 w-5" />
        </div>
      )}
      {title && <p className="text-sm font-medium text-foreground">{title}</p>}
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export { EmptyState };
