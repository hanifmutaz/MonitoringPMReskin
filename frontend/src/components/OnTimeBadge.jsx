// src/components/OnTimeBadge.jsx
// Reskin (checklist §3 item 6 "PM pages", batch 1/N): `.badge`/`.badge-*`/
// `.dot` lama dilepas total, diganti Tailwind - visual & struktur PERSIS
// NGIKUTIN StatusBadge.jsx (rounded-full + dot + token bg-*-dim/text-*),
// BUKAN gaya baru. 'muted' (bukan warna netral abu-abu) dipetakan ke token
// yang sama dipakai NeedsDataCard/PercentBadge di DashboardPage.jsx buat
// kondisi "belum ada data". on_time: true = tepat waktu, false = telat,
// null/undefined = dikecualikan dari perhitungan (BROKEN untuk PM Part)
// atau data lama sebelum fitur Ketepatan PM ada (migration 1700000012000) -
// logic ini TIDAK berubah.
function OnTimeBadge({ onTime }) {
    if (onTime === null || onTime === undefined) {
        return (
            <span
                className="inline-flex items-center gap-1 rounded-full bg-[var(--panel-3)] px-[10px] py-[3px] font-[var(--font-mono)] text-xs text-[var(--text-faint)]"
                title="Dikecualikan dari perhitungan, atau data lama sebelum fitur ini ada"
            >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-faint)]" />-
            </span>
        );
    }
    if (onTime) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-ok-dim px-[10px] py-[3px] font-[var(--font-mono)] text-xs text-ok">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok" />
                Tepat waktu
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-danger-dim px-[10px] py-[3px] font-[var(--font-mono)] text-xs text-danger">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
            Telat
        </span>
    );
}

export default OnTimeBadge;
