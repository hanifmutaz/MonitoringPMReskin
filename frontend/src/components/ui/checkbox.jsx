// src/components/ui/checkbox.jsx
//
// Wraps the native <input type="checkbox"> rather than reimplementing it.
// IMPORTANT: global.css has a documented, previously-shipped regression
// where a global `appearance: none` reset on all form elements silently
// emptied out every checkbox (checked or not), discovered during the
// bulk-delete checklist work. The fix (appearance: auto + border/background
// revert, scoped to input[type=checkbox/radio] inside @layer base) already
// lives in global.css - this component does NOT need to and must NOT
// reintroduce its own appearance override, or it will re-break that fix.
// accent-color (the same var(--accent) already used in LinesTab/PartsTab)
// is what actually themes the checked state.
import { cn } from '../../lib/utils';

function Checkbox({ className, ...props }) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 cursor-pointer rounded-sm accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    />
  );
}

export { Checkbox };
