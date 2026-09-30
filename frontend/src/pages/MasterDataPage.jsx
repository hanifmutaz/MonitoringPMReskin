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
//
// polish: A10 (motion, 08 Sep 2026) - underline tab yang tadinya
// border-bottom per-tombol (nyala/mati instan pas ganti tab) diganti 1
// indicator <span> yang GESER (§6.3 pola #5, "Tab indicator slide").
// Lihat hooks/useTabIndicator.js buat mekanisme pengukurannya - shared
// sama RecycleBinPage.jsx (consumer ke-2 pola tab yang sama persis).
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { usePageHeader } from '../contexts/PageHeaderContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import useTabIndicator from '../hooks/useTabIndicator';
import LinesTab from '../components/masterdata/LinesTab';
import PartsTab from '../components/masterdata/PartsTab';
import SuppliersTab from '../components/masterdata/SuppliersTab';
import ImportMasterDataTab from '../components/masterdata/ImportMasterDataTab';
import JenisPenggantianTab from '../components/masterdata/JenisPenggantianTab';
import PackageLockedNotice from '../components/PackageLockedNotice';

const TABS = [
  { key: 'lines', label: 'Lines' },
  { key: 'parts', label: 'Parts' },
  { key: 'suppliers', label: 'Suppliers', packageRequired: 'B' },
  { key: 'import', label: 'Import Excel' },
  // Admin only: kelola jenis penggantian PM Part (Terjadwal, PM Early, Broken, Aus, dst).
  { key: 'jenis', label: 'Jenis Penggantian', adminOnly: true },
];

function MasterDataPage() {
  usePageHeader({ title: 'Master Data Part' });
  const [activeTab, setActiveTab] = useState('lines');
  const { hasPackage, isAdmin } = useAuth();
  const visibleTabs = TABS.filter((tab) => !tab.adminOnly || isAdmin);
  // polish: A10 (motion) - sliding tab indicator, lihat hooks/useTabIndicator.js
  const { containerRef, itemRef, indicatorStyle } = useTabIndicator(activeTab);

  return (
    <div className="rounded-xl border border-border bg-card p-4.5">
      <div ref={containerRef} className="relative mb-5 flex gap-1 border-b border-border">
        {visibleTabs.map((tab) => {
          const active = activeTab === tab.key;
          const locked = tab.packageRequired && !hasPackage(tab.packageRequired);
          return (
            <button
              key={tab.key}
              ref={itemRef(tab.key)}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex cursor-pointer items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors',
                active
                  ? locked
                    ? 'text-[var(--text-faint)]'
                    : 'text-primary'
                  : locked
                    ? 'text-[var(--text-faint)] hover:text-[var(--text-dim)]'
                    : 'text-[var(--text-dim)] hover:text-foreground'
              )}
            >
              {tab.label}
              {locked && <Lock size={11} strokeWidth={2.2} />}
            </button>
          );
        })}
        {/* polish: A10 (motion) - 1 garis bawah yang GESER (translate/width
            animasi), gantiin tiap tombol nyalain border-bottom sendiri
            (dulu "muncul-hilang" instan). Warna abu-abu di tab locked
            biar konsisten sama teksnya. */}
        <span
          aria-hidden="true"
          className="absolute bottom-0 h-0.5 bg-primary transition-[left,width] duration-[var(--duration-base)] ease-standard"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            opacity: indicatorStyle.ready ? 1 : 0,
            backgroundColor:
              TABS.find((t) => t.key === activeTab)?.packageRequired && !hasPackage('B')
                ? 'var(--text-faint)'
                : undefined,
          }}
        />
      </div>

      {activeTab === 'lines' && <LinesTab />}
      {activeTab === 'parts' && <PartsTab />}
      {activeTab === 'suppliers' &&
        (hasPackage('B') ? <SuppliersTab /> : <PackageLockedNotice featureName="Supplier Management" compact />)}
      {activeTab === 'import' && <ImportMasterDataTab />}
      {activeTab === 'jenis' && isAdmin && <JenisPenggantianTab />}
    </div>
  );
}

export default MasterDataPage;