/** Éléments d'interface partagés entre les modules. */
import type { ReactNode } from 'react';
import { useFileUrl } from '../data/files';
import { TRADE_LABELS } from '../domain/labels';
import type { Horse, Professional, Trade } from '../domain/models';
import { Button, SelectField, TextField } from '../design/components';

export function HorseAvatar({ horse, size = 48 }: { horse: Pick<Horse, 'name' | 'photoFileId'>; size?: number }) {
  const url = useFileUrl(horse.photoFileId, true);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {url ? <img src={url} alt="" /> : horse.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function HorseSelect({ horses, value, onChange, allowNone, label = 'Cheval' }: { horses: Horse[]; value?: string; onChange: (id?: string) => void; allowNone?: boolean; label?: string }) {
  return (
    <SelectField
      label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      options={[...(allowNone ? [{ value: '', label: 'Aucun / tous' }] : []), ...horses.map((h) => ({ value: h.id, label: h.name }))]}
    />
  );
}

export function ProSelect({ pros, value, onChange, trade }: { pros: Professional[]; value?: string; onChange: (id?: string) => void; trade?: Trade }) {
  // Les pros du métier concerné d'abord, puis les autres.
  const sorted = [...pros].sort((a, b) => Number(b.trade === trade) - Number(a.trade === trade));
  return (
    <SelectField
      label="Professionnel"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      options={[{ value: '', label: pros.length ? 'Non renseigné' : 'Aucun dans votre carnet' }, ...sorted.map((p) => ({ value: p.id, label: `${p.name} · ${TRADE_LABELS[p.trade]}` }))]}
    />
  );
}

export function DateField({ label, value, onChange, hint, required }: { label: string; value?: string; onChange: (v?: string) => void; hint?: ReactNode; required?: boolean }) {
  return <TextField label={label} type="date" value={value ?? ''} required={required} hint={hint} onChange={(e) => onChange(e.target.value || undefined)} />;
}

export function MoneyField({ label = 'Montant (€)', value, onChange, error, hint }: { label?: string; value: string; onChange: (v: string) => void; error?: string; hint?: ReactNode }) {
  return <TextField label={label} inputMode="decimal" placeholder="0,00" value={value} error={error} hint={hint} onChange={(e) => onChange(e.target.value)} />;
}

/** Barre d'enregistrement collée en bas de l'écran pendant la saisie. */
export function SaveBar({ onSave, saving, label = 'Enregistrer', disabled }: { onSave: () => void; saving?: boolean; label?: string; disabled?: boolean }) {
  return (
    <div className="sticky-actions">
      <Button size="lg" block icon="check" onClick={onSave} disabled={saving || disabled}>
        {saving ? 'Enregistrement…' : label}
      </Button>
    </div>
  );
}

/** Cents → texte éditable (« 85,50 »). */
export const centsToInput = (c?: number) => (c ? (c / 100).toFixed(2).replace('.', ',').replace(/,00$/, '') : '');

/** Chaîne numérique → nombre entier (ou undefined). */
export const toInt = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? undefined : Math.round(Number(s)));
