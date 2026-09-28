import { useState } from 'react';
import { toHash, navigate } from '../../app/router';
import { deleteFiles, storeFile, useFileUrl } from '../../data/files';
import { setActiveHorse, useHorse } from '../../data/hooks';
import { create, update, ValidationError } from '../../data/repo';
import { DISCIPLINE_LABELS, HORSE_STATUS_LABELS, LEVEL_LABELS, SEX_LABELS, options } from '../../domain/labels';
import type { Discipline, Horse, Level, Sex } from '../../domain/models';
import { ConfirmButton, FilePicker, PageHeader, SelectField, TextArea, TextField, toast, toastError } from '../../design/components';
import { deleteHorse } from '../../services/actions';
import { SaveBar, toInt } from '../shared';

export interface HorseDraft {
  name: string;
  photoFileId?: string;
  sex?: Sex;
  birthYear: string;
  breed: string;
  color: string;
  heightCm: string;
  discipline?: Discipline;
  level?: Level;
  location: string;
  ueln: string;
  microchip: string;
  status: Horse['status'];
  notes: string;
}

export const emptyHorse = (): HorseDraft => ({ name: '', birthYear: '', breed: '', color: '', heightCm: '', location: '', ueln: '', microchip: '', status: 'active', notes: '' });

export const horseToDraft = (h: Horse): HorseDraft => ({
  ...emptyHorse(),
  ...h,
  birthYear: h.birthYear ? String(h.birthYear) : '',
  heightCm: h.heightCm ? String(h.heightCm) : '',
  breed: h.breed ?? '',
  color: h.color ?? '',
  location: h.location ?? '',
  ueln: h.ueln ?? '',
  microchip: h.microchip ?? '',
  notes: h.notes ?? '',
});

export function draftToHorse(d: HorseDraft) {
  return {
    name: d.name,
    photoFileId: d.photoFileId,
    sex: d.sex,
    birthYear: toInt(d.birthYear),
    breed: d.breed,
    color: d.color,
    heightCm: toInt(d.heightCm),
    discipline: d.discipline,
    level: d.level,
    location: d.location,
    ueln: d.ueln,
    microchip: d.microchip,
    status: d.status,
    notes: d.notes,
  };
}

interface Props {
  value: HorseDraft;
  onChange: (d: HorseDraft) => void;
  errors?: Record<string, string>;
  /** Formulaire court (onboarding) : seulement l'essentiel. */
  compact?: boolean;
}

export function HorseFields({ value: d, onChange, errors = {}, compact }: Props) {
  const set = <K extends keyof HorseDraft>(k: K, v: HorseDraft[K]) => onChange({ ...d, [k]: v });
  const photo = useFileUrl(d.photoFileId, true);
  const year = new Date().getFullYear();

  return (
    <div className="form">
      <div className="row">
        <span className="avatar" style={{ width: 72, height: 72, fontSize: 28 }}>
          {photo ? <img src={photo} alt="Photo du cheval" /> : d.name.charAt(0).toUpperCase() || '?'}
        </span>
        <FilePicker
          label={d.photoFileId ? 'Changer la photo' : 'Ajouter une photo'}
          accept="image/*"
          onFiles={async ([f]) => {
            try {
              const stored = await storeFile(f, f.name);
              onChange({ ...d, photoFileId: stored.id });
            } catch (e) {
              toastError(e);
            }
          }}
        />
      </div>
      <TextField label="Nom" value={d.name} onChange={(e) => set('name', e.target.value)} error={errors.name} autoComplete="off" placeholder="Spirit" hint={compact ? 'Seul champ obligatoire' : undefined} />
      <div className="form-row">
        <SelectField label="Sexe" value={d.sex ?? ''} onChange={(e) => set('sex', (e.target.value || undefined) as Sex)} options={[{ value: '', label: '—' }, ...options(SEX_LABELS)]} />
        <TextField
          label="Année de naissance"
          inputMode="numeric"
          value={d.birthYear}
          placeholder={String(year - 10)}
          error={errors.birthYear}
          onChange={(e) => set('birthYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </div>
      <TextField label="Race" value={d.breed} onChange={(e) => set('breed', e.target.value)} placeholder="Selle Français, PRE, Connemara…" />
      <div className="form-row">
        <SelectField label="Discipline" value={d.discipline ?? ''} onChange={(e) => set('discipline', (e.target.value || undefined) as Discipline)} options={[{ value: '', label: '—' }, ...options(DISCIPLINE_LABELS)]} />
        <SelectField label="Niveau" value={d.level ?? ''} onChange={(e) => set('level', (e.target.value || undefined) as Level)} options={[{ value: '', label: '—' }, ...options(LEVEL_LABELS)]} />
      </div>
      <TextField label="Lieu (écurie, ville)" value={d.location} onChange={(e) => set('location', e.target.value)} placeholder="Écurie des Pins, Chantilly" />
      {!compact && (
        <>
          <div className="form-row">
            <TextField label="Robe" value={d.color} onChange={(e) => set('color', e.target.value)} placeholder="Bai" />
            <TextField label="Taille (cm)" inputMode="numeric" value={d.heightCm} error={errors.heightCm} onChange={(e) => set('heightCm', e.target.value.replace(/\D/g, '').slice(0, 3))} />
          </div>
          <div className="form-row">
            <TextField label="N° UELN / SIRE" value={d.ueln} onChange={(e) => set('ueln', e.target.value)} />
            <TextField label="N° de puce" inputMode="numeric" value={d.microchip} onChange={(e) => set('microchip', e.target.value)} />
          </div>
          <SelectField label="Statut" value={d.status} onChange={(e) => set('status', e.target.value as Horse['status'])} options={options(HORSE_STATUS_LABELS)} />
          <TextArea label="Notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Caractère, particularités, alimentation…" />
        </>
      )}
    </div>
  );
}

/** Associe les erreurs Zod aux champs du formulaire. */
export function fieldErrors(e: unknown): Record<string, string> | undefined {
  if (!(e instanceof ValidationError)) return undefined;
  return Object.fromEntries(e.issues.map((i) => [i.path, i.message]));
}

/** Écran de création / modification d'un cheval. */
export function HorseEditPage({ id }: { id?: string }) {
  const existing = useHorse(id);
  const [draft, setDraft] = useState<HorseDraft>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const d = draft ?? (existing ? horseToDraft(existing) : id ? undefined : emptyHorse());
  if (!d) return null;

  const save = async () => {
    setSaving(true);
    try {
      if (existing && existing.photoFileId && existing.photoFileId !== d.photoFileId) await deleteFiles([existing.photoFileId]);
      const h = existing ? await update('horses', existing.id, draftToHorse(d)) : await create('horses', draftToHorse(d));
      if (!existing) await setActiveHorse(h.id);
      toast(existing ? 'Fiche mise à jour' : `${h.name} a été ajouté`);
      navigate('horse', h.id);
    } catch (e) {
      const fe = fieldErrors(e);
      if (fe) setErrors(fe);
      else toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={existing ? `Modifier ${existing.name}` : 'Nouveau cheval'} backHref={existing ? toHash('horse', existing.id) : toHash('horse')} />
      <HorseFields value={d} onChange={setDraft} errors={errors} />
      {existing && (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <ConfirmButton
            confirmLabel={`Supprimer ${existing.name} et tout son dossier ?`}
            onConfirm={async () => {
              await deleteHorse(existing);
              toast(`${existing.name} a été supprimé`);
              navigate('horse');
            }}
          >
            Supprimer ce cheval
          </ConfirmButton>
        </div>
      )}
      <SaveBar onSave={save} saving={saving} />
    </>
  );
}
