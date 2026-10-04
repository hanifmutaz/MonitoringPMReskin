// src/components/data-display/DateRangeFilter.jsx
//
// Filter rentang tanggal "Dari - Sampai" untuk halaman history / audit log.
// Nilai berupa string 'YYYY-MM-DD' ('' = tidak diisi), format yang sama dengan
// query date_from / date_to di API (batas hari dihitung WIB di backend, kedua
// ujung inklusif). Boleh diisi salah satu saja.
//
// Rentang yang terbalik dicegah di UI: `min`/`max` membatasi picker, dan kalau
// user mengetik manual tanggal yang melanggar, ujung yang lain ikut disamakan
// (bukan dibiarkan jadi 400 dari server).
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';

function DateRangeFilter({ from = '', to = '', onChange, className }) {
  function handleFrom(e) {
    const v = e.target.value;
    onChange?.({ from: v, to: v && to && v > to ? v : to });
  }
  function handleTo(e) {
    const v = e.target.value;
    onChange?.({ from: v && from && v < from ? v : from, to: v });
  }

  return (
    <div className={cn('flex items-center gap-2', className)} role="group" aria-label="Filter tanggal">
      <Input
        type="date"
        value={from}
        max={to || undefined}
        onChange={handleFrom}
        aria-label="Tanggal awal"
        className="h-9 w-[150px]"
      />
      <span className="text-xs text-muted-foreground" aria-hidden="true">
        s/d
      </span>
      <Input
        type="date"
        value={to}
        min={from || undefined}
        onChange={handleTo}
        aria-label="Tanggal akhir"
        className="h-9 w-[150px]"
      />
      {(from || to) && (
        <button
          type="button"
          onClick={() => onChange?.({ from: '', to: '' })}
          aria-label="Hapus filter tanggal"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring outline-none"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export { DateRangeFilter };
export default DateRangeFilter;
