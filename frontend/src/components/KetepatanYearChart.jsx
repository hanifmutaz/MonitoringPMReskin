// src/components/KetepatanYearChart.jsx
//
// Chart Ketepatan PM per bulan (Jan-Des tahun terpilih), 3 seri: PM Part, PM Monthly, PM Weekly.
// SVG manual (repo tidak punya library chart; donut Ringkasan Status Line juga SVG manual).
//
// Aturan data-viz yang diikuti:
//  - Bulan tanpa event / bulan yang belum terjadi = BOLONG di garis (bukan 0%).
//  - Sumbu Y selalu berakhir di 100% (target, digaris putus), batas bawah menyesuaikan data (niceDomain).
//  - Warna seri = token --chart-1..3 (kategorikal, divalidasi, BUKAN warna status ok/warn/danger).
//    Aqua di tema terang kontrasnya < 3:1, jadi identitas seri tidak cuma di warna: legend selalu ada,
//    label langsung di ujung garis, bentuk marker beda per seri, dan ada tampilan tabel.
//  - Garis 2px, marker >= 8px dengan ring 2px warna permukaan, grid/axis recessive.
//  - Hover: crosshair + tooltip per bulan; area hover lebih lebar dari marker; panah kiri/kanan di keyboard.
import { useId, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { CHART_SERIES, buildChartSeries, niceDomain, linePath, spreadLabels, formatPct, monthLabel } from '../utils/ketepatanDashboard';

const W = 780;
const H = 300;
const M = { top: 16, right: 112, bottom: 32, left: 46 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const SERIES_COLOR = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];
const MARKER_R = 4.5; // diameter 9px >= 8px
// Dodge horizontal per seri (garis + marker digeser bersama): ketepatan sering 100% di ketiga seri sekaligus,
// tanpa dodge ketiganya menumpuk jadi satu garis dan tidak terlihat seri mana yang punya data di bulan itu.
const DODGE = 10; // > diameter marker (9px) supaya marker tetangga tidak saling menutup
const dodgeOf = (seriesIndex) => (seriesIndex - 1) * DODGE;

function Marker({ shape, x, y, color, r = MARKER_R }) {
  const common = { fill: color, stroke: 'var(--panel)', strokeWidth: 2 };
  if (shape === 'square') return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={1.5} {...common} />;
  if (shape === 'diamond') {
    const d = r * 1.3;
    return <polygon points={`${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`} {...common} />;
  }
  return <circle cx={x} cy={y} r={r} {...common} />;
}

function LegendItem({ shape, color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <Marker shape={shape} x={6} y={6} color={color} r={3.6} />
      </svg>
      {label}
    </span>
  );
}

function cellText(c) {
  if (!c || !c.total) return '—';
  return `${formatPct(c.percentage)} (${c.total} event)`;
}

function YearTable({ byMonth, selectedMonth }) {
  return (
    <div className="overflow-x-auto" tabIndex="0" role="region" aria-label="Tabel ketepatan PM per bulan (scroll horizontal)">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {['Bulan', 'PM Part', 'PM Monthly', 'PM Weekly'].map((h) => (
              <th key={h} scope="col" className="border-b border-border px-2.5 py-2 text-left font-[var(--font-mono)] text-[11px] uppercase tracking-[0.5px] text-[var(--text-faint)]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {byMonth.map((row) => (
            <tr key={row.month} className={row.month === selectedMonth ? 'bg-[var(--panel-2)]' : ''}>
              <td className="border-b border-[var(--border-soft)] px-2.5 py-2 font-[var(--font-mono)] text-[13px]">
                {monthLabel(row.month, 'short')}
                {row.future && <span className="ml-1.5 text-[11px] text-[var(--text-faint)]">(di luar periode)</span>}
              </td>
              {CHART_SERIES.map((s) => (
                <td key={s.key} className="border-b border-[var(--border-soft)] px-2.5 py-2 text-[13px] tabular-nums">
                  {row.future ? '—' : cellText(row[s.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KetepatanYearChart({ byMonth, selectedMonth }) {
  const uid = useId();
  const [view, setView] = useState('chart');
  const [hover, setHover] = useState(null);

  const series = useMemo(() => buildChartSeries(byMonth), [byMonth]);
  const domain = useMemo(() => niceDomain(series.flatMap((s) => s.values)), [series]);

  const count = byMonth.length;
  const step = PLOT_W / count;
  const xOf = (i) => M.left + (i + 0.5) * step;
  const yOf = (v) => M.top + (1 - (v - domain.min) / (domain.max - domain.min)) * PLOT_H;

  // Label langsung di ujung kanan: posisi Y = nilai terakhir tiap seri, disebar supaya tidak bertumpuk.
  const lastPoints = series.map((s) => {
    let idx = -1;
    s.values.forEach((v, i) => { if (v !== null) idx = i; });
    return idx === -1 ? null : { idx, value: s.values[idx] };
  });
  const labelYs = spreadLabels(lastPoints.map((p) => (p ? yOf(p.value) : null)), 15, M.top + 4, M.top + PLOT_H - 4);

  const hasAnyData = series.some((s) => s.values.some((v) => v !== null));
  const selectedIndex = byMonth.findIndex((r) => r.month === selectedMonth);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setHover((h) => (h === null ? 0 : Math.min(count - 1, h + 1))); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setHover((h) => (h === null ? count - 1 : Math.max(0, h - 1))); }
    else if (e.key === 'Escape') setHover(null);
  };

  const hovered = hover !== null ? byMonth[hover] : null;
  const tooltipLeftPct = hover !== null ? (xOf(hover) / W) * 100 : 0;
  const flipTooltip = hover !== null && hover > count / 2;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Legend">
          {CHART_SERIES.map((s, i) => <LegendItem key={s.key} shape={s.marker} color={SERIES_COLOR[i]} label={s.label} />)}
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true"><line x1="0" y1="4" x2="16" y2="4" stroke="var(--text-faint)" strokeWidth="1.5" strokeDasharray="3 3" /></svg>
            Target 100%
          </span>
        </div>
        <Tabs value={view} onValueChange={setView}>
          <TabsList aria-label="Tampilan chart">
            <TabsTrigger value="chart">Grafik</TabsTrigger>
            <TabsTrigger value="table">Tabel</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === 'table' ? (
        <YearTable byMonth={byMonth} selectedMonth={selectedMonth} />
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full select-none text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="group"
            aria-labelledby={`${uid}-t`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onBlur={() => setHover(null)}
            onMouseLeave={() => setHover(null)}
          >
            <title id={`${uid}-t`}>
              Ketepatan PM per bulan. Gunakan panah kiri dan kanan untuk membaca tiap bulan, atau buka tampilan Tabel.
            </title>

            {/* Bulan terpilih di-highlight tipis */}
            {selectedIndex >= 0 && (
              <rect x={M.left + selectedIndex * step} y={M.top} width={step} height={PLOT_H} fill="var(--panel-2)" />
            )}

            {/* Grid + label sumbu Y (recessive) */}
            {domain.ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={M.left + PLOT_W} y1={yOf(t)} y2={yOf(t)} stroke="var(--border-soft)" strokeWidth="1" />
                <text x={M.left - 8} y={yOf(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="currentColor" className="tabular-nums">{t}%</text>
              </g>
            ))}

            {/* Target 100% */}
            <line x1={M.left} x2={M.left + PLOT_W} y1={yOf(100)} y2={yOf(100)} stroke="var(--text-faint)" strokeWidth="1.5" strokeDasharray="4 4" />

            {/* Label sumbu X */}
            {byMonth.map((row, i) => (
              <text key={row.month} x={xOf(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="currentColor" opacity={row.future ? 0.45 : 1} fontWeight={row.month === selectedMonth ? 700 : 400}>
                {monthLabel(row.month, 'name')}
              </text>
            ))}

            {!hasAnyData && (
              <text x={M.left + PLOT_W / 2} y={M.top + PLOT_H / 2} textAnchor="middle" fontSize="13" fill="currentColor">Belum ada event PM di periode ini</text>
            )}

            {/* Crosshair */}
            {hover !== null && <line x1={xOf(hover)} x2={xOf(hover)} y1={M.top} y2={M.top + PLOT_H} stroke="var(--text-faint)" strokeWidth="1" />}

            {/* Garis (2px) lalu marker */}
            {series.map((s, si) => (
              <path key={s.key} d={linePath(s.values, (i) => xOf(i) + dodgeOf(si), yOf)} fill="none" stroke={SERIES_COLOR[si]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {series.map((s, si) => s.values.map((v, i) => (v === null ? null : (
              <Marker key={`${s.key}-${i}`} shape={s.marker} x={xOf(i) + dodgeOf(si)} y={yOf(v)} color={SERIES_COLOR[si]} />
            ))))}

            {/* Label langsung di ujung kanan (teks pakai warna teks, bukan warna seri) */}
            {series.map((s, si) => (labelYs[si] === null ? null : (
              <g key={`lbl-${s.key}`}>
                <Marker shape={s.marker} x={M.left + PLOT_W + 14} y={labelYs[si]} color={SERIES_COLOR[si]} r={3.6} />
                <text x={M.left + PLOT_W + 24} y={labelYs[si]} dominantBaseline="middle" fontSize="11" fill="var(--text)">
                  {s.label.replace('PM ', '')} {formatPct(lastPoints[si].value)}
                </text>
              </g>
            )))}

            {/* Area hover per bulan (lebih lebar dari marker) */}
            {byMonth.map((row, i) => (
              <rect
                key={`hit-${row.month}`}
                x={M.left + i * step}
                y={M.top}
                width={step}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseMove={() => setHover(i)}
              />
            ))}
          </svg>

          {hovered && (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 w-52 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
              style={{ left: `${tooltipLeftPct}%`, transform: flipTooltip ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}
            >
              <div className="mb-1 font-semibold">{monthLabel(hovered.month)}{hovered.future ? ' (di luar periode)' : ''}</div>
              {CHART_SERIES.map((s, si) => (
                <div key={s.key} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><Marker shape={s.marker} x={5} y={5} color={SERIES_COLOR[si]} r={3} /></svg>
                    {s.label}
                  </span>
                  <span className="tabular-nums">{hovered.future ? '—' : cellText(hovered[s.key])}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default KetepatanYearChart;
