// src/components/SelectAllAcrossPagesBar.jsx
// Muncul di atas tabel yang paginasinya SERVER-SIDE (Parts, Inventory)
// begitu semua row di halaman aktif ke-checklist DAN total data > jumlah
// yang lagi tampil - ngasih tau user checklist-nya baru nyakup halaman
// ini, sambil nawarin pilih semua yang cocok filter (dari SEMUA halaman).
// Tabel yang paginasinya client-side (Lines/Suppliers - semua data udah
// kebaca di memori) TIDAK butuh ini - "select all" di situ otomatis udah
// nyakup semua row yang cocok filter, gak scoped per-halaman.
import { useState } from 'react';
import { Button } from './ui/button';

function SelectAllAcrossPagesBar({ pageCount, total, onSelectAll, alreadySelectedAll }) {
  const [pending, setPending] = useState(false);

  if (total <= pageCount || alreadySelectedAll) return null;

  async function handleClick() {
    setPending(true);
    try {
      await onSelectAll();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mb-3 rounded-lg border border-dashed border-[var(--accent)] bg-[var(--accent-dim)] px-3 py-2 text-[13px]">
      Semua {pageCount} baris di halaman ini terpilih.{' '}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="cursor-pointer border-0 bg-transparent p-0 font-medium text-primary underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Memuat...' : `Pilih semua ${total} data yang cocok filter`}
      </button>
    </div>
  );
}

export default SelectAllAcrossPagesBar;