// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboardSummary';

function NavItem({ to, children, badgeCount }) {
  return (
    <NavLink to={to} end className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      <span>{children}</span>
      {badgeCount > 0 && <span className="nav-item-badge">{badgeCount}</span>}
    </NavLink>
  );
}

function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { data: summary } = useDashboardSummary();

  return (
    <aside className="sidebar">
      <div className="brand-mark-row">
        <div className="brand-mark">H</div>
        <div>
          <div className="brand-text-title">PM Monitor</div>
          <div className="brand-text-sub">Hirose Internal</div>
        </div>
      </div>

      <nav className="nav-scroll">
        <div className="nav-group-label">Dashboard</div>
        <NavItem to="/">Dashboard Management</NavItem>
        <NavItem to="/dashboard/pm-part">Dashboard PM Part</NavItem>
        <NavItem to="/dashboard/pm-line">Dashboard PM Monthly and Weekly</NavItem>

        <div className="nav-group-label">PM Part</div>
        <NavItem to="/pm-part" badgeCount={summary?.status_danger}>
          Monitoring PM Part
        </NavItem>
        <NavItem to="/pm-part/history">History PM Part</NavItem>

        <div className="nav-group-label">PM Monthly and Weekly</div>
        <NavItem to="/pm-line" badgeCount={summary?.lines_critical}>
          Monitoring PM Monthly and Weekly
        </NavItem>
        <NavItem to="/pm-line/history">History PM Monthly and Weekly</NavItem>

        <div className="nav-group-label">Data</div>
        <NavItem to="/master-data">Master Data Part</NavItem>
        <NavItem to="/inventory">Inventory</NavItem>
        <NavItem to="/inventory/history">History Inventory</NavItem>

        {isAdmin && (
          <>
            <div className="nav-group-label">Administrasi</div>
            <NavItem to="/settings">Settings</NavItem>
            <NavItem to="/users">User Management</NavItem>
          </>
        )}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-name">{user?.full_name}</div>
        <div className="sidebar-user-role">{user?.role}</div>
        <button type="button" className="sidebar-logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;