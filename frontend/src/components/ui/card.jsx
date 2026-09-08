// src/components/ui/card.jsx
//
// Generic content container. Domain-agnostic per Component Inventory rules -
// callers supply all content via children, this component knows nothing
// about PM/Inventory/Line. Uses the same --color-card / --color-border
// tokens already exposed to Tailwind in styles/tailwind.css.
//
// Fase 1 polish (A2/D1 - radius standar): rounded-lg -> rounded-xl. Ini
// SUMBER radius buat SEMUA panel di app (Dashboard, Settings, Master Data,
// dst pakai Card ATAU pola markup yang sama). Dinaikin ke rounded-xl biar
// konsisten sama KpiCard/NeedsDataCard yang udah rounded-xl - ngilangin
// kesan "campur generasi" (KPI rounded gede, panel rounded kecil).
//
// Elevation (A3/D2): TETAP no-shadow by default. Aturan yang di-LOCK -
// surface pasif (panel isi, tabel) flat + dipisah pakai border/layering;
// cuma surface "hero" (KpiCard) yang boleh shadow. Card = surface pasif,
// jadi TIDAK dikasih shadow. Caller yang genuinely butuh elevated (Dialog/
// Drawer) tetap bisa nambah shadow lewat className.
import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4.5 text-card-foreground',
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div className={cn('mb-4 flex items-center justify-between', className)} {...props} />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <h2
      className={cn('m-0 font-[var(--font-display)] text-[15px] font-semibold', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}

function CardContent({ className, ...props }) {
  return <div className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return (
    <div className={cn('mt-4 flex items-center', className)} {...props} />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
