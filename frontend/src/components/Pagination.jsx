// src/components/Pagination.jsx
function Pagination({ page, limit, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
    pages.push(p);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
      <span className="caption">
        Menampilkan {start}–{end} dari {total} entri
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <PageButton disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          &lsaquo;
        </PageButton>
        {pages.map((p) => (
          <PageButton key={p} active={p === page} onClick={() => onPageChange(p)}>
            {p}
          </PageButton>
        ))}
        <PageButton disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          &rsaquo;
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({ children, active, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="mono"
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? 'var(--accent)' : disabled ? 'var(--text-faint)' : 'var(--text-dim)',
        fontSize: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export default Pagination;
