// src/utils/urlFilters.js
//
// Logika murni (tanpa React/DOM) di balik hooks/useUrlFilters.js, dipisah supaya
// bisa dites dengan `node --test`.
//
// Aturan sumber nilai filter (urutan prioritas):
//   1. URL, kalau ADA minimal satu key filter di query string. Link yang
//      dibagikan / di-bookmark harus selalu menang, termasuk saat isinya
//      "semua default" ditulis eksplisit.
//   2. Nilai tersimpan di sessionStorage (supaya filter tidak reset saat user
//      pindah halaman lewat sidebar lalu kembali).
//   3. Default.
// Nilai yang gagal validator (mis. ?sm=ngawur, tanggal rusak dari link lama)
// jatuh ke default, bukan dilempar ke API.

/** @param {Record<string,string>} defaults */
export function resolveFilters({ defaults, validators = {}, urlParams, stored }) {
  const keys = Object.keys(defaults);
  const fromUrl = keys.some((k) => urlParams.has(k));
  const out = {};
  for (const k of keys) {
    const raw = fromUrl ? urlParams.get(k) : stored?.[k];
    const isValid = typeof raw === 'string' && (!validators[k] || validators[k](raw));
    out[k] = isValid ? raw : defaults[k];
  }
  return out;
}

/**
 * Salin query string yang ada (param lain di luar filter tidak disentuh),
 * lalu tulis filter: nilai sama dengan default dihapus supaya URL tetap bersih.
 */
export function buildSearchParams(current, filters, defaults) {
  const next = new URLSearchParams(current);
  for (const k of Object.keys(defaults)) {
    const v = filters[k];
    if (v === undefined || v === defaults[k]) next.delete(k);
    else next.set(k, v);
  }
  return next;
}

/** Hanya nilai non-default yang disimpan; null kalau tidak ada yang perlu disimpan. */
export function toStoredFilters(filters, defaults) {
  const out = {};
  for (const k of Object.keys(defaults)) {
    if (filters[k] !== defaults[k]) out[k] = filters[k];
  }
  return Object.keys(out).length ? out : null;
}

export const isDateString = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
};
