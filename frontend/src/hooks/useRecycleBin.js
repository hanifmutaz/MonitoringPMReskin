// src/hooks/useRecycleBin.js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchRecycleBinEntities,
  fetchDeletedItems,
  restoreItem,
  permanentDeleteItem,
  bulkDeleteItems,
  bulkRestoreItems,
  bulkPermanentDeleteItems,
} from '../api/recycleBinApi';

// Query key react-query yang dipakai TIAP entity di halaman normalnya (di
// luar Recycle Bin) - dipakai buat invalidate cache setelah restore/bulk
// delete, supaya tabel Master Data langsung ke-refresh tanpa reload manual.
// Key recycle-bin entity ('inventory-items') SENGAJA beda dari query key
// react-query-nya ('inventory') - inventory-items nama tabel DB-nya, tapi
// query key react-query sudah lama dipakai 'inventory' di seluruh app
// (useInventoryItems.js), jadi dipetakan di sini bukan diseragamkan ulang.
const ENTITY_QUERY_KEYS = {
  lines: ['lines'],
  parts: ['parts'],
  suppliers: ['suppliers'],
  'inventory-items': ['inventory', 'inventory-rop-status'],
  roles: ['roles'],
  'cl-mapping': ['cl-mapping'],
  'part-suppliers': ['part-suppliers'],
  users: ['users'],
  'pm-line-history': ['pm-line-history', 'pm-line', 'dashboard'],
  'pm-part-history': ['pm-part-history', 'pm-part', 'pm-part-ketepatan-per-line', 'dashboard'],
  'inventory-movements': ['inventory-movements-all', 'inventory-movements'],
};

function invalidateEntity(queryClient, entity) {
  const keys = ENTITY_QUERY_KEYS[entity] || [entity];
  keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
}

export function useRecycleBinEntities() {
  return useQuery({ queryKey: ['recycle-bin-entities'], queryFn: fetchRecycleBinEntities });
}

export function useDeletedItems(entity) {
  return useQuery({
    queryKey: ['recycle-bin', entity],
    queryFn: () => fetchDeletedItems(entity),
    enabled: !!entity,
  });
}

export function useRestoreMutation(entity) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => restoreItem(entity, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycle-bin', entity] });
      invalidateEntity(queryClient, entity);
    },
  });
}

export function usePermanentDeleteMutation(entity) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => permanentDeleteItem(entity, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recycle-bin', entity] }),
  });
}

/**
 * Bulk soft-delete (checkbox massal) - dipakai di tabel Master Data biasa
 * (LinesTab dst, BUKAN cuma dari halaman Recycle Bin). Sukses -> data itu
 * hilang dari tabel aktif DAN otomatis nongol di Recycle Bin.
 */
export function useBulkDeleteMutation(entity) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => bulkDeleteItems(entity, ids),
    onSuccess: () => {
      invalidateEntity(queryClient, entity);
      queryClient.invalidateQueries({ queryKey: ['recycle-bin', entity] });
    },
  });
}

/**
 * Bulk restore (checkbox massal) - KHUSUS halaman Recycle Bin sendiri.
 * Sukses -> data balik ke tabel aktifnya, hilang dari daftar Recycle Bin.
 */
export function useBulkRestoreMutation(entity) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => bulkRestoreItems(entity, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recycle-bin', entity] });
      invalidateEntity(queryClient, entity);
    },
  });
}

/**
 * Bulk permanent-delete (checkbox massal) - KHUSUS halaman Recycle Bin
 * sendiri. IRREVERSIBLE - dipastikan sudah confirm 2x di sisi UI
 * (RecycleBinPage.jsx) sebelum mutation ini dipanggil, sama seperti
 * permanent-delete satuan.
 */
export function useBulkPermanentDeleteMutation(entity) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => bulkPermanentDeleteItems(entity, ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recycle-bin', entity] }),
  });
}