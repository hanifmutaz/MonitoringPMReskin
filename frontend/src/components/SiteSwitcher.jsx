// src/components/SiteSwitcher.jsx
// Reuse class .tabs/.tab-item yang udah ada (lihat MasterDataPage.jsx) -
// bukan komponen tab baru. Titik warna kecil di tiap tab nunjukin status
// koneksi ke site itu (ok/stale/unreachable) - warna sama kayak yang dipake
// StatusBadge.jsx (var(--ok)/var(--warn)/var(--danger)), tapi ukurannya
// dikecilin karena ini di dalam tab, bukan badge berdiri sendiri.
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
    <div className="tabs">
      {sites.map((site) => (
        <button
          key={site.site_id}
          type="button"
          className={`tab-item${selectedSiteId === site.site_id ? ' active' : ''}`}
          onClick={() => onChange(site.site_id)}
        >
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: DOT_COLOR[site.status] || 'var(--text-faint)',
              marginRight: 6,
            }}
          />
          {site.site_label}
        </button>
      ))}
    </div>
  );
}

export default SiteSwitcher;
