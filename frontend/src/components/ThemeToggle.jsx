// src/components/ThemeToggle.jsx
// -----------------------------------------------------------------------------
// Tombol switch dark/light buat ditaruh di Topbar (sebelah NotificationBell).
// Pakai lucide-react (Sun/Moon) - udah jadi dependency.
//
// PENTING: className di bawah pakai utility yang MEMANG di-expose theme lu
// (tailwind.css @theme inline):
//   bg-secondary        = var(--panel-2)
//   text-muted-foreground = var(--text-dim)
//   border-border       = var(--border)
//   bg-accent           = var(--panel-3)   (shadcn "accent" = highlight netral)
//   text-foreground     = var(--text)
//   ring-ring           = var(--accent)
//   rounded-sm          = 8px (radius control)
//   ease-standard       = var(--ease-standard)  (motion token LOCKED lu)
// Karena semuanya token semantic, tombol ini otomatis benar di DUA tema.
// A11y: aria-label + aria-pressed; :focus-visible ring (disiplin global.css lu).
// -----------------------------------------------------------------------------
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export default function ThemeToggle({ className }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      aria-pressed={isDark}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-sm',
        'border border-border bg-secondary text-muted-foreground',
        'transition-colors duration-[var(--duration-fast)] ease-standard',
        'hover:text-foreground hover:bg-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {/* Dua ikon di-crossfade biar transisinya mulus, bukan swap kasar.
          motion-reduce:* mematikan transform/opacity buat user reduce-motion. */}
      <Sun
        strokeWidth={1.9}
        className={cn(
          'absolute h-[17px] w-[17px] transition-all duration-[var(--duration-base)] ease-standard',
          'motion-reduce:transition-none',
          isDark ? 'scale-75 opacity-0 -rotate-90' : 'scale-100 opacity-100 rotate-0',
        )}
      />
      <Moon
        strokeWidth={1.9}
        className={cn(
          'absolute h-[17px] w-[17px] transition-all duration-[var(--duration-base)] ease-standard',
          'motion-reduce:transition-none',
          isDark ? 'scale-100 opacity-100 rotate-0' : 'scale-75 opacity-0 rotate-90',
        )}
      />
    </button>
  );
}
