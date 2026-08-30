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
import { useState } from 'react';
import { Plus, X, Inbox } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { usePmLineHistoryList } from '../hooks/usePmLineHistory';
import { useLines } from '../hooks/useLines';
import { useRowSelection } from '../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../hooks/useRecycleBin';
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

const LIMIT = 20;

function PmLineHistoryPage() {
  const [showForm, setShowForm] = useState(false);
  const [lineId, setLineId] = useState('all');
  const [jenis, setJenis] = useState('all');
  const [page, setPage] = useState(1);
  const [bulkError, setBulkError] = useState('');
  const confirm = useConfirm();

  usePageHeader({
    title: 'History PM Line',
    actions: (
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
  });

  const { data: lines = [] } = useLines({ isActive: true });
  const params = {
    line_id: lineId === 'all' ? undefined : lineId,
    jenis: jenis === 'all' ? undefined : jenis,
    page,
    limit: LIMIT,
  };
  const { data, isLoading, isFetching, isError } = usePmLineHistoryList(params);
  const pageIds = data?.items?.map((h) => h.id) ?? [];
  const selection = useRowSelection(pageIds);
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

  const hasActiveFilter = lineId !== 'all' || jenis !== 'all';

  function handleResetFilter() {
    setLineId('all');
    setJenis('all');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      {showForm && (
        <PmLineHistoryForm
          onSuccess={() => {
            setShowForm(false);
            setPage(1);
          }}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <Select
          value={lineId}
          onValueChange={(v) => {
            setLineId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[220px]" aria-label="Filter berdasarkan Line">
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

        <Select
          value={jenis}
          onValueChange={(v) => {
            setJenis(v);
            setPage(1);
          }}
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
      </div>

      {bulkError && (
        <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">{bulkError}</div>
      )}

      <BulkDeleteBar
        count={selection.selectedCount}
        onDelete={handleBulkDelete}
        onClear={selection.clear}
        pending={bulkDelete.isPending}
        label="Riwayat"
      />

      {data && selection.allOnPageSelected && (
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
        selection={selection}
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
