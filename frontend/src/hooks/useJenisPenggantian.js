// src/hooks/useJenisPenggantian.js
//
// Pengganti components/pm-part/constants.js (JENIS_OPTIONS/JENIS_LABEL yang
// di-hardcode). Daftar jenis sekarang master data dari backend
// (tabel jenis_penggantian), jadi dropdown form, filter history, dan label di
// tabel semuanya ngikutin satu sumber ini.
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createJenisPenggantian, fetchJenisPenggantian, updateJenisPenggantian } from '../api/jenisPenggantianApi';

const QUERY_KEY = ['jenis-penggantian'];

export function useJenisPenggantian() {
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: fetchJenisPenggantian, staleTime: 5 * 60 * 1000 });
  const all = query.data || [];

  return useMemo(() => {
    const labelMap = Object.fromEntries(all.map((j) => [j.code, j.label]));
    return {
      isLoading: query.isLoading,
      all, // termasuk yang nonaktif (dipakai admin & filter/label history)
      // Dropdown input baru: hanya yang aktif.
      activeOptions: all.filter((j) => j.is_active).map((j) => ({ value: j.code, label: j.label })),
      // Filter history: semua (riwayat lama bisa memakai jenis yang sudah nonaktif).
      filterOptions: all.map((j) => ({ value: j.code, label: j.label })),
      // Kode yang tidak dikenal ditampilkan apa adanya, bukan kosong.
      labelOf: (code) => labelMap[code] ?? code,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, query.isLoading]);
}

export function useJenisPenggantianMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const create = useMutation({ mutationFn: createJenisPenggantian, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, payload }) => updateJenisPenggantian(id, payload), onSuccess: invalidate });

  return { create, update };
}
