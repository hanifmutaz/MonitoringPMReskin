// src/api/downloadApi.js
// Download file dari API (auth lewat cookie httpOnly, jadi tidak bisa pakai
// <a href> biasa lintas origin). Ambil sebagai Blob lalu picu "Save as".
import apiClient from './client';

// Error dari server datang sebagai Blob (karena responseType 'blob') -
// bongkar dulu JSON-nya supaya pesan seperti "Data terlalu banyak..." tampil.
async function extractErrorMessage(err, fallback) {
  const blob = err?.response?.data;
  if (blob instanceof Blob) {
    try {
      const json = JSON.parse(await blob.text());
      if (json?.message) return json.message;
    } catch {
      /* bukan JSON, pakai fallback */
    }
  }
  return err?.response?.data?.message || fallback;
}

function filenameFromHeader(headers, fallback) {
  const cd = headers?.['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/i.exec(cd);
  return match ? match[1] : fallback;
}

/**
 * @param {string} path    mis. '/pm-part-history/export'
 * @param {object} params  query string (nilai undefined diabaikan)
 * @param {string} fallbackName  nama file kalau header tidak terbaca
 * @param {'GET'|'POST'} method
 */
export async function downloadFile(path, params, fallbackName = 'download', method = 'GET') {
  try {
    const response = await apiClient.request({ url: path, method, params, responseType: 'blob' });
    const filename = filenameFromHeader(response.headers, fallbackName);
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Beri waktu browser memulai download sebelum URL dilepas.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return filename;
  } catch (err) {
    throw new Error(await extractErrorMessage(err, 'Gagal mengunduh file'));
  }
}
