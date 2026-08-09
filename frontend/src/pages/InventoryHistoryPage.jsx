// src/pages/InventoryHistoryPage.jsx
import { useState } from 'react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAllInventoryMovements } from '../hooks/useInventoryItemDetail';
import { useInventoryItems } from '../hooks/useInventoryItems';
import Pagination from '../components/Pagination';

const LIMIT = 20;

const MOVEMENT_TYPE_LABEL = {
    STOCK_IN: 'Stock In',
    STOCK_OUT: 'Stock Out',
    ADJUSTMENT: 'Adjustment',
};

const MOVEMENT_TYPE_BADGE_CLASS = {
    STOCK_IN: 'badge badge-ok',
    STOCK_OUT: 'badge badge-danger',
    ADJUSTMENT: 'badge badge-warning',
};

function InventoryHistoryPage() {
    const [itemId, setItemId] = useState('');
    const [movementType, setMovementType] = useState('');
    const [page, setPage] = useState(1);

    usePageHeader({ title: 'History Inventory' });

    // limit tinggi supaya dropdown filter isinya semua item, bukan cuma
    // halaman pertama - katalog Inventory diasumsikan tidak akan ribuan baris
    const { data: itemsData } = useInventoryItems({ limit: 1000 });
    const items = itemsData?.items || [];

    const { data, isLoading, isError } = useAllInventoryMovements({
        item_id: itemId || undefined,
        movement_type: movementType || undefined,
        page,
        limit: LIMIT,
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <select
                    className="form-select"
                    value={itemId}
                    onChange={(e) => {
                        setItemId(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Semua Item</option>
                    {items.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.part_name} ({item.spare_part_number})
                        </option>
                    ))}
                </select>

                <select
                    className="form-select"
                    value={movementType}
                    onChange={(e) => {
                        setMovementType(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Semua Jenis</option>
                    {Object.entries(MOVEMENT_TYPE_LABEL).map(([val, label]) => (
                        <option key={val} value={val}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="panel">
                {isError && <div className="error-state">Gagal memuat riwayat. Coba lagi.</div>}
                {isLoading && !data && <div className="empty-state">Memuat data...</div>}
                {data && data.items.length === 0 && <div className="empty-state">Belum ada mutasi stok.</div>}

                {data && data.items.length > 0 && (
                    <>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="mono">Tanggal</th>
                                    <th>Item</th>
                                    <th>Jenis</th>
                                    <th className="mono">Qty</th>
                                    <th>Catatan</th>
                                    <th>Oleh</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((m) => (
                                    <tr key={m.id}>
                                        <td className="mono">{new Date(m.created_at).toLocaleString('id-ID')}</td>
                                        <td>
                                            <div className="mono">{m.part_name}</div>
                                            <div className="caption">{m.spare_part_number}</div>
                                        </td>
                                        <td>
                                            <span className={MOVEMENT_TYPE_BADGE_CLASS[m.movement_type] || 'badge'}>
                                                {MOVEMENT_TYPE_LABEL[m.movement_type] || m.movement_type}
                                            </span>
                                        </td>
                                        <td className="mono">
                                            {m.movement_type === 'STOCK_OUT' ? '-' : '+'}
                                            {Number(m.qty).toLocaleString('id-ID')}
                                        </td>
                                        <td style={{ maxWidth: 240 }}>{m.note || '-'}</td>
                                        <td>{m.user_full_name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />
                    </>
                )}
            </div>
        </div>
    );
}

export default InventoryHistoryPage;