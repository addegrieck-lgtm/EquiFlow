/**
 * Opérations métier qui touchent plusieurs tables, exécutées dans une transaction
 * (tout ou rien) : un soin avec montant crée aussi sa dépense, un SCAN crée le document,
 * le soin, la dépense et donc la prochaine échéance, etc.
 */
import { CARE_EXPENSE, CARE_LABELS } from '../domain/labels';
import type { CareRecord, CareType, DocumentCategory, Expense, Horse, TrainingSession } from '../domain/models';
import { db } from '../data/db';
import { deleteFiles } from '../data/files';
import { create, remove, update, type Draft } from '../data/repo';
import { todayIso } from '../lib/dates';
import type { PlanItem } from './ai/types';
import type { DueItem } from './reminders';

const allTables = () => [db.careRecords, db.expenses, db.documents, db.files, db.sessions, db.events, db.reminderRules, db.reminderStates, db.horses, db.settings, db.professionals];

export interface CareInput {
  record: Draft<'careRecords'>;
  /** Montant en centimes : crée ou met à jour la dépense liée (supprimée si vidé). */
  amountCents?: number;
}

export async function saveCare({ record, amountCents }: CareInput, id?: string): Promise<CareRecord> {
  return db.transaction('rw', allTables(), async () => {
    const existing = id ? await db.careRecords.get(id) : undefined;
    let expenseId = existing?.expenseId;
    const label = record.title || CARE_LABELS[record.type];
    if (amountCents) {
      const exp = {
        horseId: record.horseId,
        date: record.date,
        amountCents,
        currency: 'EUR',
        category: CARE_EXPENSE[record.type],
        label,
        professionalId: record.professionalId,
        monthly: false,
      };
      if (expenseId && (await db.expenses.get(expenseId))) await update('expenses', expenseId, exp);
      else expenseId = (await create('expenses', exp)).id;
    } else if (expenseId) {
      await remove('expenses', expenseId);
      expenseId = undefined;
    }
    const data = { ...record, expenseId };
    const saved = id ? await update('careRecords', id, data) : await create('careRecords', data);
    if (expenseId) await update('expenses', expenseId, { careRecordId: saved.id });
    return saved;
  });
}

export async function deleteCare(id: string): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    const rec = await db.careRecords.get(id);
    if (rec?.expenseId) await remove('expenses', rec.expenseId);
    await remove('careRecords', id);
  });
}

/** Supprime une dépense ; si elle vient d'un soin, le lien est retiré du soin. */
export async function deleteExpense(e: Expense): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    if (e.careRecordId && (await db.careRecords.get(e.careRecordId))) await update('careRecords', e.careRecordId, { expenseId: undefined });
    await remove('expenses', e.id);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    const doc = await db.documents.get(id);
    if (!doc) return;
    for (const r of await db.careRecords.filter((r) => r.documentIds.includes(id)).toArray()) {
      await update('careRecords', r.id, { documentIds: r.documentIds.filter((d) => d !== id) });
    }
    for (const e of await db.expenses.filter((e) => e.documentId === id).toArray()) await update('expenses', e.id, { documentId: undefined });
    await remove('documents', id);
    await deleteFiles([doc.fileId]);
  });
}

export async function deleteSession(s: TrainingSession): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    await remove('sessions', s.id);
    await deleteFiles(s.fileIds);
  });
}

/** Supprime un cheval et tout son dossier (soins, séances, documents, dépenses, événements). */
export async function deleteHorse(horse: Horse): Promise<void> {
  await db.transaction('rw', allTables(), async () => {
    const docs = await db.documents.where('horseId').equals(horse.id).toArray();
    const sessions = await db.sessions.where('horseId').equals(horse.id).toArray();
    await deleteFiles([horse.photoFileId, ...docs.map((d) => d.fileId), ...sessions.flatMap((s) => s.fileIds)]);
    await db.documents.bulkDelete(docs.map((d) => d.id));
    await db.sessions.bulkDelete(sessions.map((s) => s.id));
    await db.careRecords.where('horseId').equals(horse.id).delete();
    await db.expenses.where('horseId').equals(horse.id).delete();
    await db.events.where('horseId').equals(horse.id).delete();
    await db.reminderRules.where('horseId').equals(horse.id).delete();
    await db.horses.delete(horse.id);
    const active = await db.settings.get('activeHorseId');
    if (active?.value === horse.id) await db.settings.delete('activeHorseId');
  });
}

// --- SCAN ------------------------------------------------------------------------------------

export interface ScanSaveInput {
  fileId: string;
  horseId?: string;
  category: DocumentCategory;
  title: string;
  date?: string;
  ocrText?: string;
  /** Si renseigné, crée aussi l'intervention correspondante (et donc l'échéance suivante). */
  careType?: CareType;
  professionalId?: string;
  amountCents?: number;
  nextDueAt?: string;
  product?: string;
}

export async function saveScan(input: ScanSaveInput): Promise<{ documentId: string; careId?: string }> {
  return db.transaction('rw', allTables(), async () => {
    const doc = await create('documents', {
      horseId: input.horseId,
      fileId: input.fileId,
      category: input.category,
      title: input.title,
      date: input.date,
      ocrText: input.ocrText?.slice(0, 20000),
    });
    const date = input.date ?? todayIso();
    if (input.careType && input.horseId) {
      const care = await saveCare({
        record: {
          horseId: input.horseId,
          type: input.careType,
          date,
          professionalId: input.professionalId,
          documentIds: [doc.id],
          details: input.product ? { product: input.product } : {},
          nextDueAt: input.nextDueAt,
        },
        amountCents: input.amountCents,
      });
      if (care.expenseId) await update('expenses', care.expenseId, { documentId: doc.id });
      return { documentId: doc.id, careId: care.id };
    }
    if (input.amountCents) {
      await create('expenses', {
        horseId: input.horseId,
        date,
        amountCents: input.amountCents,
        currency: 'EUR',
        category: 'other',
        label: input.title,
        professionalId: input.professionalId,
        documentId: doc.id,
        monthly: false,
      });
    }
    return { documentId: doc.id };
  });
}

// --- Rappels & agenda ---------------------------------------------------------------------

export async function setDueState(item: DueItem, status: 'done' | 'snoozed' | 'dismissed', snoozedUntil?: string): Promise<void> {
  const existing = await db.reminderStates.where('key').equals(item.key).first();
  if (existing) await update('reminderStates', existing.id, { status, snoozedUntil });
  else await create('reminderStates', { key: item.key, status, snoozedUntil });
}

export async function addPlanToAgenda(horseId: string, items: PlanItem[]): Promise<number> {
  await db.transaction('rw', allTables(), async () => {
    for (const it of items) {
      await create('events', {
        horseId,
        type: it.type,
        title: it.title,
        date: it.date,
        time: it.time,
        durationMin: it.durationMin,
        notes: it.notes,
        recurrence: { freq: 'none', interval: 1 },
        alertMin: 60,
        doneDates: [],
      });
    }
  });
  return items.length;
}

export async function toggleEventDone(eventId: string, date: string): Promise<void> {
  const e = await db.events.get(eventId);
  if (!e) return;
  const doneDates = e.doneDates.includes(date) ? e.doneDates.filter((d) => d !== date) : [...e.doneDates, date];
  await update('events', eventId, { doneDates });
}
