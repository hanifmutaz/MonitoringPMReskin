// src/components/SearchBar.jsx
import { Search } from 'lucide-react';

function SearchBar({ value, onChange, placeholder = 'Cari...' }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 220,
      }}
    >
      <Search size={14} color="var(--text-faint)" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, width: '100%' }}
      />
    </div>
  );
}

export default SearchBar;
