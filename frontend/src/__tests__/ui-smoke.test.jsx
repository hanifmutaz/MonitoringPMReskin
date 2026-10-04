// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Combobox from '../components/Combobox.jsx';
import LineCombobox from '../components/LineCombobox.jsx';
import { DateRangeFilter } from '../components/data-display/DateRangeFilter.jsx';
import { useUrlFilters } from '../hooks/useUrlFilters.js';

afterEach(cleanup);
beforeEach(() => { window.HTMLElement.prototype.scrollIntoView = () => {}; window.sessionStorage.clear(); });

const many = Array.from({ length: 1000 }, (_, i) => ({ value: String(i + 1), label: `Part ${i + 1} (SPN-${String(i + 1).padStart(4, '0')})` }));

function Harness({ options = many, allLabel }) {
  const [v, setV] = useState('all');
  return (<><Combobox value={v} onValueChange={setV} options={options} allLabel={allLabel} placeholder="Pilih" aria-label="cb" /><output data-testid="val">{v}</output></>);
}

describe('Combobox', () => {
  test('1000 opsi: hanya 100 dirender + petunjuk; ketik mempersempit & bisa pilih', async () => {
    const user = userEvent.setup();
    render(<Harness allLabel="Semua Item" />);
    await user.click(screen.getByRole('combobox', { name: 'cb' }));
    expect(screen.getAllByRole('option')).toHaveLength(100);
    expect(screen.getByText(/Menampilkan 100 dari 1001/)).toBeTruthy();
    await user.type(screen.getByRole('textbox', { name: 'Cari' }), 'spn0777');
    const opts = screen.getAllByRole('option');
    expect(opts).toHaveLength(1);
    expect(opts[0].textContent).toContain('Part 777');
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('val').textContent).toBe('777');
    expect(screen.getByRole('combobox', { name: 'cb' }).textContent).toContain('Part 777');
  });
  test('item terpilih di luar 100 teratas tetap tampil labelnya', () => {
    function H() { return <Combobox value="900" onValueChange={() => {}} options={many} aria-label="cb" />; }
    render(<H />);
    expect(screen.getByRole('combobox', { name: 'cb' }).textContent).toContain('Part 900');
  });
  test('tidak ketemu -> pesan kosong', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { name: 'cb' }));
    await user.type(screen.getByRole('textbox', { name: 'Cari' }), 'zzzz');
    expect(screen.getByText('Tidak ditemukan')).toBeTruthy();
  });
  test('Esc menutup panel', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('combobox', { name: 'cb' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('LineCombobox (wrapper, kontrak lama)', () => {
  test('lines + allLabel: "line1" menemukan LINE-1', async () => {
    const user = userEvent.setup();
    function H() { const [v, setV] = useState('all'); return <><LineCombobox value={v} onValueChange={setV} lines={[{ id: 1, line_name: 'LINE-1' }, { id: 2, line_name: 'LINE-2' }]} allLabel="Semua Line" aria-label="ln" /><output data-testid="v">{v}</output></>; }
    render(<H />);
    await user.click(screen.getByRole('combobox', { name: 'ln' }));
    await user.type(screen.getByRole('textbox', { name: 'Cari Line' }), 'line1');
    await user.click(screen.getByRole('option'));
    expect(screen.getByTestId('v').textContent).toBe('1');
  });
});

describe('DateRangeFilter', () => {
  function H() { const [r, setR] = useState({ from: '', to: '' }); return <><DateRangeFilter from={r.from} to={r.to} onChange={setR} /><output data-testid="r">{JSON.stringify(r)}</output></>; }
  test('mengisi, tanggal akhir < awal ikut disamakan, tombol hapus mereset', async () => {
    const user = userEvent.setup();
    render(<H />);
    const from = screen.getByLabelText('Tanggal awal'); const to = screen.getByLabelText('Tanggal akhir');
    await user.type(to, '2026-03-10');
    await user.type(from, '2026-03-12');
    expect(JSON.parse(screen.getByTestId('r').textContent)).toEqual({ from: '2026-03-12', to: '2026-03-12' });
    await user.click(screen.getByRole('button', { name: 'Hapus filter tanggal' }));
    expect(JSON.parse(screen.getByTestId('r').textContent)).toEqual({ from: '', to: '' });
  });
});

const DEFAULTS = { q: '', sm: 'all' };
const VALID = { sm: (v) => ['all', 'OK', 'DANGER'].includes(v) };
function Page() {
  const [f, setF, reset] = useUrlFilters({ storageKey: 't', defaults: DEFAULTS, validators: VALID });
  const loc = useLocation();
  return (<><output data-testid="f">{JSON.stringify(f)}</output><output data-testid="url">{loc.search}</output>
    <button onClick={() => setF({ sm: 'DANGER' })}>danger</button><button onClick={() => setF({ q: 'abc' })}>q</button><button onClick={reset}>reset</button></>);
}
describe('useUrlFilters', () => {
  test('menulis ke URL, gabung nilai lain, reset membersihkan URL & storage', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={['/x']}><Page /></MemoryRouter>);
    await user.click(screen.getByText('danger'));
    await user.click(screen.getByText('q'));
    expect(JSON.parse(screen.getByTestId('f').textContent)).toEqual({ q: 'abc', sm: 'DANGER' });
    expect(new URLSearchParams(screen.getByTestId('url').textContent).get('sm')).toBe('DANGER');
    expect(window.sessionStorage.getItem('pm-filters:t')).toContain('DANGER');
    await user.click(screen.getByText('reset'));
    expect(screen.getByTestId('url').textContent).toBe('');
    expect(window.sessionStorage.getItem('pm-filters:t')).toBeNull();
  });
  test('link dengan query dipakai; nilai ngawur jatuh ke default', () => {
    render(<MemoryRouter initialEntries={['/x?sm=DANGER&q=hai']}><Page /></MemoryRouter>);
    expect(JSON.parse(screen.getByTestId('f').textContent)).toEqual({ q: 'hai', sm: 'DANGER' });
    cleanup();
    render(<MemoryRouter initialEntries={['/x?sm=ngawur']}><Page /></MemoryRouter>);
    expect(JSON.parse(screen.getByTestId('f').textContent).sm).toBe('all');
  });
  test('datang tanpa query tapi ada filter tersimpan -> dipulihkan DAN ditulis ke URL (tidak reset saat pindah halaman)', () => {
    window.sessionStorage.setItem('pm-filters:t', JSON.stringify({ sm: 'OK', q: 'line' }));
    render(<MemoryRouter initialEntries={['/x']}><Page /></MemoryRouter>);
    expect(JSON.parse(screen.getByTestId('f').textContent)).toEqual({ q: 'line', sm: 'OK' });
    const p = new URLSearchParams(screen.getByTestId('url').textContent);
    expect(p.get('sm')).toBe('OK'); expect(p.get('q')).toBe('line');
  });
});
