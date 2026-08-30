// src/components/data-display/Pagination.jsx
//
// Relocated from components/Pagination.jsx (docs/frontend/MIGRATION-PLAN.md
// Phase 5) - props (page, limit, total, onPageChange) and calculation logic
// are explicitly documented as unchanged through the earlier Tailwind
// reskin and stay unchanged here too, only the file's location and import
// depth (../lib/utils -> ../../lib/utils) change. components/Pagination.jsx
// now re-exports this file so its 4 existing call sites keep working.
//
// aria-label on Prev/Next (Phase 15, resolves FRONTEND-AUDIT.md's explicit
// `Unknown`: "Icon-only buttons... e.g. pagination chevrons in
// Pagination.jsx - screen-reader labelling is Unknown"). Confirmed absent
// on direct read, now fixed - the two ChevronLeft/ChevronRight buttons had
// no text content and no aria-label at all. Numbered page buttons (`{p}`)
// are untouched - their visible page number IS their accessible name
// already, nothing to fix there.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

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
        <PageButton disabled={page <= 1} onClick={() => onPageChange(page - 1)} label="Halaman sebelumnya">
          <ChevronLeft size={14} />
        </PageButton>
        {pages.map((p) => (
          <PageButton key={p} active={p === page} onClick={() => onPageChange(p)}>
            {p}
          </PageButton>
        ))}
        <PageButton disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} label="Halaman berikutnya">
          <ChevronRight size={14} />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({ children, active, disabled, onClick, label }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
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