// src/components/ui/tabs.jsx
//
// New primitive - no Tabs existed anywhere in the codebase before this
// (verified: no @radix-ui/react-tabs dependency, MasterDataPage's tab UI
// is hand-rolled - see docs/frontend/FRONTEND-AUDIT.md). Adds
// @radix-ui/react-tabs as a dependency, consistent with every other ui/
// primitive already being Radix-based (alert-dialog, dialog, label,
// select, slot, tooltip) - not a new UI library, just the missing member
// of the same family already in use.
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border bg-secondary p-1',
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex cursor-pointer items-center rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none',
        'data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        'focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Content
      className={cn('mt-3 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
