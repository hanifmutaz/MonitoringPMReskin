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
//
// isSelectable(id) (docs/frontend/MIGRATION-PLAN.md Phase 11): dipakai
// DataTable buat nentuin row mana yang checkbox-nya di-render sama sekali
// vs sengaja dikosongin - kasus asli: UserManagementPage TIDAK pernah
// nampilin checkbox di baris user yang lagi login sendiri (proteksi biar
// gak bisa keceklis+bulk-delete akun sendiri). Sebelum ini di-tambahin,
// perlindungan itu cuma bergantung pada `pageIds`/`selectableIds` yang
// DIKIRIM caller SUDAH exclude id itu dari awal (lihat UserManagementPage
// - `selectableIds` exclude `currentUser.id`) - tapi `toggle(id)` sendiri
// TIDAK PERNAH validasi id-nya terhadap `pageIds`, jadi kalau checkbox
// buat row itu somehow ke-render (mis. lewat DataTable yang render
// checkbox utk SEMUA row tanpa kecuali), user bisa toggle ID yang
// sebetulnya "gak boleh diceklis". `isSelectable` menutup celah itu di titik
// render, bukan cuma titik pengiriman prop.
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
  const pageIdSet = useMemo(() => new Set(pageIds), [pageIds]);

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    isSelected: (id) => selected.has(id),
    // Default TRUE kalau pageIds kosong (tabel tanpa universe eksplisit,
    // mis. konsumen lama yang belum butuh exclude-row) - biar gak ada
    // perubahan perilaku buat konsumen existing yang gak punya kasus
    // "sebagian row gak boleh diceklis".
    isSelectable: (id) => pageIds.length === 0 || pageIdSet.has(id),
    toggle,
    toggleAllOnPage,
    selectIds,
    allOnPageSelected,
    someOnPageSelected,
    clear,
  };
}