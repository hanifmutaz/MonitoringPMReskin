// src/components/SearchBar.jsx
// Reskin: props (value, onChange, placeholder) & behavior PERSIS sama,
// markup lama (div+input inline style) diganti Input shadcn (ui/input.jsx)
// biar konsisten sama form field lain yang udah direskin (LoginPage dst).
import { Search } from 'lucide-react';
import { Input } from './ui/input';

function SearchBar({ value, onChange, placeholder = 'Cari...' }) {
  return (
    <div className="relative min-w-[220px]">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9"
      />
    </div>
  );
}

export default SearchBar;
