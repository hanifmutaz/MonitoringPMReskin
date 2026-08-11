// src/pages/InventoryPage.jsx
// Reskin (checklist §3 item 4, batch 5/N): `.panel` lama (cuma pembungkus
// tipis) diganti Tailwind persis sama token yang dipakai MasterDataPage
// (rounded-lg border border-border bg-card p-4.5) biar konsisten.
import { usePageHeader } from '../contexts/PageHeaderContext';
import InventoryTab from '../components/masterdata/InventoryTab';

function InventoryPage() {
    usePageHeader({ title: 'Inventory' });

    return (
        <div className="rounded-lg border border-border bg-card p-4.5">
            <InventoryTab />
        </div>
    );
}

export default InventoryPage;