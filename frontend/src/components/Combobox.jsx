// src/components/Combobox.jsx
// Pengganti <Select> untuk daftar PANJANG (Line, Item Inventory, Part): bisa
// DIKETIK buat nyari, tidak harus scroll. Kontrak sengaja sama dengan Select
// shadcn: value (string) + onValueChange(string), jadi pemanggil cukup ganti
// komponennya, state & query tidak berubah. LineCombobox adalah wrapper tipis
// di atas komponen ini.
//
//   options: [{ value: string, label: string, searchText?: string }]
//     searchText opsional = teks tambahan yang ikut dicari tapi tidak
//     ditampilkan (mis. nomor drawing).
//   allLabel: kalau diisi, muncul opsi value 'all' paling atas (mis. "Semua Item").
//
// - Pencarian tidak peka huruf besar/kecil & mengabaikan spasi/tanda hubung,
//   jadi "line1", "Line 1" dan "LINE-1" semuanya ketemu "LINE-1".
// - Daftar yang ditampilkan dibatasi `maxVisible` (default 100) supaya katalog
//   ribuan item tidak membuat dropdown berat; sisanya muncul saat user mengetik.
// - Keyboard: ketik langsung nyari, ↑/↓ pindah, Enter pilih, Esc tutup.
// - Tanpa dependency baru & tanpa portal (aman dipakai di dalam Dialog Radix:
//   portal di luar dialog akan diblok focus-trap-nya).
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../lib/utils';

const normalize = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function Combobox({
  value,
  onValueChange,
  options: optionsProp = [],
  allLabel, // kalau diisi, muncul opsi "all" paling atas (mis. "Semua Item")
  placeholder = 'Pilih',
  searchPlaceholder = 'Ketik untuk mencari...',
  searchAriaLabel = 'Cari',
  emptyText = 'Tidak ditemukan',
  maxVisible = 100,
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

  const options = useMemo(
    () => (allLabel ? [{ value: 'all', label: allLabel }, ...optionsProp] : optionsProp),
    [optionsProp, allLabel]
  );

  // Teks pencarian dihitung sekali per daftar opsi, bukan tiap ketikan.
  const indexed = useMemo(
    () => options.map((o) => ({ o, key: normalize(`${o.label} ${o.searchText ?? ''}`) })),
    [options]
  );

  const { filtered, totalMatches } = useMemo(() => {
    const q = normalize(query);
    const matches = q
      ? indexed.filter(({ o, key }) => o.value !== 'all' && key.includes(q)).map(({ o }) => o)
      : options;
    return { filtered: matches.slice(0, maxVisible), totalMatches: matches.length };
  }, [indexed, options, query, maxVisible]);

  const selected = options.find((o) => o.value === String(value));

  function openPanel() {
    if (disabled) return;
    setQuery('');
    // Posisi awal = item terpilih, hanya kalau masuk daftar yang ditampilkan.
    const idx = options.slice(0, maxVisible).findIndex((o) => o.value === String(value));
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
              aria-label={searchAriaLabel}
              aria-controls={listId}
              aria-activedescendant={filtered[activeIndex] ? `${listId}-${filtered[activeIndex].value}` : undefined}
              autoComplete="off"
              className="h-9 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <li className="px-2 py-2 text-center text-xs text-muted-foreground">{emptyText}</li>
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
            {totalMatches > filtered.length && (
              <li className="px-2 py-2 text-center text-[11px] text-muted-foreground" aria-hidden="true">
                Menampilkan {filtered.length} dari {totalMatches} - ketik untuk mempersempit
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Combobox;
