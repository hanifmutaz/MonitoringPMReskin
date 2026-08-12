// src/pages/MasterDataPage.jsx
// Reskin (checklist §3 item 4, batch 1/N): `.panel`/`.tabs`/`.tab-item` lama
// dilepas TOTAL (§7.3), diganti Tailwind murni - pola tab underline sama
// persis (border-bottom 2px pas active, warna primary), cuma satuan lama
// (10px 16px, 13px, dst) dipetakan ke utility Tailwind terdekat.
//
// Package gating (susulan): tab Suppliers = fitur Paket B (SOW Paket A cuma
// nyebut "machine, line, and part master data" - Supplier gak termasuk,
// murni buat kebutuhan procurement/reorder yang emang scope Paket B). Beda
// dari Inventory (route sendiri, di-gate PackageRoute.jsx di App.jsx) - tab
// ini bagian dari MasterDataPage yang tab lain-lainnya (Lines/Parts/Import)
// TETAP kebuka normal, jadi gatingnya di level tab (badge lock + konten
// PackageLockedNotice compact), bukan nge-lock seluruh halaman.
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import LinesTab from '../components/masterdata/LinesTab';
import PartsTab from '../components/masterdata/PartsTab';
import SuppliersTab from '../components/masterdata/SuppliersTab';
import ImportMasterDataTab from '../components/masterdata/ImportMasterDataTab';
import PackageLockedNotice from '../components/PackageLockedNotice';

const TABS = [
  { key: 'lines', label: 'Lines' },
  { key: 'parts', label: 'Parts' },
  { key: 'suppliers', label: 'Suppliers', packageRequired: 'B' },
  { key: 'import', label: 'Import Excel' },
];

function MasterDataPage() {
  usePageHeader({ title: 'Master Data Part' });
  const [activeTab, setActiveTab] = useState('lines');
  const { hasPackage } = useAuth();

  return (
    <div className="rounded-lg border border-border bg-card p-4.5">
      <div className="mb-5 flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const locked = tab.packageRequired && !hasPackage(tab.packageRequired);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors',
                active
                  ? locked
                    ? 'border-[var(--text-faint)] text-[var(--text-faint)]'
                    : 'border-primary text-primary'
                  : locked
                    ? 'border-transparent text-[var(--text-faint)] hover:text-[var(--text-dim)]'
                    : 'border-transparent text-[var(--text-dim)] hover:text-foreground'
              )}
            >
              {tab.label}
              {locked && <Lock size={11} strokeWidth={2.2} />}
            </button>
          );
        })}
      </div>

      {activeTab === 'lines' && <LinesTab />}
      {activeTab === 'parts' && <PartsTab />}
      {activeTab === 'suppliers' &&
        (hasPackage('B') ? <SuppliersTab /> : <PackageLockedNotice featureName="Supplier Management" compact />)}
      {activeTab === 'import' && <ImportMasterDataTab />}
    </div>
  );
}

export default MasterDataPage;