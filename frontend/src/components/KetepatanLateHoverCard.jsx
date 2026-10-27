// src/components/KetepatanLateHoverCard.jsx
//
// Isi tooltip saat baris Line di panel "Ketepatan PM < 100%" (Mode TV) di-hover: ringkasan PM yang telat di
// bulan ini (jenis PM, lama telat, alasan). Isi TooltipContent baru dipasang saat tooltip terbuka, jadi data
// (endpoint yang sama dengan modal detail, di-cache react-query) baru diambil saat benar-benar di-hover.
import { useTvKetepatanLateEvents } from '../hooks/useTvDashboard';
import { formatDate } from '../utils/formatDate';
import { alasanLabel, lateLabel } from '../utils/ketepatanLate';

const MAX_EVENTS = 4;

function KetepatanLateHoverCard({ lineId, lineName }) {
  const { data, isLoading, isError } = useTvKetepatanLateEvents(lineId, 'month');
  const events = data?.events ?? [];
  const shown = events.slice(0, MAX_EVENTS);

  return (
    <div className="flex w-[22rem] max-w-full flex-col gap-2 py-1 text-sm">
      <div className="font-[var(--font-display)] font-semibold">PM Telat - {lineName}</div>

      {isLoading && <div className="text-muted-foreground">Memuat...</div>}
      {isError && <div className="text-danger">Gagal memuat detail telat</div>}
      {data && events.length === 0 && <div className="text-muted-foreground">Tidak ada PM telat tercatat bulan ini.</div>}

      {shown.map((e, i) => (
        <div key={`${e.source}-${e.tanggal}-${i}`} className="rounded-md bg-[var(--panel-2)] px-2.5 py-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{e.label}</span>
            <span className="shrink-0 font-[var(--font-mono)] text-xs font-semibold text-danger">{lateLabel(e.late)}</span>
          </div>
          <div className="text-xs text-muted-foreground">{formatDate(e.tanggal)} · PIC {e.pic_name || '-'}</div>
          <div className="mt-0.5 line-clamp-2 text-xs">{alasanLabel(e.alasan_telat)}</div>
        </div>
      ))}

      {events.length > MAX_EVENTS && <div className="text-xs text-muted-foreground">+{events.length - MAX_EVENTS} PM telat lainnya</div>}
      <div className="text-xs text-[var(--text-faint)]">Klik baris untuk detail lengkap</div>
    </div>
  );
}

export default KetepatanLateHoverCard;
