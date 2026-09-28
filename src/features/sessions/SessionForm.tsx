import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { navigate, toHash } from '../../app/router';
import { db } from '../../data/db';
import { exercisesFor } from '../../data/exercises';
import { deleteFiles, LARGE_FILE_BYTES, storeFile, useFileUrl, useStoredFile } from '../../data/files';
import { useActiveHorse } from '../../data/hooks';
import { create, update } from '../../data/repo';
import { DISCIPLINE_LABELS, FEELING_LABELS, SESSION_TYPE_LABELS, options } from '../../domain/labels';
import type { Discipline, SessionType, TrainingSession } from '../../domain/models';
import { Chip, ConfirmButton, FilePicker, PageHeader, RatingInput, SelectField, TextArea, TextField, toast, toastError } from '../../design/components';
import { todayIso } from '../../lib/dates';
import { formatBytes } from '../../lib/format';
import { deleteSession } from '../../services/actions';
import { DateField, HorseSelect, SaveBar, toInt } from '../shared';
import { fieldErrors } from '../horse/HorseForm';


interface Draft {
  horseId?: string;
  date?: string;
  durationMin: string;
  discipline: Discipline;
  sessionType: SessionType;
  walk: string;
  trot: string;
  canter: string;
  distanceKm: string;
  exercises: string[];
  difficulty?: number;
  horseFeeling?: number;
  riderFeeling?: number;
  notes: string;
  fileIds: string[];
}

function fromSession(s: TrainingSession, keepDateAndMedia: boolean): Draft {
  return {
    horseId: s.horseId,
    date: keepDateAndMedia ? s.date : todayIso(),
    durationMin: String(s.durationMin),
    discipline: s.discipline,
    sessionType: s.sessionType,
    walk: String(s.gaits.walk || ''),
    trot: String(s.gaits.trot || ''),
    canter: String(s.gaits.canter || ''),
    distanceKm: s.distanceKm ? String(s.distanceKm).replace('.', ',') : '',
    exercises: s.exercises,
    difficulty: s.difficulty,
    horseFeeling: keepDateAndMedia ? s.horseFeeling : undefined,
    riderFeeling: keepDateAndMedia ? s.riderFeeling : undefined,
    notes: keepDateAndMedia ? (s.notes ?? '') : '',
    fileIds: keepDateAndMedia ? s.fileIds : [],
  };
}

/** Résultat du chronomètre transmis dans l'URL : #/sessions/new?live=durée,pas,trot,galop&horse=id */
export function liveResultHash(horseId: string | undefined, r: { durationMin: number; gaits: { walk: number; trot: number; canter: number } }): string {
  const q = new URLSearchParams({ live: [r.durationMin, r.gaits.walk, r.gaits.trot, r.gaits.canter].join(',') });
  if (horseId) q.set('horse', horseId);
  return `#/sessions/new?${q}`;
}

function readLiveResult(): Partial<Draft> | undefined {
  const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const live = q.get('live')?.split(',').map((n) => String(Number(n) || ''));
  if (!live || live.length !== 4) return undefined;
  const [durationMin, walk, trot, canter] = live;
  return { durationMin, walk, trot, canter, ...(q.get('horse') ? { horseId: q.get('horse')! } : {}) };
}

export function SessionEditPage({ id, repeatLast }: { id?: string; repeatLast?: boolean }) {
  const { horse, horses } = useActiveHorse();
  const existing = useLiveQuery(() => (id ? db.sessions.get(id) : undefined), [id]);
  const last = useLiveQuery(async () => (repeatLast ? (await db.sessions.orderBy('date').reverse().filter((s) => !horse || s.horseId === horse.id).first()) ?? null : null), [repeatLast, horse?.id]);
  const [state, setState] = useState<Draft>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState('');

  if ((id && existing === undefined) || (repeatLast && last === undefined)) return null;

  const live = !id && !repeatLast ? readLiveResult() : undefined;
  const base: Draft = existing
    ? fromSession(existing, true)
    : last
      ? fromSession(last, false)
      : {
          horseId: horse?.id,
          date: todayIso(),
          durationMin: '45',
          discipline: horse?.discipline ?? 'jumping',
          sessionType: 'flatwork',
          walk: '',
          trot: '',
          canter: '',
          distanceKm: '',
          exercises: [],
          notes: '',
          fileIds: [],
          ...live,
        };
  const d = state ?? base;
  const set = (p: Partial<Draft>) => setState({ ...d, ...p });
  const gaitSum = (toInt(d.walk) ?? 0) + (toInt(d.trot) ?? 0) + (toInt(d.canter) ?? 0);
  const library = exercisesFor(d.discipline);
  const allExercises = [...new Set([...library, ...d.exercises])];

  const save = async () => {
    if (!d.horseId) return setErrors({ horseId: 'Choisissez un cheval' });
    setSaving(true);
    try {
      const data = {
        horseId: d.horseId,
        date: d.date ?? todayIso(),
        durationMin: toInt(d.durationMin) ?? 0,
        discipline: d.discipline,
        sessionType: d.sessionType,
        gaits: { walk: toInt(d.walk) ?? 0, trot: toInt(d.trot) ?? 0, canter: toInt(d.canter) ?? 0 },
        distanceKm: d.distanceKm ? Number(d.distanceKm.replace(',', '.')) : undefined,
        exercises: d.exercises,
        difficulty: d.difficulty,
        horseFeeling: d.horseFeeling,
        riderFeeling: d.riderFeeling,
        notes: d.notes,
        fileIds: d.fileIds,
      };
      if (existing) {
        await update('sessions', existing.id, data);
        await deleteFiles(existing.fileIds.filter((fid) => !d.fileIds.includes(fid)));
      }
      else await create('sessions', data);
      toast(existing ? 'Séance mise à jour' : 'Séance enregistrée');
      navigate('sessions');
    } catch (e) {
      const fe = fieldErrors(e);
      if (fe) setErrors(fe);
      else toastError(e);
    } finally {
      setSaving(false);
    }
  };

  const addMedia = async (files: File[]) => {
    try {
      const ids: string[] = [];
      for (const f of files) {
        if (f.size > LARGE_FILE_BYTES) toast(`${f.name} fait ${formatBytes(f.size)} : les vidéos occupent beaucoup de place sur le téléphone.`);
        ids.push((await storeFile(f, f.name)).id);
      }
      set({ fileIds: [...d.fileIds, ...ids] });
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <>
      <PageHeader title={existing ? 'Séance' : repeatLast ? 'Refaire la séance' : 'Nouvelle séance'} backHref={toHash('sessions')} />
      <div className="form">
        {horses.length > 1 && <HorseSelect horses={horses} value={d.horseId} onChange={(v) => set({ horseId: v })} />}
        {errors.horseId && <span className="field__error">{errors.horseId}</span>}
        <div className="form-row">
          <DateField label="Date" value={d.date} onChange={(v) => set({ date: v })} />
          <TextField label="Durée (min)" inputMode="numeric" value={d.durationMin} error={errors.durationMin} onChange={(e) => set({ durationMin: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
        </div>
        <div className="form-row">
          <SelectField label="Discipline" value={d.discipline} onChange={(e) => set({ discipline: e.target.value as Discipline })} options={options(DISCIPLINE_LABELS)} />
          <SelectField label="Type de séance" value={d.sessionType} onChange={(e) => set({ sessionType: e.target.value as SessionType })} options={options(SESSION_TYPE_LABELS)} />
        </div>

        <fieldset className="form" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field__label" style={{ marginBottom: 6 }}>Temps par allure (min)</legend>
          <div className="gait-grid">
            <TextField label="Pas" inputMode="numeric" value={d.walk} onChange={(e) => set({ walk: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
            <TextField label="Trot" inputMode="numeric" value={d.trot} onChange={(e) => set({ trot: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
            <TextField label="Galop" inputMode="numeric" value={d.canter} onChange={(e) => set({ canter: e.target.value.replace(/\D/g, '').slice(0, 3) })} />
          </div>
          {gaitSum > 0 && toInt(d.durationMin) !== gaitSum && (
            <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => set({ durationMin: String(gaitSum) })}>
              Total des allures : {gaitSum} min — l’utiliser comme durée
            </button>
          )}
        </fieldset>

        <TextField label="Distance (km, facultatif)" inputMode="decimal" value={d.distanceKm} onChange={(e) => set({ distanceKm: e.target.value.replace(/[^\d,.]/g, '') })} />

        <div className="field">
          <span className="field__label">Exercices</span>
          <div className="chips">
            {allExercises.map((ex) => (
              <Chip key={ex} selected={d.exercises.includes(ex)} onToggle={() => set({ exercises: d.exercises.includes(ex) ? d.exercises.filter((x) => x !== ex) : [...d.exercises, ex] })}>
                {ex}
              </Chip>
            ))}
          </div>
          <div className="row">
            <input className="field__control" style={{ flex: 1 }} placeholder="Autre exercice" value={custom} aria-label="Ajouter un exercice" onChange={(e) => setCustom(e.target.value)} />
            <button
              type="button"
              className="btn btn--secondary btn--md"
              disabled={!custom.trim()}
              onClick={() => {
                set({ exercises: [...d.exercises, custom.trim().slice(0, 80)] });
                setCustom('');
              }}
            >
              Ajouter
            </button>
          </div>
        </div>

        <RatingInput label="Difficulté" value={d.difficulty} onChange={(v) => set({ difficulty: v })} labels={['', 'Très facile', 'Facile', 'Moyenne', 'Difficile', 'Très difficile']} />
        <RatingInput label="Ressenti du cheval" value={d.horseFeeling} onChange={(v) => set({ horseFeeling: v })} labels={FEELING_LABELS} />
        <RatingInput label="Mon ressenti" value={d.riderFeeling} onChange={(v) => set({ riderFeeling: v })} labels={FEELING_LABELS} />
        <TextArea label="Commentaires" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Ce qui a bien marché, ce qu’il faut retravailler…" />

        <div className="field">
          <span className="field__label">Photos et vidéos</span>
          {d.fileIds.length > 0 && (
            <div className="photo-strip">
              {d.fileIds.map((fid) => (
                <Media key={fid} id={fid} onRemove={() => set({ fileIds: d.fileIds.filter((x) => x !== fid) })} />
              ))}
            </div>
          )}
          <FilePicker label="Ajouter photo / vidéo" icon="camera" accept="image/*,video/*" multiple onFiles={addMedia} />
          <span className="field__hint">Stockées sur votre téléphone. L’analyse vidéo assistée par IA arrivera en V2.</span>
        </div>

        {existing && (
          <ConfirmButton
            onConfirm={async () => {
              await deleteSession(existing);
              toast('Séance supprimée');
              navigate('sessions');
            }}
          >
            Supprimer la séance
          </ConfirmButton>
        )}
      </div>
      <SaveBar onSave={save} saving={saving} />
    </>
  );
}

function Media({ id, onRemove }: { id: string; onRemove: () => void }) {
  const file = useStoredFile(id);
  const url = useFileUrl(id, file?.mime.startsWith('image/'));
  if (!file || !url) return null;
  return (
    <span style={{ position: 'relative', flex: 'none' }}>
      {file.mime.startsWith('video/') ? <video src={url} controls playsInline preload="metadata" /> : <img src={url} alt={file.name} />}
      <button type="button" className="icon-btn" aria-label="Retirer" onClick={onRemove} style={{ position: 'absolute', top: -6, right: -6, width: 32, height: 32, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        ×
      </button>
    </span>
  );
}
