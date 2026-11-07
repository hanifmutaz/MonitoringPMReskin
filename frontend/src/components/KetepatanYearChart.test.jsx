// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KetepatanYearChart from './KetepatanYearChart.jsx';

afterEach(cleanup);

const cell = (percentage, total) => ({ percentage, total, on_time_count: total ? Math.round((total * (percentage ?? 0)) / 100) : 0 });
const EMPTY = cell(null, 0);

// Jan-Des 2026, dilihat dari Maret: Jan-Mar punya data, Apr-Des di luar periode (future).
function makeByMonth({ withData = true } = {}) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = `2026-${String(i + 1).padStart(2, '0')}`;
    const future = i > 2;
    if (!withData || future) return { month, future, part: EMPTY, monthly: EMPTY, weekly: EMPTY };
    return {
      month,
      future,
      part: cell(100, 2),
      // Februari: Monthly tanpa event -> harus jadi bolong di garis
      monthly: i === 1 ? EMPTY : cell(i === 0 ? 100 : 80, 4),
      weekly: cell(95.5, 20),
    };
  });
}

describe('KetepatanYearChart', () => {
  test('legend selalu ada untuk 3 seri + target, dan 3 garis seri tergambar', () => {
    const { container } = render(<KetepatanYearChart byMonth={makeByMonth()} selectedMonth="2026-03" />);
    expect(screen.getAllByText('PM Part').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PM Monthly').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PM Weekly').length).toBeGreaterThan(0);
    expect(screen.getByText('Target 100%')).toBeTruthy();
    const seriesPaths = [...container.querySelectorAll('path')].filter((p) => p.getAttribute('stroke')?.startsWith('var(--chart-'));
    expect(seriesPaths).toHaveLength(3);
  });

  test('bulan tanpa event memutus garis (>= 2 segmen "M") dan bulan di luar periode tidak digambar', () => {
    const { container } = render(<KetepatanYearChart byMonth={makeByMonth()} selectedMonth="2026-03" />);
    const monthly = [...container.querySelectorAll('path')].find((p) => p.getAttribute('stroke') === 'var(--chart-2)');
    expect(monthly.getAttribute('d').match(/M/g)).toHaveLength(2); // Jan | (Feb bolong) | Mar
    const weekly = [...container.querySelectorAll('path')].find((p) => p.getAttribute('stroke') === 'var(--chart-3)');
    expect(weekly.getAttribute('d').match(/M/g)).toHaveLength(1); // Jan-Mar tersambung
    expect(weekly.getAttribute('d').match(/L/g)).toHaveLength(2); // hanya 3 titik: April dst tidak ada
  });

  test('label langsung di ujung garis memuat nilai terakhir tiap seri', () => {
    render(<KetepatanYearChart byMonth={makeByMonth()} selectedMonth="2026-03" />);
    expect(screen.getByText('Weekly 95.5%')).toBeTruthy();
    expect(screen.getByText('Monthly 80%')).toBeTruthy();
    expect(screen.getByText('Part 100%')).toBeTruthy();
  });

  test('tab Tabel menampilkan 12 baris bulan, bulan di luar periode bertanda dan berisi em dash', async () => {
    const user = userEvent.setup();
    render(<KetepatanYearChart byMonth={makeByMonth()} selectedMonth="2026-03" />);
    await user.click(screen.getByRole('tab', { name: 'Tabel' }));
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(13); // header + 12 bulan
    expect(screen.getAllByText('(di luar periode)')).toHaveLength(9); // Apr-Des
    expect(screen.getAllByText('95.5% (20 event)', { selector: 'td' })).toHaveLength(3); // Weekly Jan-Mar
    expect(screen.getAllByText('—', { selector: 'td' }).length).toBeGreaterThanOrEqual(28); // 27 sel future + Monthly Februari
  });

  test('keyboard: panah kanan memunculkan tooltip bulan, Escape menutup', () => {
    const { container } = render(<KetepatanYearChart byMonth={makeByMonth()} selectedMonth="2026-03" />);
    const svg = container.querySelector('svg[role="group"]');
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toContain('Januari 2026');
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(screen.getByRole('status').textContent).toContain('Februari 2026');
    fireEvent.keyDown(svg, { key: 'Escape' });
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('tanpa data sama sekali: tampil pesan kosong, tidak ada garis seri, tidak crash', () => {
    const { container } = render(<KetepatanYearChart byMonth={makeByMonth({ withData: false })} selectedMonth="2026-03" />);
    expect(screen.getByText('Belum ada event PM di periode ini')).toBeTruthy();
    const seriesPaths = [...container.querySelectorAll('path')].filter((p) => p.getAttribute('stroke')?.startsWith('var(--chart-'));
    seriesPaths.forEach((p) => expect(p.getAttribute('d')).toBe(''));
  });
});
