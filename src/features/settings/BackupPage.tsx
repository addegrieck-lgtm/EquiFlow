import { useState } from 'react';
import { toHash } from '../../app/router';
import { db } from '../../data/db';
import { setSetting } from '../../data/repo';
import { Button, Card, ConfirmButton, FilePicker, PageHeader, Section, toast, toastError } from '../../design/components';
import { formatBytes } from '../../lib/format';
import { backupFileName, exportBackup, importBackup, wipeAllData } from '../../services/backup';
import { useLiveQuery } from 'dexie-react-hooks';

export const LAST_BACKUP_KEY = 'backup.lastAt';

export function BackupPage() {
  const [busy, setBusy] = useState(false);
  const usage = useLiveQuery(async () => {
    const files = await db.files.toArray();
    const est = await navigator.storage?.estimate?.().catch(() => undefined);
    return { files: files.length, bytes: files.reduce((s, f) => s + f.size, 0), quota: est?.quota };
  }, []);

  const doExport = async (includeFiles: boolean) => {
    setBusy(true);
    try {
      const data = await exportBackup({ includeFiles });
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const file = new File([blob], backupFileName(), { type: 'application/json' });
      let shared = false;
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Sauvegarde EQUIFLOW' });
          shared = true;
        }
      } catch {
        /* partage annulé : repli sur le téléchargement */
      }
      if (!shared) {
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
      await setSetting(LAST_BACKUP_KEY, new Date().toISOString());
      toast('Sauvegarde créée');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };

  const doImport = async ([f]: File[]) => {
    setBusy(true);
    try {
      const report = await importBackup(JSON.parse(await f.text()));
      toast(`Restauration terminée : ${report.records} éléments, ${report.files} fichiers`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toastError(e instanceof SyntaxError ? new Error('Fichier illisible : ce n’est pas une sauvegarde EQUIFLOW.') : e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Sauvegarde et données" backHref={toHash('more')} />
      <Section title="Sauvegarder">
        <Card className="stack">
          <p className="small muted">
            Vos données sont stockées uniquement sur ce téléphone. Exportez régulièrement une sauvegarde (dans Fichiers → iCloud Drive par exemple) : c’est elle qui vous permettra de
            changer de téléphone ou de récupérer vos données.
          </p>
          <Button icon="download" disabled={busy} onClick={() => doExport(true)}>
            Exporter tout (avec photos et documents)
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => doExport(false)}>
            Exporter sans les fichiers (plus léger)
          </Button>
          {usage && (
            <span className="small muted">
              {usage.files} fichier(s), {formatBytes(usage.bytes)}
              {usage.quota ? ` · espace disponible pour l’app : ${formatBytes(usage.quota)}` : ''}
            </span>
          )}
        </Card>
      </Section>
      <Section title="Restaurer">
        <Card className="stack">
          <p className="small muted">Remplace toutes les données actuelles par celles de la sauvegarde. Le fichier est vérifié avant toute modification.</p>
          <FilePicker label={busy ? 'Restauration…' : 'Importer une sauvegarde'} icon="upload" accept="application/json,.json" onFiles={doImport} />
        </Card>
      </Section>
      <Section title="Tout supprimer">
        <Card className="stack">
          <p className="small muted">Efface définitivement toutes les données EQUIFLOW de ce téléphone (chevaux, soins, documents, séances, dépenses, profil). Exportez d’abord si besoin.</p>
          <ConfirmButton
            confirmLabel="Oui, tout effacer définitivement"
            onConfirm={async () => {
              await wipeAllData();
              toast('Toutes les données ont été supprimées');
              setTimeout(() => {
                window.location.hash = '#/home';
                window.location.reload();
              }, 600);
            }}
          >
            Supprimer toutes mes données
          </ConfirmButton>
        </Card>
      </Section>
    </>
  );
}
