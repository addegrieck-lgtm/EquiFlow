import 'fake-indexeddb/auto';
import { finishLive, formatClock, liveElapsed, pauseLive, startLive, switchGait } from '../src/services/liveSession';
import { resetDbForTests } from '../src/data/db';
import { create } from '../src/data/repo';
import { deleteCare, deleteHorse, saveCare, saveScan } from '../src/services/actions';
import { storeFile } from '../src/data/files';

const MIN = 60_000;

describe('séance en direct', () => {
  it('cumule le temps par allure et exclut les pauses', () => {
    let s = startLive(0, 'spirit'); // pas
    s = switchGait(s, 'trot', 10 * MIN);
    s = switchGait(s, 'canter', 25 * MIN);
    s = pauseLive(s, 30 * MIN); // pause de 5 min
    s = switchGait(s, 'walk', 35 * MIN);
    expect(liveElapsed(s, 45 * MIN)).toBe(40 * MIN);
    expect(finishLive(s, 45 * MIN)).toEqual({ durationMin: 40, gaits: { walk: 20, trot: 15, canter: 5 } });
  });

  it('compte au moins une minute et formate le chronomètre', () => {
    expect(finishLive(startLive(0), 10_000).durationMin).toBe(1);
    expect(formatClock(65_000)).toBe('01:05');
    expect(formatClock(3_725_000)).toBe('1:02:05');
  });
});

let n = 0;
describe('opérations métier', () => {
  beforeEach(() => {
    resetDbForTests(`actions-${n++}`);
  });

  it('un soin avec montant crée sa dépense liée, et la supprime avec lui', async () => {
    const { db } = await import('../src/data/db');
    const h = await create('horses', { name: 'Spirit', status: 'active' });
    const care = await saveCare({ record: { horseId: h.id, type: 'farrier', date: '2026-09-28', documentIds: [], details: {} }, amountCents: 8500 });
    const exp = await db.expenses.get(care.expenseId!);
    expect(exp).toMatchObject({ amountCents: 8500, category: 'farrier', careRecordId: care.id, horseId: h.id });

    // Montant modifié puis retiré
    await saveCare({ record: { horseId: h.id, type: 'farrier', date: '2026-09-28', documentIds: [], details: {} }, amountCents: 9000 }, care.id);
    expect((await db.expenses.get(care.expenseId!))!.amountCents).toBe(9000);
    await saveCare({ record: { horseId: h.id, type: 'farrier', date: '2026-09-28', documentIds: [], details: {} } }, care.id);
    expect(await db.expenses.count()).toBe(0);

    await saveCare({ record: { horseId: h.id, type: 'farrier', date: '2026-09-28', documentIds: [], details: {} }, amountCents: 100 }, care.id);
    await deleteCare(care.id);
    expect(await db.expenses.count()).toBe(0);
    expect(await db.careRecords.count()).toBe(0);
  });

  it('un SCAN crée le document, le soin et la dépense liés (exemple du cahier des charges)', async () => {
    const { db } = await import('../src/data/db');
    const h = await create('horses', { name: 'Spirit', status: 'active' });
    const f = await storeFile(new Blob(['x'], { type: 'image/png' }), 'facture.png');
    const { documentId, careId } = await saveScan({ fileId: f.id, horseId: h.id, category: 'invoice', title: 'Maréchal-ferrant — 28/09/2026', date: '2026-09-28', careType: 'farrier', amountCents: 8500 });
    const care = await db.careRecords.get(careId!);
    expect(care).toMatchObject({ type: 'farrier', date: '2026-09-28', documentIds: [documentId] });
    expect(await db.expenses.get(care!.expenseId!)).toMatchObject({ amountCents: 8500, documentId });
  });

  it('supprimer un cheval supprime tout son dossier et ses fichiers', async () => {
    const { db } = await import('../src/data/db');
    const h = await create('horses', { name: 'Spirit', status: 'active' });
    const other = await create('horses', { name: 'Ulysse', status: 'active' });
    const f = await storeFile(new Blob(['x'], { type: 'image/png' }), 'a.png');
    await saveScan({ fileId: f.id, horseId: h.id, category: 'invoice', title: 'Facture', careType: 'vet_visit', amountCents: 5000 });
    await create('expenses', { horseId: other.id, date: '2026-01-01', amountCents: 100, currency: 'EUR', category: 'feed', monthly: false });
    await deleteHorse(h);
    expect(await db.horses.count()).toBe(1);
    expect(await db.careRecords.count()).toBe(0);
    expect(await db.documents.count()).toBe(0);
    expect(await db.files.count()).toBe(0);
    expect(await db.expenses.count()).toBe(1);
  });
});
