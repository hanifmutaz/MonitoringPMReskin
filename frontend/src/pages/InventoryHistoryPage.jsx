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
import { useState } from 'react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAllInventoryMovements } from '../hooks/useInventoryItemDetail';
import { useInventoryItems } from '../hooks/useInventoryItems';
import Pagination from '../components/Pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const LIMIT = 20;

const MOVEMENT_TYPE_LABEL = {
    STOCK_IN: 'Stock In',
    STOCK_OUT: 'Stock Out',
    ADJUSTMENT: 'Adjustment',
};

const MOVEMENT_TYPE_BADGE_CLASS = {
    STOCK_IN: 'bg-ok-dim text-ok',
    STOCK_OUT: 'bg-danger-dim text-danger',
    ADJUSTMENT: 'bg-warn-dim text-warn',
};

function InventoryHistoryPage() {
    const [itemId, setItemId] = useState('all');
    const [movementType, setMovementType] = useState('all');
    const [page, setPage] = useState(1);

    usePageHeader({ title: 'History Inventory' });

    // limit tinggi supaya dropdown filter isinya semua item, bukan cuma
    // halaman pertama - katalog Inventory diasumsikan tidak akan ribuan baris
    const { data: itemsData } = useInventoryItems({ limit: 1000 });
    const items = itemsData?.items || [];

    const { data, isLoading, isError } = useAllInventoryMovements({
        item_id: itemId === 'all' ? undefined : itemId,
        movement_type: movementType === 'all' ? undefined : movementType,
        page,
        limit: LIMIT,
    });

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
                    <SelectTrigger className="w-[240px]">
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
                    <SelectTrigger className="w-[180px]">
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

            <div className="rounded-lg border border-border bg-card p-4.5">
                {isError && (
                    <div className="rounded-lg bg-[var(--danger-dim)] px-3 py-2 text-xs text-[var(--danger)]">
                        Gagal memuat riwayat. Coba lagi.
                    </div>
                )}
                {isLoading && !data && (
                    <div className="py-8 text-center text-sm text-[var(--text-faint)]">Memuat data...</div>
                )}
                {data && data.items.length === 0 && (
                    <div className="py-8 text-center text-sm text-[var(--text-faint)]">Belum ada mutasi stok.</div>
                )}

                {data && data.items.length > 0 && (
                    <>
                        <div className="overflow-hidden rounded-lg border border-border">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-border">
                                            {['Tanggal', 'Item', 'Jenis', 'Qty', 'Catatan', 'Oleh'].map((h) => (
                                                <th
                                                    key={h}
                                                    className="whitespace-nowrap px-3 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.items.map((m) => (
                                            <tr key={m.id} className="border-b border-[var(--border-soft)] last:border-b-0 hover:bg-secondary">
                                                <td className="px-3 py-3 font-[var(--font-mono)] text-xs text-[var(--text-dim)]">
                                                    {new Date(m.created_at).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="font-[var(--font-mono)] text-[13px]">{m.part_name}</div>
                                                    <div className="text-xs text-[var(--text-dim)]">{m.spare_part_number}</div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span
                                                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                                                            MOVEMENT_TYPE_BADGE_CLASS[m.movement_type] || 'bg-[var(--panel-3)] text-[var(--text-faint)]'
                                                        }`}
                                                    >
                                                        {MOVEMENT_TYPE_LABEL[m.movement_type] || m.movement_type}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 font-[var(--font-mono)] text-[13px]">
                                                    {m.movement_type === 'STOCK_OUT' ? '-' : '+'}
                                                    {Number(m.qty).toLocaleString('id-ID')}
                                                </td>
                                                <td className="max-w-[240px] px-3 py-3 text-xs text-[var(--text-dim)]">{m.note || '-'}</td>
                                                <td className="px-3 py-3 text-xs text-[var(--text-dim)]">{m.user_full_name}</td>
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
        </div>
    );
}

export default InventoryHistoryPage;
