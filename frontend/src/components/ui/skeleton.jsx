// src/components/ui/skeleton.jsx
//
// Component-level loading placeholder. Distinct from PageLoader.jsx, which
// is route-level (Suspense fallback for lazy-loaded pages, see App.jsx) -
// Skeleton is for in-page loading states (e.g. a DataTable's initial fetch,
// before usePmPartList-style hooks resolve), per the "initial loading" vs
// "refreshing" distinction in 01-PRODUCT-UX-BRIEF.md §8.
import { cn } from '../../lib/utils';

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-secondary', className)}
      {...props}
    />
  );
}

export { Skeleton };
