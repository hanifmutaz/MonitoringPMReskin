// src/components/SiteSwitcher.jsx
// Reskin (docs/frontend/MIGRATION-PLAN.md Phase 14 - ditemukan pas cross-
// check class CSS lama sebelum hapus components.css, BUKAN sengaja
// ditunda): file ini kelewat pas Phase 6 reskin Dashboard, padahal
// dipakai LANGSUNG oleh 3 halaman Dashboard yang udah direskin
// (DashboardPage/DashboardPmLineWeeklyPage/DashboardPmPartPage) - jadi
// walau ketiga halaman itu udah bersih dari class lama, komponen anak
// ini masih pakai `.tabs`/`.tab-item` (components.css), bikin class itu
// KELIHATAN masih "live" padahal cuma dari satu file yang kelewat.
// `.tabs`/`.tab-item` diganti Tailwind - visual & behavior identik (garis
// bawah 2px buat tab aktif, warna primary/text-dim sama kayak
// LinesTab.jsx punya filter pill). Titik warna status (ok/stale/
// unreachable) TIDAK berubah.
import { cn } from '../lib/utils';

const DOT_COLOR = {
  ok: 'var(--ok)',
  stale: 'var(--warn)',
  unreachable: 'var(--danger)',
};

function SiteSwitcher({ sites, selectedSiteId, onChange }) {
  // Cuma 1 site (berarti gak ada REMOTE_SITE_* dikonfigurasi, atau lagi di
  // instance Subcont) - gak ada yang perlu di-switch, jangan render apa-apa.
  if (!sites || sites.length <= 1) return null;

  return (
    <div className="mb-5 flex gap-1 border-b border-border">
      {sites.map((site) => (
        <button
          key={site.site_id}
          type="button"
          onClick={() => onChange(site.site_id)}
          className={cn(
            'flex cursor-pointer items-center border-x-0 border-t-0 border-b-2 bg-transparent px-4 py-2.5 text-[13px] font-medium transition-colors',
            selectedSiteId === site.site_id
              ? 'border-b-primary text-primary'
              : 'border-b-transparent text-[var(--text-dim)] hover:text-foreground'
          )}
        >
          <span
            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: DOT_COLOR[site.status] || 'var(--text-faint)' }}
          />
          {site.site_label}
        </button>
      ))}
    </div>
  );
}

export default SiteSwitcher;
