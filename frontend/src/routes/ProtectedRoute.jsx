// src/routes/ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ForbiddenState from '../components/ForbiddenState';

/**
 * @param {string[]} [allowedRoles] - kalau diisi, cuma role ini yang boleh
 * lewat (mis. ['Admin'] buat Settings & User Management - UI Spec §3.2).
 * @param {string} [requiredPermission] - kalau diisi, cuma user yang punya
 * permission key ini (atau Admin) yang boleh lewat (mis. 'dashboard.multi_site').
 * Beda dari allowedRoles: ini permission granular yang bisa di-assign Admin
 * ke role manapun lewat UI Role Management, bukan hardcode nama role.
 * Backend TETAP jadi penegak utama (Dev Rules §12) - ini cuma UX, sembunyiin
 * menu/route yang emang gak bisa diakses dari sisi tampilan.
 */
function ProtectedRoute({ allowedRoles, requiredPermission }) {
  const { isAuthenticated, loading, user, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="caption" style={{ padding: 32 }}>Memuat sesi...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role/permission tidak cocok -> tampilkan "Akses ditolak", BUKAN redirect
  // ke Dashboard (dulu klik menu yang tidak boleh malah pindah ke Dashboard
  // tanpa penjelasan).
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <ForbiddenState />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <ForbiddenState />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
