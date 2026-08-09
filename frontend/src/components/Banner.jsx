// src/components/Banner.jsx
import { Info } from 'lucide-react';

function Banner({ children, tag }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--accent-dim)',
        border: '1px solid var(--accent)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        color: 'var(--text)',
      }}
    >
      <Info size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{children}</span>
      {tag && (
        <span
          className="mono"
          style={{
            fontSize: 11,
            background: 'var(--accent)',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: 999,
          }}
        >
          {tag}
        </span>
      )}
    </div>
  );
}

export default Banner;
