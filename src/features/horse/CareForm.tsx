import { useState } from 'react';
import { navigate, toHash } from '../../app/router';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../data/db';
import { storeFile } from '../../data/files';
import { useHorse, useProfessionals, useReminderRules } from '../../data/hooks';
import { create } from '../../data/repo';
import { CARE_LABELS, CARE_TRADE, options } from '../../domain/labels';
import { CARE_TYPES, type CareDetails, type CareType } from '../../domain/models';
import { Card, ConfirmButton, FilePicker, ListRow, PageHeader, SelectField, TextArea, TextField, toast, toastError } from '../../design/components';
import { addDays, formatDate, todayIso } from '../../lib/dates';
import { parseMoney } from '../../lib/format';
import { deleteCare, saveCare } from '../../services/actions';
import { ruleFor } from '../../services/reminders';
import { centsToInput, DateField, MoneyField, ProSelect, SaveBar } from '../shared';
import { fieldErrors } from './HorseForm';

interface Props {
  horseId: string;
  recordId?: string;
  initialType?: CareType;
}

export function CareEditPage({ horseId, recordId, initialType }: Props) {
  const horse = useHorse(horseId);
  const pros = useProfessionals() ?? [];
  const rules = useReminderRules() ?? [];
  const loaded = useLiveQuery(async () => {
    if (!recordId) return { record: undefined, expense: undefined, docs: [] };
    const record = await db.careRecords.get(recordId);
    return {
      record,
      expense: record?.expenseId ? await db.expenses.get(record.expenseId) : undefined,
      docs: record ? await db.documents.bulkGet(record.documentIds) : [],
    };
  }, [recordId]);

  const [state, setState] = useState<{
    type: CareType;
    date?: string;
    title: string;
    professionalId?: string;
    amount: string;
    details: CareDetails;
    nextDueAt?: string;
    notes: string;
    documentIds: string[];
  }>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  if (!loaded || horse === undefined) return null;
  const rec = loaded.record;
  const s = state ?? {
    type: rec?.type ?? (initialType && (CARE_TYPES as readonly string[]).includes(initialType) ? initialType : 'vet_visit'),
    date: rec?.date ?? todayIso(),
    title: rec?.title ?? '',
    professionalId: rec?.professionalId,
    amount: centsToInput(loaded.expense?.amountCents),
    details: rec?.details ?? {},
    nextDueAt: rec?.nextDueAt,
    notes: rec?.notes ?? '',
    documentIds: rec?.documentIds ?? [],
  };
  const set = (patch: Partial<typeof s>) => setState({ ...s, ...patch });
  const setDetail = (k: keyof CareDetails, v: string) => set({ details: { ...s.details, [k]: v || undefined } });

  const rule = ruleFor(horseId, s.type, rules);
  const autoNext = rule && s.date ? addDays(s.date, rule.intervalDays) : undefined;
  const t = s.type;

  const save = async () => {
    const amountCents = s.amount.trim() ? parseMoney(s.amount) : undefined;
    if (s.amount.trim() && !amountCents) return setErrors({ amount: 'Montant invalide (ex. 85 ou 85,50)' });
    if (!s.date) return setErrors({ date: 'Date requise' });
    setSaving(true);
    try {
      const details = Object.fromEntries(Object.entries(s.details).filter(([, v]) => v)) as CareDetails;
      await saveCare(
        {
          record: { horseId, type: s.type, date: s.date, title: s.title, professionalId: s.professionalId, details, nextDueAt: s.nextDueAt, notes: s.notes, documentIds: s.documentIds },
          amountCents,
        },
        rec?.id,
      );
      toast(rec ? 'Soin mis à jour' : `Soin enregistré : ${CARE_LABELS[s.type].toLowerCase()}`);
      navigate('horse', horseId, ['vaccination', 'deworming', 'treatment', 'vet_visit'].includes(s.type) ? 'health' : 'care');
    } catch (e) {
      const fe = fieldErrors(e);
      if (fe) setErrors(fe);
      else toastError(e);
    } finally {
      setSaving(false);
    }
  };

  const attach = async (files: File[]) => {
    try {
      const ids: string[] = [];
      for (const f of files) {
        const stored = await storeFile(f, f.name);
        const doc = await create('documents', {
          horseId,
          fileId: stored.id,
          category: f.type === 'application/pdf' || /facture/i.test(f.name) ? 'invoice' : 'other',
          title: `${CARE_LABELS[s.type]} — ${s.date ? formatDate(s.date) : ''}`,
          date: s.date,
        });
        ids.push(doc.id);
      }
      set({ documentIds: [...s.documentIds, ...ids] });
      toast(files.length > 1 ? `${files.length} documents ajoutés` : 'Document ajouté');
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <>
      <PageHeader title={rec ? CARE_LABELS[rec.type] : 'Nouveau soin'} eyebrow={horse?.name} backHref={toHash('horse', horseId, 'health')} />
      <div className="form">
        <SelectField label="Type" value={s.type} onChange={(e) => set({ type: e.target.value as CareType })} options={options(CARE_LABELS)} />
        <DateField label="Date" value={s.date} onChange={(v) => set({ date: v })} required />
        {errors.date && <span className="field__error">{errors.date}</span>}
        <ProSelect pros={pros} value={s.professionalId} trade={CARE_TRADE[s.type]} onChange={(v) => set({ professionalId: v })} />
        {pros.length === 0 && (
          <a className="link-btn" href={toHash('more', 'pros', 'new')}>
            + Ajouter un professionnel à mon carnet
          </a>
        )}

        {(t === 'vaccination' || t === 'deworming' || t === 'treatment') && (
          <TextField
            label={t === 'vaccination' ? 'Vaccin' : t === 'deworming' ? 'Vermifuge (produit)' : 'Médicament'}
            value={s.details.product ?? ''}
            onChange={(e) => setDetail('product', e.target.value)}
            placeholder={t === 'vaccination' ? 'Grippe + tétanos' : t === 'deworming' ? 'Nom du produit' : ''}
          />
        )}
        {t === 'treatment' && (
          <>
            <div className="form-row">
              <TextField label="Posologie" value={s.details.dosage ?? ''} onChange={(e) => setDetail('dosage', e.target.value)} hint="Telle que prescrite" />
              <TextField label="Fréquence" value={s.details.frequency ?? ''} onChange={(e) => setDetail('frequency', e.target.value)} placeholder="2 fois/jour" />
            </div>
            <DateField label="Fin du traitement" value={s.details.endDate} onChange={(v) => setDetail('endDate', v ?? '')} />
          </>
        )}
        {t === 'farrier' && <TextField label="Type de ferrure" value={s.details.shoeing ?? ''} onChange={(e) => setDetail('shoeing', e.target.value)} placeholder="Fers antérieurs, parage postérieurs, pieds nus…" />}
        {(t === 'vet_visit' || t === 'osteopath' || t === 'massage' || t === 'other' || t === 'dental') && (
          <TextField label="Motif" value={s.details.reason ?? ''} onChange={(e) => setDetail('reason', e.target.value)} />
        )}
        {t === 'other' && <TextField label="Intitulé" value={s.title} onChange={(e) => set({ title: e.target.value })} />}

        <MoneyField value={s.amount} onChange={(v) => set({ amount: v })} error={errors.amount} hint="Crée automatiquement la dépense correspondante." />

        <DateField
          label="Prochaine échéance"
          value={s.nextDueAt}
          onChange={(v) => set({ nextDueAt: v })}
          hint={autoNext ? `Vide = calcul automatique : ${formatDate(autoNext)} (intervalle de ${rule!.intervalDays} jours)` : 'Facultatif'}
        />
        <TextArea label="Notes" value={s.notes} onChange={(e) => set({ notes: e.target.value })} />

        <Card className="card--flush">
          {loaded.docs.filter(Boolean).map((d) => (
            <ListRow key={d!.id} icon="document" title={d!.title} href={toHash('horse', horseId, 'doc', d!.id)} />
          ))}
          {s.documentIds.length > loaded.docs.length && <ListRow icon="check" title={`${s.documentIds.length - loaded.docs.length} nouveau(x) document(s) joint(s)`} />}
        </Card>
        <FilePicker label="Joindre une facture / ordonnance" icon="document" accept="image/*,application/pdf" multiple onFiles={attach} />

        {rec && (
          <ConfirmButton
            onConfirm={async () => {
              await deleteCare(rec.id);
              toast('Soin supprimé');
              navigate('horse', horseId, 'health');
            }}
          >
            Supprimer ce soin
          </ConfirmButton>
        )}
      </div>
      <SaveBar onSave={save} saving={saving} />
    </>
  );
}
