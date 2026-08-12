// src/hooks/useRowSelection.js
// Hook GENERIK buat state checkbox multi-select di tabel - dipakai sama
// persis di LinesTab/PartsTab/SuppliersTab/InventoryTab/RolesTab/dst,
// biar gak reimplement Set-toggle-logic 7 kali. `pageIds` = id yang lagi
// tampil di halaman/tab saat ini (buat checkbox header "select all
// HALAMAN INI"). Buat tabel dengan pagination SERVER-SIDE (PartsTab,
// InventoryTab) yang butuh "pilih SEMUA data yang cocok filter" (bukan
// cuma halaman ini) - dipakai `selectIds()` di bawah buat nambahin id dari
// halaman lain yang belum sempat di-render (lihat handleSelectAllMatching
// di PartsTab.jsx/InventoryTab.jsx).
import { useMemo, useState } from 'react';

export function useRowSelection(pageIds = []) {
  const [selected, setSelected] = useState(() => new Set());

  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPageSelected = pageIds.some((id) => selected.has(id));

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  // Union - nambahin banyak id sekaligus (dari luar halaman yang lagi
  // tampil) TANPA ngilangin id yang udah ke-checklist sebelumnya.
  function selectIds(ids) {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }

  function clear() {
    setSelected(new Set());
  }

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    isSelected: (id) => selected.has(id),
    toggle,
    toggleAllOnPage,
    selectIds,
    allOnPageSelected,
    someOnPageSelected,
    clear,
  };
}