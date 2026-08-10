// src/pages/MasterDataPage.jsx
// Reskin (checklist §3 item 4, batch 1/N): `.panel`/`.tabs`/`.tab-item` lama
// dilepas TOTAL (§7.3), diganti Tailwind murni - pola tab underline sama
// persis (border-bottom 2px pas active, warna primary), cuma satuan lama
// (10px 16px, 13px, dst) dipetakan ke utility Tailwind terdekat.
import { useState } from 'react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { cn } from '../lib/utils';
import LinesTab from '../components/masterdata/LinesTab';
import PartsTab from '../components/masterdata/PartsTab';
import SuppliersTab from '../components/masterdata/SuppliersTab';
import ImportMasterDataTab from '../components/masterdata/ImportMasterDataTab';

const TABS = [
  { key: 'lines', label: 'Lines' },
  { key: 'parts', label: 'Parts' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'import', label: 'Import Excel' },
];

function MasterDataPage() {
  usePageHeader({ title: 'Master Data Part' });
  const [activeTab, setActiveTab] = useState('lines');

  return (
    <div className="rounded-lg border border-border bg-card p-4.5">
      <div className="mb-5 flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'cursor-pointer border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[var(--text-dim)] hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'lines' && <LinesTab />}
      {activeTab === 'parts' && <PartsTab />}
      {activeTab === 'suppliers' && <SuppliersTab />}
      {activeTab === 'import' && <ImportMasterDataTab />}
    </div>
  );
}

export default MasterDataPage;
