// src/components/LineCombobox.jsx
// Pengganti <Select> untuk pilihan Line: bisa DIKETIK buat nyari (tidak harus
// scroll). Kontrak sengaja sama dengan Select shadcn yang dipakai sebelumnya:
//   value (string: id Line atau 'all') + onValueChange(string)
// jadi pemanggil cukup ganti komponennya, state & query tidak berubah.
//
// - Pencarian tidak peka huruf besar/kecil & mengabaikan spasi/tanda hubung,
//   jadi "line1", "Line 1" dan "LINE-1" semuanya ketemu "LINE-1".
// - Keyboard: ketik langsung nyari, ↑/↓ pindah, Enter pilih, Esc tutup.
// - Tanpa dependency baru & tanpa portal (aman dipakai di dalam Dialog Radix:
//   portal di luar dialog akan diblok focus-trap-nya).
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../lib/utils';

const normalize = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function LineCombobox({
  value,
  onValueChange,
  lines = [],
  allLabel, // kalau diisi, muncul opsi "all" paling atas (mis. "Semua Line")
  placeholder = 'Pilih Line',
  searchPlaceholder = 'Ketik nama Line...',
  className,
  'aria-label': ariaLabel,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const options = useMemo(() => {
    const base = lines.map((l) => ({ value: String(l.id), label: l.line_name }));
    return allLabel ? [{ value: 'all', label: allLabel }, ...base] : base;
  }, [lines, allLabel]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter((o) => o.value !== 'all' && normalize(o.label).includes(q));
  }, [options, query]);

  const selected = options.find((o) => o.value === String(value));

  function openPanel() {
    if (disabled) return;
    setQuery('');
    const idx = options.findIndex((o) => o.value === String(value));
    setActiveIndex(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function closePanel() {
    setOpen(false);
    setQuery('');
  }

  function choose(opt) {
    if (!opt) return;
    onValueChange?.(opt.value);
    closePanel();
  }

  // Fokus ke kolom cari begitu panel terbuka.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Klik di luar = tutup.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) closePanel();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Item aktif selalu kelihatan saat navigasi pakai panah.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, filtered]);

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(Math.max(filtered.length - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      // Jangan ikut nutup Dialog induk.
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    } else if (e.key === 'Tab') {
      closePanel();
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        className={cn(
          'flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground shadow-sm transition-colors hover:bg-accent outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          !selected && 'text-muted-foreground'
        )}
      >
        <span className="line-clamp-1 text-left">{selected ? selected.label : placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <div className="relative border-b border-border">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              aria-label="Cari Line"
              aria-controls={listId}
              aria-activedescendant={filtered[activeIndex] ? `${listId}-${filtered[activeIndex].value}` : undefined}
              autoComplete="off"
              className="h-9 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="px-2 py-2 text-center text-xs text-muted-foreground">Line tidak ditemukan</li>
            )}
            {filtered.map((o, i) => {
              const isSelected = o.value === String(value);
              const isActive = i === activeIndex;
              return (
                <li
                  key={o.value}
                  id={`${listId}-${o.value}`}
                  role="option"
                  aria-selected={isSelected}
                  data-active={isActive}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => e.preventDefault()} // jaga fokus tetap di kolom cari
                  onClick={() => choose(o)}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm',
                    isActive && 'bg-accent text-accent-foreground'
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {isSelected && <Check className="h-4 w-4" />}
                  </span>
                  {o.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default LineCombobox;
