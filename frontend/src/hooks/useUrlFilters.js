// src/hooks/useUrlFilters.js
//
// State filter yang tersimpan di URL (?line=3&status=DANGER), jadi:
//   - bisa di-bookmark / dibagikan,
//   - tidak hilang saat refresh,
//   - tidak reset saat user pindah halaman lalu kembali (disimpan juga di
//     sessionStorage per `storageKey`, hanya selama tab terbuka).
// Prioritas sumber nilai: lihat utils/urlFilters.js.
//
// Semua nilai bertipe string (sama dengan nilai Select/Combobox). Perubahan
// filter memakai `replace` supaya tombol Back tidak harus ditekan puluhan kali
// setelah mengetik di kolom pencarian.
//
//   const [filters, setFilters, resetFilters] = useUrlFilters({
//     storageKey: 'pm-line-status',
//     defaults: { q: '', sm: 'all' },
//     validators: { sm: (v) => ['all', 'OK', 'DANGER'].includes(v) },
//   });
//   setFilters({ sm: 'DANGER' });   // gabung dengan nilai lain yang sudah ada
//
// `defaults` & `validators` harus stabil (konstanta di luar komponen).
import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { buildSearchParams, resolveFilters, toStoredFilters } from '../utils/urlFilters';

const PREFIX = 'pm-filters:';

function readStored(storageKey) {
  try {
    return JSON.parse(window.sessionStorage.getItem(PREFIX + storageKey) || 'null');
  } catch {
    return null; // storage diblokir / JSON rusak -> anggap kosong
  }
}

function writeStored(storageKey, value) {
  try {
    if (value) window.sessionStorage.setItem(PREFIX + storageKey, JSON.stringify(value));
    else window.sessionStorage.removeItem(PREFIX + storageKey);
  } catch {
    /* mode private / quota penuh - filter tetap jalan lewat URL */
  }
}

export function useUrlFilters({ storageKey, defaults, validators }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => resolveFilters({ defaults, validators, urlParams: searchParams, stored: readStored(storageKey) }),
    [defaults, validators, searchParams, storageKey]
  );

  // Selaraskan URL & storage dengan nilai yang berlaku. Dua kasus yang penting:
  //  - datang tanpa query tapi ada filter tersimpan -> tulis ke URL (jadi bisa dibagikan)
  //  - datang lewat link -> simpan, supaya tetap ada setelah pindah halaman
  const serialized = JSON.stringify(filters);
  useEffect(() => {
    const current = JSON.parse(serialized);
    writeStored(storageKey, toStoredFilters(current, defaults));
    const wanted = buildSearchParams(searchParams, current, defaults);
    if (wanted.toString() !== searchParams.toString()) setSearchParams(wanted, { replace: true });
    // searchParams sengaja tidak jadi dependency: effect ini hanya bereaksi pada perubahan nilai filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, storageKey, defaults]);

  const setFilters = useCallback(
    (patch) => {
      const next = { ...filters, ...patch };
      writeStored(storageKey, toStoredFilters(next, defaults));
      setSearchParams(buildSearchParams(searchParams, next, defaults), { replace: true });
    },
    [filters, storageKey, defaults, searchParams, setSearchParams]
  );

  const resetFilters = useCallback(() => setFilters(defaults), [setFilters, defaults]);

  return [filters, setFilters, resetFilters];
}

export default useUrlFilters;
