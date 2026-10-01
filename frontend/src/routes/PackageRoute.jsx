// src/routes/PackageRoute.jsx
// Beda dari ProtectedRoute.jsx (yang REDIRECT ke '/' kalau gak lolos):
// PackageRoute RENDER UpgradePage di tempat, URL TETAP di path yang
// diklik (mis. /inventory). Ini SENGAJA - ProtectedRoute gating akses
// yang emang gak boleh diliat sama sekali (role/permission), sedangkan
// PackageRoute gating fitur yang BOLEH diliat infonya (buat upsell) tapi
// belum bisa dipakai datanya. Dipasang di DALAM ProtectedRoute (App.jsx)
// - auth tetap dicek duluan.
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UpgradePage from '../pages/UpgradePage';

/**
 * @param {'A'|'B'} requiredPackage - paket minimum yang dibutuhkan
 * @param {string} featureName - ditampilkan di UpgradePage (mis. "Inventory Integration")
 * @param {React.ReactNode} children
 */
function PackageRoute({ requiredPackage, featureName, children }) {
  const { hasPackage, isAdmin } = useAuth();

  if (!hasPackage(requiredPackage)) {
    // Non-admin gak boleh tau fitur ini ada (menunya juga disembunyikan di
    // Sidebar) - redirect ke '/', sama kayak ProtectedRoute. Admin tetap
    // dapat UpgradePage.
    if (!isAdmin) return <Navigate to="/" replace />;
    return <UpgradePage featureName={featureName} />;
  }

  return children;
}

export default PackageRoute;
