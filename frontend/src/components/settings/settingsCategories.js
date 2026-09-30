// src/components/settings/settingsCategories.js
// Satu sumber kebenaran struktur Settings - dipakai SettingsPage (render) dan
// Sidebar (submenu), supaya keduanya tidak bisa drift.
//
// Ada 2 level:
//  - CATEGORY_META : 10 kategori dari backend (app_settings.category) beserta
//    judul yang sudah disederhanakan. Ini yang tampil sebagai judul kartu.
//  - SETTINGS_MENU : PEMETAAN kategori ke submenu. Beberapa kategori digabung
//    ke 1 submenu (1 halaman, beberapa kartu) supaya menu tidak kepanjangan.
//    Mau ubah pengelompokan? Cukup edit `categories` di SETTINGS_MENU ini -
//    tidak ada yang lain yang perlu disentuh.

export const CATEGORY_META = {
  threshold_pm_part: { title: 'Batas Status Part' },
  skema_poin_monthly: { title: 'Poin PM Monthly' },
  skema_poin_weekly: { title: 'Poin PM Weekly' },
  threshold_monthly_weekly: { title: 'Batas Status Monthly & Weekly' },
  relasi_monthly_weekly: { title: 'Hubungan Monthly & Weekly' },
  sync_data_produksi: { title: 'Sinkron Data Produksi' },
  dashboard_tampilan: { title: 'Tampilan Dashboard' },
  user_role: { title: 'Akses & Sesi' },
  notifikasi: { title: 'Notifikasi Email' },
  inventory: { title: 'Stok Pengaman' },
};

export const SETTINGS_MENU = [
  { key: 'pm-part', title: 'PM Part', categories: ['threshold_pm_part'] },
  {
    key: 'pm-monthly-weekly',
    title: 'PM Monthly & Weekly',
    categories: ['skema_poin_monthly', 'skema_poin_weekly', 'threshold_monthly_weekly', 'relasi_monthly_weekly'],
  },
  { key: 'inventory', title: 'Inventory', categories: ['inventory'] },
  {
    key: 'umum',
    title: 'Umum',
    categories: ['sync_data_produksi', 'dashboard_tampilan', 'user_role', 'notifikasi'],
  },
];

export const DEFAULT_SETTINGS_MENU_KEY = SETTINGS_MENU[0].key;

// Cari submenu dari key-nya; kalau yang dikasih ternyata key kategori lama
// (URL /settings/threshold_pm_part dari versi sebelumnya), arahkan ke
// submenu yang sekarang menampung kategori itu.
export function findSettingsMenu(param) {
  return (
    SETTINGS_MENU.find((m) => m.key === param) ||
    SETTINGS_MENU.find((m) => m.categories.includes(param)) ||
    null
  );
}
