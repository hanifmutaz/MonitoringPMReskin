// src/components/PageSizeSelector.jsx
// Reskin: props (value, onChange, options) & behavior PERSIS sama, <select>
// native diganti Select shadcn (ui/select.jsx, Radix - butuh value string,
// dikonversi balik ke Number pas onValueChange sebelum dikirim ke parent).
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const DEFAULT_OPTIONS = [50, 100, 300, 500];

function PageSizeSelector({ value, onChange, options = DEFAULT_OPTIONS }) {
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-xs text-[var(--text-faint)]">Tampilkan</span>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="h-8 w-[76px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={String(opt)}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="whitespace-nowrap text-xs text-[var(--text-faint)]">baris</span>
    </div>
  );
}

export default PageSizeSelector;
