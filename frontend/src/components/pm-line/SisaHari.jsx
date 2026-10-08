// src/components/pm-line/SisaHari.jsx
//
// Tampilan "Sisa Hari" PM Monthly/Weekly. Sisa Hari dihitung dari poin MENTAH,
// jadi bisa NEGATIF = sudah lewat jatuh tempo (telat), bukan lagi mentok di 0.
//   - null            -> "-" (belum pernah PM)
//   - negatif         -> "Telat X" (merah)
//   - toleransi aktif -> "0" + penanda "s/d HH:MM": cap baru terlewati di hari
//                        jatuh tempo, PM sebelum jam batas masih dinilai tepat waktu
//   - lainnya         -> angka apa adanya
export function sisaHariLabel(sisa) {
  if (sisa === null || sisa === undefined) return '-';
  if (sisa < 0) return `Telat ${Math.abs(sisa)}`;
  return String(sisa);
}

export default function SisaHari({ sisa, toleransi = false, sampai = null }) {
  if (sisa === null || sisa === undefined) {
    return <span className="font-[var(--font-mono)] text-[13px]">-</span>;
  }
  if (sisa < 0) {
    return (
      <span
        className="font-[var(--font-mono)] text-[13px] font-semibold text-danger"
        title="Sudah melewati jatuh tempo"
      >
        {sisaHariLabel(sisa)}
      </span>
    );
  }
  return (
    <span className="font-[var(--font-mono)] text-[13px]">
      {sisa}
      {toleransi && (
        <span
          className="ml-1.5 rounded bg-warn-dim px-1 py-0.5 text-[10px] font-semibold text-warn"
          title={`Jatuh tempo. PM sebelum jam ${sampai || 'batas'} WIB masih dihitung tepat waktu`}
        >
          s/d {sampai}
        </span>
      )}
    </span>
  );
}
