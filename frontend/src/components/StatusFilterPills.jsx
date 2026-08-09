// src/components/StatusFilterPills.jsx
const OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'OK', label: 'OK', color: 'ok' },
  { value: 'WARNING', label: 'Warning', color: 'warn' },
  { value: 'DANGER', label: 'Danger', color: 'danger' },
];

function StatusFilterPills({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value || 'ALL'}
            type="button"
            onClick={() => onChange(opt.value)}
            className="btn"
            style={{
              padding: '6px 14px',
              fontSize: 12,
              background: active ? 'var(--accent-dim)' : 'var(--panel-2)',
              color: active ? 'var(--accent)' : 'var(--text-dim)',
              border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {opt.color && (
              <span
                style={{ width: 6, height: 6, borderRadius: '50%', background: `var(--${opt.color})` }}
              />
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default StatusFilterPills;
