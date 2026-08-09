// src/pages/PlaceholderPage.jsx
import { usePageHeader } from '../contexts/PageHeaderContext';

function PlaceholderPage({ title }) {
  usePageHeader({ title });
  return (
    <div className="panel empty-state">
      Halaman <strong>{title}</strong> akan dibangun di fase berikutnya.
    </div>
  );
}

export default PlaceholderPage;
