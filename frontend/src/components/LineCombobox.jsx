// src/components/LineCombobox.jsx
// Pilihan Line yang bisa DIKETIK (bukan scroll). Wrapper tipis di atas
// <Combobox> generik; kontrak lama tidak berubah:
//   value (string: id Line atau 'all') + onValueChange(string) + lines[]
import { useMemo } from 'react';
import Combobox from './Combobox';

function LineCombobox({
  lines = [],
  placeholder = 'Pilih Line',
  searchPlaceholder = 'Ketik nama Line...',
  ...rest
}) {
  const options = useMemo(() => lines.map((l) => ({ value: String(l.id), label: l.line_name })), [lines]);
  return (
    <Combobox
      {...rest}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      searchAriaLabel="Cari Line"
      emptyText="Line tidak ditemukan"
    />
  );
}

export default LineCombobox;
