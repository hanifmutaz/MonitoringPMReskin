// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DashboardPmPartPage from './pages/DashboardPmPartPage';
import DashboardPmLineWeeklyPage from './pages/DashboardPmLineWeeklyPage';
import PmPartMonitoringPage from './pages/PmPartMonitoringPage';
import PmPartFormPage from './pages/PmPartFormPage';
import PmPartHistoryPage from './pages/PmPartHistoryPage';
import PmLineStatusPage from './pages/PmLineStatusPage';
import PmLineFormPage from './pages/PmLineFormPage';
import PmLineHistoryPage from './pages/PmLineHistoryPage';
import MasterDataPage from './pages/MasterDataPage';
import InventoryPage from './pages/InventoryPage';
import InventoryHistoryPage from './pages/InventoryHistoryPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard/pm-part" element={<DashboardPmPartPage />} />
          <Route path="/dashboard/pm-line" element={<DashboardPmLineWeeklyPage />} />

          <Route path="/pm-part" element={<PmPartMonitoringPage />} />
          <Route path="/pm-part/form" element={<PmPartFormPage />} />
          <Route path="/pm-part/history" element={<PmPartHistoryPage />} />

          <Route path="/pm-line" element={<PmLineStatusPage />} />
          <Route path="/pm-line/form" element={<PmLineFormPage />} />
          <Route path="/pm-line/history" element={<PmLineHistoryPage />} />

          <Route path="/master-data" element={<MasterDataPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/history" element={<InventoryHistoryPage />} />

          {/* Di luar ProtectedRoute allowedRoles - SEMUA role yang login
              boleh akses profil sendiri, gak digating per-role kayak
              /settings & /users di bawah. */}
          <Route path="/profile" element={<ProfilePage />} />

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/users" element={<UserManagementPage />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all - juga nangkep link ke fitur yang belum ada implementasinya
          beneran (misal "Lupa Password?" di LoginPage), daripada disembunyiin
          total dari UI. Sengaja di luar ProtectedRoute biar kena baik lagi
          login maupun udah, dan gak butuh backend endpoint apa pun. */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;