// src/components/ui/badge.jsx
//
// Generic label pill - domain-agnostic (contrast with StatusBadge in
// components/, which knows about OK/WARNING/DANGER PM semantics and stays
// a data-display component, not a ui/ primitive - see
// docs/frontend/COMPONENT-INVENTORY.md).
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/15 text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-border bg-transparent text-foreground',
        success: 'bg-ok-dim text-ok',
        warning: 'bg-warn-dim text-warn',
        destructive: 'bg-danger-dim text-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
