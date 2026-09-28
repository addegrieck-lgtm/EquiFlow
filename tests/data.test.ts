import 'fake-indexeddb/auto';
import { resetDbForTests } from '../src/data/db';
import { create, remove, update, ValidationError } from '../src/data/repo';
import { storeFile } from '../src/data/files';
import { exportBackup, importBackup, wipeAllData } from '../src/services/backup';

let n = 0;
beforeEach(() => {
  resetDbForTests(`test-data-${n++}`);
});

const horseDraft = { name: 'Spirit', status: 'active' as const };

describe('repository', () => {
  it('crée un enregistrement avec les champs communs', async () => {
    const h = await create('horses', horseDraft);
    expect(h.id).toMatch(/[0-9a-f-]{36}/);
    expect(h.ownerId).toBe('local');
    expect(h.version).toBe(1);
    expect(h.createdAt).toBe(h.updatedAt);
  });

  it('ignore les champs vides et valide les données', async () => {
    const h = await create('horses', { ...horseDraft, breed: '' });
    expect('breed' in h).toBe(false);
    await expect(create('horses', { name: '', status: 'active' })).rejects.toBeInstanceOf(ValidationError);
    await expect(create('horses', { name: 'x'.repeat(41), status: 'active' })).rejects.toThrow('40 caractères maximum');
  });

  it('met à jour, incrémente la version et supprime les champs vidés', async () => {
    const h = await create('horses', { ...horseDraft, breed: 'Selle Français' });
    const u = await update('horses', h.id, { name: 'Spirit II', breed: undefined });
    expect(u.name).toBe('Spirit II');
    expect(u.version).toBe(2);
    expect('breed' in u).toBe(false);
  });

  it('supprime', async () => {
    const h = await create('horses', horseDraft);
    await remove('horses', h.id);
    await expect(update('horses', h.id, { name: 'x' })).rejects.toThrow('introuvable');
  });
});

describe('sauvegarde', () => {
  it('fait l’aller-retour export → effacement → import, fichiers compris', async () => {
    const file = await storeFile(new Blob(['%PDF-1.4 facture'], { type: 'application/pdf' }), 'facture.pdf');
    const h = await create('horses', horseDraft);
    await create('expenses', { horseId: h.id, date: '2026-09-28', amountCents: 8500, currency: 'EUR', category: 'farrier', monthly: false });
    await create('documents', { horseId: h.id, fileId: file.id, category: 'invoice', title: 'Facture maréchal' });

    const backup = JSON.parse(JSON.stringify(await exportBackup()));
    await wipeAllData();

    const { db } = await import('../src/data/db');
    expect(await db.horses.count()).toBe(0);

    const report = await importBackup(backup);
    expect(report).toEqual({ records: 3, files: 1 });
    expect((await db.horses.toArray())[0].name).toBe('Spirit');
    const restored = await db.files.get(file.id);
    expect(await restored!.blob.text()).toBe('%PDF-1.4 facture');
  });

  it('refuse une sauvegarde invalide sans toucher aux données', async () => {
    await create('horses', horseDraft);
    const { db } = await import('../src/data/db');
    await expect(importBackup({ foo: 1 })).rejects.toThrow('pas une sauvegarde EQUIFLOW');

    const bad = await exportBackup();
    (bad.tables.horses as { name: string }[])[0].name = '';
    await expect(importBackup(JSON.parse(JSON.stringify(bad)))).rejects.toThrow('corrompue');
    expect(await db.horses.count()).toBe(1);
  });

  it('peut exporter sans les fichiers', async () => {
    await storeFile(new Blob(['x'], { type: 'text/plain' }), 'a.txt');
    expect((await exportBackup({ includeFiles: false })).files).toHaveLength(0);
  });
});
