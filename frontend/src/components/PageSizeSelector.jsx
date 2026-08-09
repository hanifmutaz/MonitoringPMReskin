// src/components/PageSizeSelector.jsx
const DEFAULT_OPTIONS = [50, 100, 300, 500];

function PageSizeSelector({ value, onChange, options = DEFAULT_OPTIONS }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="caption">Tampilkan</span>
      <select
        className="form-select"
        style={{ width: 'auto' }}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span className="caption">baris</span>
    </div>
  );
}

export default PageSizeSelector;
