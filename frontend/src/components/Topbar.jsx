// src/components/Topbar.jsx
import { useCurrentPageHeader } from '../contexts/PageHeaderContext';

function Topbar() {
  const { title, actions } = useCurrentPageHeader();
  return (
    <header className="topbar">
      <h1 className="page-title">{title}</h1>
      {actions && <div>{actions}</div>}
    </header>
  );
}

export default Topbar;
