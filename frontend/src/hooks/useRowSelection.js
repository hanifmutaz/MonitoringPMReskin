// src/hooks/useRowSelection.js
// Hook GENERIK buat state checkbox multi-select di tabel - dipakai sama
// persis di LinesTab/PartsTab/SuppliersTab/InventoryTab/RolesTab/dst,
// biar gak reimplement Set-toggle-logic 7 kali. `pageIds` = id yang lagi
// tampil di halaman/tab saat ini (buat "select all" scoped ke situ aja,
// bukan seluruh dataset yang mungkin ke-filter/paginated).
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
    allOnPageSelected,
    someOnPageSelected,
    clear,
  };
}