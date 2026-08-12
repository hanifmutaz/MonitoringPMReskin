// src/components/Pagination.jsx
// Reskin: props (page, limit, total, onPageChange) & logic PERSIS sama,
// markup lama (div+button inline style) diganti Tailwind murni.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

function Pagination({ page, limit, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
    pages.push(p);
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      <span className="font-[var(--font-mono)] text-xs text-[var(--text-faint)]">
        Menampilkan {start}–{end} dari {total} entri
      </span>
      <div className="flex gap-1">
        <PageButton disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={14} />
        </PageButton>
        {pages.map((p) => (
          <PageButton key={p} active={p === page} onClick={() => onPageChange(p)}>
            {p}
          </PageButton>
        ))}
        <PageButton disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={14} />
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
      className={cn(
        'flex h-[26px] w-[26px] items-center justify-center rounded-md border font-[var(--font-mono)] text-xs transition-colors',
        // Cursor dipisah dari logic warna/border di bawah (bukan digabung
        // jadi 1 string kayak sebelumnya) - biar cursor-pointer &
        // cursor-not-allowed gak PERNAH ke-attach bareng ke elemen yang
        // sama. Kalau digabung, dua utility class cursor itu punya
        // specificity SAMA (sama-sama 1 class selector), jadi yang menang
        // gantung urutan Tailwind nge-generate CSS-nya - bukan urutan di
        // source, gampang salah tanpa kelihatan.
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        active
          ? 'border-primary bg-[var(--accent-dim)] text-primary'
          : disabled
            ? 'border-border text-[var(--text-faint)]'
            : 'border-border text-[var(--text-dim)] hover:bg-secondary'
      )}
    >
      {children}
    </button>
  );
}

export default Pagination;