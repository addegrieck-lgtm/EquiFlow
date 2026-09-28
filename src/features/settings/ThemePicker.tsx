import { setThemePreference, useThemePreference, type ThemePreference } from '../../design/theme';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

export function ThemePicker() {
  const pref = useThemePreference();
  return (
    <div className="segmented" role="group" aria-label="Apparence">
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" aria-pressed={pref === o.value} onClick={() => setThemePreference(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
