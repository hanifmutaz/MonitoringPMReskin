// src/pages/PmPartMonitoringPage.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 4/N): `.panel`/`.data-table`/
// `.form-select`/`.error-state`/`.empty-state`/`.caption`/`.kpi-label`/
// `.kpi-value`/`.kpi-caption`/`.btn`/`.mono`/inline style lama dilepas
// total, diganti Tailwind + shadcn ui (Select/Button), ngikutin pola tabel
// Master Data. Kartu "Ketepatan per Line" dipetakan ke token HealthStat-
// style yang sama dipakai DashboardPage.jsx (bg-*-dim + text-* buat
// warna), ganti fungsi `ketepatanColor` (inline var()) yang tadinya
// duplikat logic sama `ketepatanStatus` di DashboardPage.jsx. WearRing.jsx
// SENGAJA TIDAK disentuh - dia SVG murni yang emang harus rujuk CSS var
// langsung (fill/stroke gak bisa lewat Tailwind utility class buat SVG
// paint props tanpa arbitrary value ribet), dan udah konsisten token dari
// awal (bukan style lama). stockNotice banner sebelumnya pakai
// `var(--warning-dim, var(--accent-dim))` (fallback ke token yang gak ada -
// --warning-dim gak pernah didefinisikan di tokens.css, cuma numpang
// fallback) - diganti bg-warn-dim/border-warn yang emang ada. Data/logic
// (query, filter, Ganti Part flow, stock notice) TIDAK berubah sama sekali.
import { useState } from 'react';
import { Truck, X, Plus } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmPartList, usePmPartKetepatanPerLine } from '../hooks/usePmPartList';
import { useLines } from '../hooks/useLines';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import WearRing from '../components/WearRing';
import StatusBadge from '../components/StatusBadge';
import StatusFilterPills from '../components/StatusFilterPills';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import Modal from '../components/Modal';
import PmPartHistoryForm from '../components/PmPartHistoryForm';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const LIMIT = 20;

const KETEPATAN_CLASS = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  muted: 'text-[var(--text-faint)]',
};

function ketepatanTone(percentage) {
  if (percentage === null || percentage === undefined) return 'muted';
  if (percentage >= 90) return 'ok';
  if (percentage >= 50) return 'warn';
  return 'danger';
}

// Mini-card per Line (bukan chip "Line X: 92%" seperti sebelumnya) - pola
// chip inline gak konsisten sama badge lain di app ini (badge di sini
// selalu [dot + 1 kata status], bukan [label: value]). Kartu kecil lebih
// gampang di-scan sekilas dan null-state-nya jelas beda warna (abu-abu,
// bukan hijau seolah "bagus").
function KetepatanPerLinePanel() {
  const { data, isLoading } = usePmPartKetepatanPerLine();

  if (isLoading || !data || data.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3.5">
      <div className="mb-2.5 text-xs text-muted-foreground">Ketepatan PM Part per Line (tahun berjalan)</div>
      <div className="flex flex-wrap gap-2.5">
        {data.map((l) => (
          <div key={l.line_id} className="min-w-[120px] rounded-md border border-border bg-[var(--panel-2)] px-3.5 py-2.5">
            <div className="text-xs text-muted-foreground">{l.line_name}</div>
            <div className={`font-[var(--font-display)] text-[22px] font-semibold ${KETEPATAN_CLASS[ketepatanTone(l.percentage)]}`}>
              {l.percentage === null ? '-' : `${l.percentage}%`}
            </div>
            <div className="text-[11px] text-[var(--text-faint)]">
              {l.percentage === null ? 'belum ada data' : `${l.total} event`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PmPartMonitoringPage() {
  usePageHeader({ title: 'Monitoring PM Part' });

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [lineId, setLineId] = useState('all');
  const [page, setPage] = useState(1);
  const [gantiPartItem, setGantiPartItem] = useState(null);
  // Modal "Input Penggantian Part" TANPA preset - dipindah kesini dari menu
  // Sidebar (sebelumnya halaman /pm-part/form terpisah, diminta lewat chat).
  // Tetap komponen form yang sama (termasuk tombol scan barcode), cuma entry
  // point-nya sekarang tombol toolbar, bukan menu.
  const [showInputForm, setShowInputForm] = useState(false);
  // Notice kalau stock TIDAK berkurang otomatis pas submit Ganti Part
  // (part belum di-link ke Inventory Item) - lihat pmPartHistoryService.js
  // applyStockDeduction(). Persist sampai di-dismiss manual (bukan auto-
  // hilang) karena ini info operasional yang perlu ditindaklanjuti (link
  // part ke Inventory Item), bukan sekadar toast konfirmasi.
  const [stockNotice, setStockNotice] = useState(null);

  function handleGantiPartSuccess(result) {
    setGantiPartItem(null);
    setShowInputForm(false);
    if (result?.stock && !result.stock.deducted) {
      setStockNotice(
        'Riwayat penggantian tersimpan, tapi stock TIDAK berkurang otomatis karena part ini belum di-link ke Inventory Item.'
      );
    }
  }

  const debouncedSearch = useDebouncedValue(search);
  const { data: lines = [] } = useLines({ isActive: true });

  const { data, isLoading, isError } = usePmPartList({
    search: debouncedSearch || undefined,
    status: status || undefined,
    line_id: lineId === 'all' ? undefined : lineId,
    page,
    limit: LIMIT,
  });

  function handleFilterChange(setter) {
    return (val) => {
      setter(val);
      setPage(1);
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <KetepatanPerLinePanel />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={search} onChange={handleFilterChange(setSearch)} placeholder="Cari drawing no / nama part..." />

        <Select value={lineId} onValueChange={handleFilterChange(setLineId)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua Line" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Line</SelectItem>
            {lines.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.line_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <StatusFilterPills value={status} onChange={handleFilterChange(setStatus)} />

        <Button type="button" size="sm" className="ml-auto" onClick={() => setShowInputForm(true)}>
          <Plus size={14} /> Input Penggantian Part
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4.5">
        {isError && (
          <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
            Gagal memuat data. Coba lagi.
          </div>
        )}

        {isLoading && !data && <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>}

        {data && data.items.length === 0 && (
          <div className="py-8 text-center text-sm text-[var(--text-faint)]">Belum ada part yang cocok dengan filter ini.</div>
        )}

        {data && data.items.length > 0 && (
          <>
            <div className="overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      {['', 'Line', 'Drawing No / Part Name', 'Counter', 'Target Shot', 'Sisa Shot', 'Estimasi PM', 'Status', ''].map(
                        (h, i) => (
                          <th
                            key={i}
                            className="whitespace-nowrap px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={item.part_id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                        <td className="px-3 py-3">
                          <WearRing percentage={item.wear_percentage} status={item.status} />
                        </td>
                        <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{item.line_name}</td>
                        <td className="px-3 py-3">
                          <div className="text-[13px]">{item.part_name}</div>
                          <div className="font-[var(--font-mono)] text-xs text-[var(--text-dim)]">
                            {item.drawing_no} <span className="text-[var(--text-faint)]">({item.jig_name})</span>
                          </div>
                          {item.primary_supplier_name ? (
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-[var(--text-dim)]">
                              <Truck size={11} /> {item.primary_supplier_name}
                            </div>
                          ) : (
                            <div className="mt-0.5 text-xs text-[var(--text-faint)]">Belum ada Supplier utama</div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-[var(--font-mono)] text-[13px]">
                          {item.counter.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-3 text-right font-[var(--font-mono)] text-[13px]">
                          {item.target_shot.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-3 text-right font-[var(--font-mono)] text-[13px]">
                          {item.remaining_shot.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">{item.estimated_pm_date || '-'}</td>
                        <td className="px-3 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-3 py-3">
                          <Button type="button" size="sm" variant="outline" onClick={() => setGantiPartItem(item)}>
                            Ganti Part
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />
          </>
        )}
      </div>

      {gantiPartItem && (
        <Modal title={`Ganti Part — ${gantiPartItem.drawing_no}`} onClose={() => setGantiPartItem(null)}>
          <PmPartHistoryForm
            key={gantiPartItem.part_id}
            presetPart={gantiPartItem}
            onCancel={() => setGantiPartItem(null)}
            onSuccess={handleGantiPartSuccess}
          />
        </Modal>
      )}

      {showInputForm && (
        <Modal title="Input Penggantian Part" onClose={() => setShowInputForm(false)}>
          <PmPartHistoryForm onCancel={() => setShowInputForm(false)} onSuccess={handleGantiPartSuccess} />
        </Modal>
      )}

      {stockNotice && (
        <div className="flex items-center gap-2.5 rounded-lg border border-warn bg-warn-dim px-3.5 py-2.5 text-[13px]">
          <span className="flex-1">{stockNotice}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setStockNotice(null)}>
            <X size={13} /> Tutup
          </Button>
        </div>
      )}
    </div>
  );
}

export default PmPartMonitoringPage;