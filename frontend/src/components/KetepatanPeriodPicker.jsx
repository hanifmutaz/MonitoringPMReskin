// src/components/KetepatanPeriodPicker.jsx
//
// Pemilih periode GLOBAL Dashboard Management (backdate): satu pilihan bulan yang menggerakkan semua blok
// Ketepatan PM (kartu bulan, kartu tahun, chart 12 bulan, tren 6 bulan, Line < 100%). Bulan di masa depan
// tidak bisa dipilih (belum ada event yang bisa dinilai).
//
// Memakai <select> native (aksesibel, ringan, jalan di semua browser - input type="month" tidak ada di Firefox
// desktop) + tombol sebelumnya/berikutnya + "Bulan ini".
import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { Button } from './ui/button';
import { monthLabel, shiftMonth } from '../utils/ketepatanDashboard';

const MONTH_OPTIONS = 36; // 3 tahun ke belakang dari bulan ini

function KetepatanPeriodPicker({ month, currentMonth, onChange, busy = false }) {
  if (!month || !currentMonth) return null;
  const options = Array.from({ length: MONTH_OPTIONS }, (_, i) => shiftMonth(currentMonth, -i));
  if (!options.includes(month)) options.push(month); // bulan terpilih di luar rentang tetap bisa tampil
  const isCurrent = month === currentMonth;
  const canNext = month < currentMonth;

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Periode Ketepatan PM">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarClock size={14} aria-hidden="true" />
        Periode
      </span>
      <Button type="button" size="icon" variant="outline" aria-label="Bulan sebelumnya" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeft size={16} />
      </Button>
      <select
        aria-label="Pilih bulan"
        value={month}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[9.5rem] cursor-pointer rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((m) => (
          <option key={m} value={m}>{monthLabel(m)}{m === currentMonth ? ' (bulan ini)' : ''}</option>
        ))}
      </select>
      <Button type="button" size="icon" variant="outline" aria-label="Bulan berikutnya" disabled={!canNext} onClick={() => onChange(shiftMonth(month, 1))}>
        <ChevronRight size={16} />
      </Button>
      {!isCurrent && (
        <Button type="button" size="sm" variant="outline" onClick={() => onChange(currentMonth)}>Kembali ke bulan ini</Button>
      )}
      {busy && <span className="text-xs text-muted-foreground" aria-live="polite">Memuat...</span>}
    </div>
  );
}

export default KetepatanPeriodPicker;
