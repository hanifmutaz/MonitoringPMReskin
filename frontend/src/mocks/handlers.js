// src/mocks/handlers.js
// MSW request handlers - DEV ONLY. Intercept endpoint dashboard & balikin
// dummy dari dashboardSeed. NOL perubahan di hook/komponen - kode asli lu
// jalan apa adanya, cuma response network-nya yang di-mock pas dev.
//
// PENTING: path di bawah pakai wildcard `*` di depan biar match apapun
// base URL-nya (localhost:xxxx, /api, VITE_API_URL, dst). TAPI segmen
// path-nya (mis. /dashboard/summary) HARUS cocok sama yang di
// src/api/dashboardApi.js lu. Cek di sana, samain. Kalau beda (mis.
// pakai /dashboard/kpi bukan /summary), ganti string-nya.
//
// Cara mastiin match: buka Network tab pas dashboard load, lihat Request
// URL-nya, tiru segmen path-nya persis di sini.

import { http, HttpResponse } from 'msw';
import { dashboardSeed } from './dashboardSeed';

export const handlers = [
  http.get('*/dashboard/summary', () => HttpResponse.json(dashboardSeed.summary)),
  http.get('*/dashboard/attention', () => HttpResponse.json(dashboardSeed.attention)),
  http.get('*/dashboard/upcoming', () => HttpResponse.json(dashboardSeed.upcoming)),
  http.get('*/dashboard/ketepatan-attention', () => HttpResponse.json(dashboardSeed.ketepatan_attention)),

  // Kalau multi-site kepanggil (user punya permission dashboard.multi_site),
  // balikin array kosong biar SiteSwitcher gak error / gak render.
  http.get('*/dashboard/multi-site', () => HttpResponse.json([])),
];
