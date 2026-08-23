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
//
// Vertical slice migration (docs/frontend/MIGRATION-PLAN.md Phase 7): hand-
// rolled <table> diganti data-display/DataTable, filter row diganti
// data-display/FilterBar. SearchBar/Select/StatusFilterPills/Pagination
// TETAP komponen yang sama persis (props tidak berubah, cuma dikomposisi
// ulang di dalam FilterBar/DataTable, bukan diganti). Query params, filter
// state, Ganti Part flow, dan stock notice TIDAK disentuh - migrasi ini
// murni presentational, sesuai constraint "preserve existing business
// behaviour" di 02-IMPLEMENTATION-PROMPT.md.
//
// State handling baru mengikuti 01-PRODUCT-UX-BRIEF.md §8: Empty (belum
// ada part sama sekali) dan No Result (ada part, tapi filter yang aktif
// gak match) sekarang dibedakan secara visual - sebelumnya keduanya
// nunjukin pesan generik yang sama. isRefreshing (isFetching tanpa
// isLoading - refetch di background pas keepPreviousData aktif) sekarang
// juga divisualisasikan (opacity turun dikit di tabel), sebelumnya gak ada
// indikator sama sekali pas ganti filter/page.
//
// domain/pm-part/ extraction (Phase 7, follow-up): KetepatanPerLinePanel
// and the DataTable column definitions (buildColumns) were local to this
// file - both moved to components/pm-part/ (following the components/
// masterdata/ precedent), along with WearRing/StatusFilterPills/
// BarcodeScannerModal/PmPartHistoryForm which were already PM-Part-only
// but sitting flat in components/. Nothing in this list changed behaviour
// or markup, only location - this page is now purely composition.
import { useState } from 'react';
import { Plus, X, Inbox } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmPartList } from '../hooks/usePmPartList';
import { useLines } from '../hooks/useLines';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import KetepatanPerLinePanel from '../components/pm-part/KetepatanPerLinePanel';
import buildPmPartColumns from '../components/pm-part/pmPartColumns';
import StatusFilterPills from '../components/pm-part/StatusFilterPills';
import PmPartHistoryForm from '../components/pm-part/PmPartHistoryForm';
import SearchBar from '../components/SearchBar';
import { DataTable, DataTableNoResult } from '../components/data-display/DataTable';
import { FilterBar } from '../components/data-display/FilterBar';
import { EmptyState } from '../components/ui/empty-state';
import Modal from '../components/Modal';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const LIMIT = 20;

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

  const { data, isLoading, isFetching, isError } = usePmPartList({
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

  // Uses raw `search` (not debouncedSearch) - this only decides which
  // empty-state copy to show, a UI concern, so it should reflect what's
  // actually typed right now rather than waiting on the query debounce.
  const hasActiveFilter = Boolean(search) || Boolean(status) || lineId !== 'all';

  function handleResetFilter() {
    setSearch('');
    setStatus('');
    setLineId('all');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <KetepatanPerLinePanel />

      <FilterBar
        actions={
          <Button type="button" size="sm" onClick={() => setShowInputForm(true)}>
            <Plus size={14} /> Input Penggantian Part
          </Button>
        }
      >
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
      </FilterBar>

      <DataTable
        columns={buildPmPartColumns(setGantiPartItem)}
        rows={data?.items}
        getRowKey={(item) => item.part_id}
        isLoading={isLoading && !data}
        isRefreshing={isFetching && !isLoading}
        isError={isError}
        page={data?.page}
        limit={data?.limit}
        total={data?.total}
        onPageChange={setPage}
        emptyState={
          hasActiveFilter ? (
            <DataTableNoResult onReset={handleResetFilter} />
          ) : (
            <EmptyState icon={Inbox} title="Belum ada part" description="Belum ada part yang terdaftar di Master Data." />
          )
        }
      />

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
