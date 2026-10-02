// src/App.jsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import PackageRoute from './routes/PackageRoute';
import MainLayout from './layouts/MainLayout';
import PageLoader from './components/PageLoader';

// Lazy-load semua halaman (route-based code splitting). Sebelumnya semua
// 20 halaman ke-bundle jadi SATU chunk index.js 1MB+ (lihat warning
// "chunks larger than 500kB" pas `npm run build`) - user yang cuma butuh
// buka Dashboard tetap harus download kode Master Data, Inventory, User
// Management, dll yang gak dia pakai. Sekarang tiap halaman jadi chunk
// terpisah, di-fetch on-demand pas route-nya diakses. LoginPage TIDAK
// di-lazy karena itu halaman pertama yang pasti dibuka semua orang -
// lazy-load di situ cuma nambah 1 round-trip tanpa untung apa-apa.
import LoginPage from './pages/LoginPage';

const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const DashboardPmPartPage = lazy(() => import('./pages/DashboardPmPartPage'));
const DashboardPmLineWeeklyPage = lazy(() => import('./pages/DashboardPmLineWeeklyPage'));
const TvDashboardPage = lazy(() => import('./pages/TvDashboardPage'));
const PmPartMonitoringPage = lazy(() => import('./pages/PmPartMonitoringPage'));
const PmPartFormPage = lazy(() => import('./pages/PmPartFormPage'));
const PmPartHistoryPage = lazy(() => import('./pages/PmPartHistoryPage'));
const PmLineStatusPage = lazy(() => import('./pages/PmLineStatusPage'));
const PmLineFormPage = lazy(() => import('./pages/PmLineFormPage'));
const PmLineHistoryPage = lazy(() => import('./pages/PmLineHistoryPage'));
const MasterDataPage = lazy(() => import('./pages/MasterDataPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const InventoryHistoryPage = lazy(() => import('./pages/InventoryHistoryPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const RecycleBinPage = lazy(() => import('./pages/RecycleBinPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Mirror backend inventoryRoutes.js (canReadInventory).
const INVENTORY_ACCESS = ['inventory.view', 'inventory.input', 'inventory.manage'];

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          {/* Mode TV (PM Monitoring, monitor/TV): fullscreen, di luar MainLayout
              (tanpa sidebar/topbar). Tetap butuh login, view-only. */}
          <Route path="/tv" element={<TvDashboardPage />} />

          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard/pm-part" element={<DashboardPmPartPage />} />
            <Route path="/dashboard/pm-line" element={<DashboardPmLineWeeklyPage />} />

            {/* Akses per modul pakai permission (bukan nama role) - Admin
                selalu lolos ('*'). Dashboard di atas terbuka untuk semua
                role yang login. */}
            <Route element={<ProtectedRoute requiredPermission="pm_part.view" />}>
              <Route path="/pm-part" element={<PmPartMonitoringPage />} />
              <Route path="/pm-part/history" element={<PmPartHistoryPage />} />
            </Route>
            <Route element={<ProtectedRoute requiredPermission="pm_part.submit" />}>
              <Route path="/pm-part/form" element={<PmPartFormPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="pm_line.view" />}>
              <Route path="/pm-line" element={<PmLineStatusPage />} />
              <Route path="/pm-line/history" element={<PmLineHistoryPage />} />
            </Route>
            <Route element={<ProtectedRoute requiredPermission="pm_line.submit" />}>
              <Route path="/pm-line/form" element={<PmLineFormPage />} />
            </Route>

            <Route element={<ProtectedRoute requiredPermission="masterdata.view" />}>
              <Route path="/master-data" element={<MasterDataPage />} />
            </Route>
            {/* Inventory = fitur Paket B (lihat diagram "Satu Sistem, Dua
                Paket") - instance Paket A tetap sampai ke halaman ini kalau
                klik menu Sidebar (yang grayed-out + badge "Paket B"), tapi
                PackageRoute render UpgradePage di tempat, bukan redirect. */}
            <Route element={<ProtectedRoute requiredAnyPermission={INVENTORY_ACCESS} />}>
              <Route
                path="/inventory"
                element={
                  <PackageRoute requiredPackage="B" featureName="Inventory Integration">
                    <InventoryPage />
                  </PackageRoute>
                }
              />
              <Route
                path="/inventory/history"
                element={
                  <PackageRoute requiredPackage="B" featureName="History Inventory">
                    <InventoryHistoryPage />
                  </PackageRoute>
                }
              />
            </Route>

            {/* Di luar ProtectedRoute allowedRoles - SEMUA role yang login
                boleh akses profil sendiri, gak digating per-role kayak
                /settings & /users di bawah. */}
            {/* Akun role Display (monitor/TV) view-only: dilarang buka profil. */}
            <Route element={<ProtectedRoute deniedRoles={['Display']} />}>
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Settings: bukan Admin-only lagi - role yang di-grant edit
                minimal 1 setting juga boleh buka (dicek di SettingsPage
                lewat useCanAccessSettings, backend GET /settings memang
                terbuka untuk semua role login). Submenu per kategori:
                /settings/:category. */}
            <Route element={<ProtectedRoute deniedRoles={['Display']} />}>
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/:menu" element={<SettingsPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/recycle-bin" element={<RecycleBinPage />} />
            </Route>
            {/* Audit Log bisa didelegasikan ke role non-Admin lewat permission. */}
            <Route element={<ProtectedRoute requiredPermission="auditlog.view" />}>
              <Route path="/audit-log" element={<AuditLogPage />} />
            </Route>
          </Route>
        </Route>

        {/* Catch-all - juga nangkep link ke fitur yang belum ada implementasinya
            beneran (misal "Lupa Password?" di LoginPage), daripada disembunyiin
            total dari UI. Sengaja di luar ProtectedRoute biar kena baik lagi
            login maupun udah, dan gak butuh backend endpoint apa pun. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;