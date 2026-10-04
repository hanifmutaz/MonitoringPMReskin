// src/pages/PmLineHistoryPage.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 3/N): `.btn`/`.form-select`/
// `.panel`/`.data-table`/`.error-state`/`.empty-state`/`.mono`/inline style
// lama dilepas total, diganti Tailwind + shadcn ui (Button/Select).
// Tombol "Input PM" ini yang dimaksud catatan di Topbar.jsx ("actions slot
// sengaja gak disentuh, kebagian pas reskin halaman itu sendiri") - sekarang
// kebagian gilirannya. Filter Line/Jenis tetap SERVER-SIDE (gak diubah).
// Data/logic (query, pagination, toggle form) TIDAK berubah sama sekali.
//
// Vertical slice migration (docs/frontend/MIGRATION-PLAN.md Phase 8): hand-
// rolled <table> diganti data-display/DataTable, mengikuti pola Phase 7.
// Ini konsumer PERTAMA dari DataTable yang butuh row-selection (bulk-
// delete) - DataTable sebelumnya gak punya dukungan itu sama sekali
// (temuan audit Phase 7/8), jadi ditambahin prop `selection` opsional ke
// DataTable sendiri (lihat komentar di DataTable.jsx). BulkDeleteBar dan
// SelectAllAcrossPagesBar TETAP komponen terpisah yang sama persis,
// dirender di atas DataTable seperti sebelumnya - bukan bagian dari
// DataTable, sama seperti pola di LinesTab/PartsTab/InventoryTab.
// useRowSelection, useBulkDeleteMutation, handleSelectAllMatching, query,
// pagination TIDAK berubah sama sekali. Kolom tabel (7 kolom) pindah ke
// components/pm-line/pmLineHistoryColumns.jsx (domain/pm-line/
// extraction).
//
// SATU perubahan perilaku kecil (bukan murni presentational, disclosure
// jujur - sama pola disclosure Phase 7 buat DataTable's built-in Empty vs
// No Result split, 01-PRODUCT-UX-BRIEF.md §8): sebelumnya pesan "Belum ada
// riwayat PM Line" selalu sama persis baik saat filter aktif maupun
// tidak. Sekarang DataTable otomatis membedakan "belum ada data sama
// sekali" vs "ada data, tapi filter yang aktif tidak match" (dengan
// tombol Reset Filter) - sama seperti PmPartMonitoringPage.jsx.
//
// Fase 2 polish (grup Monitoring, UI-CONSISTENCY-AUDIT.md §3): filter row
// (Select Line + Select Jenis) sebelumnya hand-rolled
// `<div className="flex flex-wrap gap-2">`, beda dari <FilterBar> yang
// dipakai PmPartMonitoringPage.jsx (`gap-3` + `items-center`). Disamain,
// nol behavior change.
import { useMemo, useState } from 'react';
import { Plus, X, Inbox } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmLineHistoryList } from '../hooks/usePmLineHistory';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { isDateString } from '../utils/urlFilters';
import { useLines } from '../hooks/useLines';
import LineCombobox from '../components/LineCombobox';
import ExportExcelButton from '../components/ExportExcelButton';
import { useRowSelection } from '../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../hooks/useRecycleBin';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { fetchPmLineHistoryList } from '../api/pmLineHistoryApi';
import PmLineHistoryForm from '../components/pm-line/PmLineHistoryForm';
import pmLineHistoryColumns, { JENIS_LABEL } from '../components/pm-line/pmLineHistoryColumns';
import BulkDeleteBar from '../components/BulkDeleteBar';
import SelectAllAcrossPagesBar from '../components/SelectAllAcrossPagesBar';
import { DataTable, DataTableNoResult } from '../components/data-display/DataTable';
import { EmptyState } from '../components/ui/empty-state';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FilterBar } from '../components/data-display/FilterBar';
import { DateRangeFilter } from '../components/data-display/DateRangeFilter';

const LIMIT = 20;

// Filter disimpan di URL (?line=3&jenis=MONTHLY&from=2026-09-01&to=2026-09-30):
// bisa di-bookmark/dibagikan dan tidak reset saat pindah halaman. Halaman
// (pagination) sengaja tetap state biasa - selalu kembali ke 1 saat filter berubah.
const URL_FILTER_DEFAULTS = { line: 'all', jenis: 'all', from: '', to: '' };
const URL_FILTER_VALIDATORS = {
  line: (v) => v === 'all' || /^\d+$/.test(v),
  jenis: (v) => v === 'all' || Object.hasOwn(JENIS_LABEL, v),
  from: isDateString,
  to: isDateString,
};

function PmLineHistoryPage() {
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters, resetFilters] = useUrlFilters({
    storageKey: 'pm-line-history',
    defaults: URL_FILTER_DEFAULTS,
    validators: URL_FILTER_VALIDATORS,
  });
  const { line: lineId, jenis, from: dateFrom, to: dateTo } = filters;
  const [page, setPage] = useState(1);
  const [bulkError, setBulkError] = useState('');
  const confirm = useConfirm();

  // FIX BUG (infinite render loop): `actions` sebelumnya JSX inline yang
  // dibikin ULANG tiap render (referensi objek baru terus), sementara
  // `usePageHeader` di PageHeaderContext.jsx punya useEffect ber-dependency
  // [title, actions, setHeader]. Referensi `actions` yang selalu "berubah"
  // bikin effect itu jalan tiap render -> setHeader -> provider re-render ->
  // page re-render -> actions baru lagi -> loop tanpa henti ("Maximum
  // update depth exceeded"). Efeknya: halaman ini gak pernah selesai
  // render, jadi navigasi KELUAR dari halaman ini (ke menu manapun) ikut
  // nyangkut - Outlet gak sempet swap ke route baru. Fix: `useMemo` biar
  // referensi `actions` cuma ganti kalau `showForm` beneran berubah.
  const actions = useMemo(
    () => (
      <Button type="button" onClick={() => setShowForm((v) => !v)}>
        {showForm ? (
          <>
            <X size={14} /> Tutup Form
          </>
        ) : (
          <>
            <Plus size={14} /> Input PM
          </>
        )}
      </Button>
    ),
    [showForm]
  );

  usePageHeader({ title: 'History PM Line', actions });

  const { data: lines = [] } = useLines({ isActive: true });
  const params = {
    line_id: lineId === 'all' ? undefined : lineId,
    jenis: jenis === 'all' ? undefined : jenis,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    page,
    limit: LIMIT,
  };
  const { data, isLoading, isFetching, isError } = usePmLineHistoryList(params);
  const pageIds = data?.items?.map((h) => h.id) ?? [];
  const selection = useRowSelection(pageIds);
  // Hapus massal = Recycle Bin engine, Admin-only di backend.
  const { isAdmin: canBulkDelete } = useAuth();
  // Entity registry-nya 'pm-line-history' (lihat recycleBinRegistry.js) -
  // dipakai sama query key react-query yang di-invalidate abis bulk-delete
  // (lihat ENTITY_QUERY_KEYS di useRecycleBin.js: ikut nyegerin ['pm-line']
  // & ['dashboard'] juga, soalnya status ketepatan PM dihitung live dari
  // tabel ini - ADR 006).
  const bulkDelete = useBulkDeleteMutation('pm-line-history');

  // "Pilih semua N riwayat yang cocok filter" - pola sama dengan PartsTab
  // (server-side paginated), nembak ulang endpoint yang sama dgn
  // limit=total buat ambil semua id yang cocok filter aktif.
  async function handleSelectAllMatching() {
    const all = await fetchPmLineHistoryList({ ...params, page: 1, limit: data.total });
    selection.selectIds(all.items.map((h) => h.id));
  }

  async function handleBulkDelete() {
    if (
      !(await confirm(
        `Hapus ${selection.selectedCount} riwayat PM Line terpilih? Bisa direstore lewat Recycle Bin. Status ketepatan PM akan otomatis dihitung ulang tanpa data ini.`
      ))
    )
      return;
    setBulkError('');
    try {
      await bulkDelete.mutateAsync(selection.selectedIds);
      selection.clear();
    } catch (err) {
      setBulkError(err.response?.data?.message || 'Gagal menghapus riwayat terpilih');
    }
  }

  const hasActiveFilter = lineId !== 'all' || jenis !== 'all' || Boolean(dateFrom || dateTo);

  function handleResetFilter() {
    resetFilters();
    setPage(1);
  }

  function applyFilter(patch) {
    setFilters(patch);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm && (
        <PmLineHistoryForm
          standalone
          onSuccess={() => {
            setShowForm(false);
            setPage(1);
          }}
        />
      )}

      <FilterBar
        actions={
          <ExportExcelButton
            path="/pm-line-history/export"
            params={{ line_id: params.line_id, jenis: params.jenis, date_from: params.date_from, date_to: params.date_to }}
            fallbackName="history-pm-line.xlsx"
            disabled={data?.total === 0}
          />
        }
      >
        <LineCombobox
          value={lineId}
          onValueChange={(v) => applyFilter({ line: v })}
          lines={lines}
          allLabel="Semua Line"
          placeholder="Semua Line"
          className="w-[220px]"
          aria-label="Filter berdasarkan Line"
        />

        <Select
          value={jenis}
          onValueChange={(v) => applyFilter({ jenis: v })}
        >
          <SelectTrigger className="w-[180px]" aria-label="Filter berdasarkan Jenis PM">
            <SelectValue placeholder="Semua Jenis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            {Object.entries(JENIS_LABEL).map(([val, label]) => (
              <SelectItem key={val} value={val}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangeFilter from={dateFrom} to={dateTo} onChange={(range) => applyFilter({ from: range.from, to: range.to })} />
      </FilterBar>

      {bulkError && (
        <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{bulkError}</div>
      )}

      {canBulkDelete && (

        <BulkDeleteBar
        count={selection.selectedCount}
        onDelete={handleBulkDelete}
        onClear={selection.clear}
        pending={bulkDelete.isPending}
        label="Riwayat"
      />

      )}

      {canBulkDelete && data && selection.allOnPageSelected && (
        <SelectAllAcrossPagesBar
          pageCount={pageIds.length}
          total={data.total}
          alreadySelectedAll={selection.selectedCount >= data.total}
          onSelectAll={handleSelectAllMatching}
        />
      )}

      <DataTable
        columns={pmLineHistoryColumns}
        rows={data?.items}
        getRowKey={(item) => item.id}
        isLoading={isLoading && !data}
        isRefreshing={isFetching && !isLoading}
        isError={isError}
        page={data?.page}
        limit={data?.limit}
        total={data?.total}
        onPageChange={setPage}
        selection={canBulkDelete ? selection : undefined}
        emptyState={
          hasActiveFilter ? (
            <DataTableNoResult onReset={handleResetFilter} />
          ) : (
            <EmptyState icon={Inbox} title="Belum ada riwayat PM Line" />
          )
        }
      />
    </div>
  );
}

export default PmLineHistoryPage;
