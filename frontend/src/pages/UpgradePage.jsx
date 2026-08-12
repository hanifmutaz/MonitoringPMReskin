// src/pages/UpgradePage.jsx
// Halaman upgrade - muncul ketika instance Paket A akses route Paket B
// (Inventory), baik lewat klik menu grayed-out di Sidebar MAUPUN akses URL
// langsung (dipanggil dari PackageRoute.jsx). URL tetap sesuai yang diklik
// (mis. /inventory) - SENGAJA gak redirect ke halaman lain, biar konteks
// "fitur apa yang lagi diliat" gak ilang buat user.
// Isi (icon/badge/list fitur) dipindah ke PackageLockedNotice.jsx (shared -
// dipakai juga inline di tab Suppliers/PartSupplierModal, lihat komentar
// di file itu), UpgradePage sekarang cuma bungkus mode "compact=false".
import PackageLockedNotice from '../components/PackageLockedNotice';

const PAKET_B_FEATURES = {
  'Inventory Integration': [
    'Penggantian part langsung mengurangi stok dalam satu transaksi',
    'Data riwayat PM dan stok selalu konsisten',
    'Titik pemesanan dan safety stock dihitung dari pemakaian nyata',
    'Alert order otomatis saat stok perlu dipesan',
  ],
  'History Inventory': [
    'Riwayat pergerakan stok lengkap (masuk/keluar) per item',
    'Titik pemesanan dan safety stock dihitung dari pemakaian nyata',
    'Alert order otomatis saat stok perlu dipesan',
  ],
};

function UpgradePage({ featureName = 'Inventory Integration' }) {
  return <PackageLockedNotice featureName={featureName} features={PAKET_B_FEATURES[featureName]} />;
}

export default UpgradePage;