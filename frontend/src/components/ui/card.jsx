// src/components/ui/card.jsx
//
// Generic content container. Domain-agnostic per Component Inventory rules -
// callers supply all content via children, this component knows nothing
// about PM/Inventory/Line. Uses the same --color-card / --color-border
// tokens already exposed to Tailwind in styles/tailwind.css (which in turn
// point at tokens.css's --panel/--border - see docs/frontend/DESIGN-TOKENS.md
// for the full reconciliation).
//
// NOTE: no shadow by default. Verified against every existing hand-rolled
// panel (KpiCard, DashboardPage sections, PmPartMonitoringPage's table
// wrapper) - none use box-shadow; surfaces are separated by background
// layering (--panel/--panel-2/--panel-3) instead, per DESIGN-TOKENS.md's
// "Elevation rules" section. A first draft of this component defaulted to
// shadow-sm (the common shadcn default) - caught during DashboardPage's
// migration (Phase 6) because it would have introduced a shadow no other
// panel in the app has. Callers that genuinely need an elevated look
// (e.g. a Dialog/Drawer) can add shadow via className.
import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4.5 text-card-foreground',
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  // No own padding - the verified pattern puts padding on Card itself
  // once, with header/content sharing it (mb-4 separates them), unlike
  // the typical shadcn convention of independently-padded sections.
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)} {...props} />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <h2
      // font-display/15px/semibold is the verified, established convention
      // for section headers across DashboardPage's panels (Ketepatan PM,
      // Ringkasan Status Line, Line Perlu Perhatian) - not a guess, read
      // directly from the existing markup before setting this default.
      className={cn('m-0 font-[var(--font-display)] text-[15px] font-semibold', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}

function CardContent({ className, ...props }) {
  // No own padding either, for the same reason as CardHeader above.
  return <div className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return (
    <div className={cn('mt-4 flex items-center', className)} {...props} />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
