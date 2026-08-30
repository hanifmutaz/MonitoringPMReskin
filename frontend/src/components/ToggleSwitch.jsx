// src/components/ToggleSwitch.jsx
//
// aria-label (Phase 15, static a11y review): custom switch already had
// proper role="switch"/aria-checked, but no accessible name at all - a
// screen reader would announce "switch, on/off" with zero context. `label`
// is optional (falls back to undefined -> no aria-label rendered, same as
// before) so this doesn't force every call site to change at once, but
// both real call sites (UserManagementPage's per-row Aktif toggle,
// SettingsPage's per-setting toggles) have been updated to pass one.
function ToggleSwitch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        border: 'none',
        background: checked ? 'var(--accent)' : 'var(--panel-3)',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
        }}
      />
    </button>
  );
}

export default ToggleSwitch;
