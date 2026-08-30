// src/pages/InventoryHistoryPage.jsx
// Reskin (checklist §3 item 4, batch 5/N - terakhir): `.panel`/`.data-table`/
// `.badge badge-*` lama dilepas TOTAL, diganti Tailwind + shadcn ui (Select)
// murni, konsisten sama InventoryTab. Filter Item/Jenis diadaptasi dari
// referensi Mantis "Filtering" (dua dropdown di atas tabel) sesuai arahan
// Mutaz - TAPI cuma pola visualnya, filter di sini tetap SERVER-SIDE param
// item_id/movement_type (gak diubah). Badge warna movement type sebelumnya
// class CSS lama (badge badge-ok/badge-danger/badge-warning) - dipetakan ke
// token bg-ok-dim/text-ok, bg-danger-dim/text-danger, bg-warn-dim/text-warn
// yang sama dipakai RopBadge di InventoryTab. Query/pagination/logic TIDAK
// berubah sama sekali.
//
// DataTable migration (docs/frontend/MIGRATION-PLAN.md Phase 10): hand-
// rolled <table> diganti data-display/DataTable dengan `selection` +
// `SelectAllAcrossPagesBar` - pola identik PartsTab.jsx/PmLineHistoryPage.jsx
// (server-side paginated, sudah punya bulk-delete via useRowSelection).
// Kolom (6) pindah ke inventoryHistoryColumns.jsx, co-located di pages/
// (bukan folder domain terpisah - halaman ini satu-satunya consumer,
// gak ada komponen lain yang perlu digabung ke domain folder baru,
// sama alasan ClMappingModal.jsx tetap mendefinisikan kolomnya sendiri).
// Semua state/query/pagination/handler TIDAK berubah.
import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAllInventoryMovements } from '../hooks/useInventoryItemDetail';
import { useInventoryItems } from '../hooks/useInventoryItems';
import { useRowSelection } from '../hooks/useRowSelection';
import { useBulkDeleteMutation } from '../hooks/useRecycleBin';
import { useConfirm } from '../contexts/ConfirmDialogContext';
import { fetchAllInventoryMovements } from '../api/inventoryApi';
import BulkDeleteBar from '../components/BulkDeleteBar';
import SelectAllAcrossPagesBar from '../components/SelectAllAcrossPagesBar';
import { DataTable, DataTableNoResult } from '../components/data-display/DataTable';
import { EmptyState } from '../components/ui/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import inventoryHistoryColumns, { MOVEMENT_TYPE_LABEL } from './inventoryHistoryColumns';

const LIMIT = 20;

function InventoryHistoryPage() {
    const [itemId, setItemId] = useState('all');
    const [movementType, setMovementType] = useState('all');
    const [page, setPage] = useState(1);
    const [bulkError, setBulkError] = useState('');
    const confirm = useConfirm();

    usePageHeader({ title: 'History Inventory' });

    // limit tinggi supaya dropdown filter isinya semua item, bukan cuma
    // halaman pertama - katalog Inventory diasumsikan tidak akan ribuan baris
    const { data: itemsData } = useInventoryItems({ limit: 1000 });
    const items = itemsData?.items || [];

    const params = {
        item_id: itemId === 'all' ? undefined : itemId,
        movement_type: movementType === 'all' ? undefined : movementType,
        page,
        limit: LIMIT,
    };
    const { data, isLoading, isFetching, isError } = useAllInventoryMovements(params);
    const pageIds = data?.items?.map((m) => m.id) ?? [];
    const selection = useRowSelection(pageIds);
    // 'inventory-movements' - murni log historis, TIDAK ngaruh ke
    // current_stock (stok maintained sebagai running total terpisah, lihat
    // catatan di inventoryService.js - "Jangan pernah UPDATE current_stock
    // langsung tanpa insert movement"), jadi paling aman di antara 3 tabel
    // history buat dibersihin.
    const bulkDelete = useBulkDeleteMutation('inventory-movements');

    async function handleSelectAllMatching() {
        const all = await fetchAllInventoryMovements({ ...params, page: 1, limit: data.total });
        selection.selectIds(all.items.map((m) => m.id));
    }

    async function handleBulkDelete() {
        if (
            !(await confirm(
                `Hapus ${selection.selectedCount} riwayat mutasi stok terpilih? Bisa direstore lewat Recycle Bin. Stok saat ini TIDAK berubah - ini cuma catatan log historisnya.`
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

    const hasActiveFilter = itemId !== 'all' || movementType !== 'all';

    function handleResetFilter() {
        setItemId('all');
        setMovementType('all');
        setPage(1);
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
                <Select
                    value={itemId}
                    onValueChange={(v) => {
                        setItemId(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-[240px]" aria-label="Filter berdasarkan Item">
                        <SelectValue placeholder="Semua Item" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Item</SelectItem>
                        {items.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                                {item.part_name} ({item.spare_part_number})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select
                    value={movementType}
                    onValueChange={(v) => {
                        setMovementType(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-[180px]" aria-label="Filter berdasarkan Jenis Mutasi">
                        <SelectValue placeholder="Semua Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Jenis</SelectItem>
                        {Object.entries(MOVEMENT_TYPE_LABEL).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {bulkError && (
                <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
                    {bulkError}
                </div>
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
                columns={inventoryHistoryColumns}
                rows={data?.items}
                getRowKey={(m) => m.id}
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
                        <EmptyState icon={Inbox} title="Belum ada mutasi stok" />
                    )
                }
            />
        </div>
    );
}

export default InventoryHistoryPage;
