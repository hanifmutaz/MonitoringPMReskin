// src/components/ui/input.jsx
import { cn } from '../../lib/utils';

function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
        className
      )}
      {...props}
    />
  );
}

export { Input };