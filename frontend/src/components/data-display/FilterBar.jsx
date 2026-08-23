// src/components/data-display/FilterBar.jsx
//
// New (docs/frontend/MIGRATION-PLAN.md Phase 5). Scoped minimally, per
// FRONTEND-ARCHITECTURE.md's instruction to read the actual filter needs
// before designing this - PmPartMonitoringPage.jsx's filter row is the
// existing, working pattern this generalises:
//   <div className="flex flex-wrap items-center gap-3">
//     <SearchBar .../> <Select .../> <StatusFilterPills .../>
//     <Button className="ml-auto">...</Button>
//   </div>
// FilterBar owns only that layout (wrap + gap + the "actions push right"
// rule) - it does not know about search, line selects, or status pills.
// Those stay as the existing domain-agnostic components (SearchBar,
// Select, StatusFilterPills) composed as children, per §11's rule that
// primitives must not know business domains.
import { cn } from '../../lib/utils';

function FilterBar({ children, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {children}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export { FilterBar };
export default FilterBar;
