// src/components/ui/card.jsx
//
// Generic content container. Domain-agnostic per Component Inventory rules -
// callers supply all content via children, this component knows nothing
// about PM/Inventory/Line. Uses the same --color-card / --color-border
// tokens already exposed to Tailwind in styles/tailwind.css (which in turn
// point at tokens.css's --panel/--border - see docs/frontend/DESIGN-TOKENS.md
// for the full reconciliation).
import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground shadow-sm',
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn('text-sm font-semibold leading-none', className)}
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
  return <div className={cn('p-4 pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return (
    <div className={cn('flex items-center p-4 pt-0', className)} {...props} />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
