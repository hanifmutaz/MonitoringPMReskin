// src/pages/InventoryPage.jsx
import { usePageHeader } from '../contexts/PageHeaderContext';
import InventoryTab from '../components/masterdata/InventoryTab';

function InventoryPage() {
    usePageHeader({ title: 'Inventory' });

    return (
        <div className="panel">
            <InventoryTab />
        </div>
    );
}

export default InventoryPage;