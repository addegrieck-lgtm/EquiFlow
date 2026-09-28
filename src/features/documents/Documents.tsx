import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { navigate, toHash } from '../../app/router';
import { db } from '../../data/db';
import { storeFile, useFileUrl, useStoredFile } from '../../data/files';
import { useDocuments, useHorses } from '../../data/hooks';
import { create, update } from '../../data/repo';
import { DOCUMENT_LABELS, options } from '../../domain/labels';
import { DOCUMENT_CATEGORIES, type DocumentCategory, type Horse, type HorseDocument } from '../../domain/models';
import { Badge, Button, Card, ConfirmButton, EmptyState, FilePicker, Icon, PageHeader, Section, SelectField, TextField, toast, toastError } from '../../design/components';
import { formatDate, todayIso } from '../../lib/dates';
import { formatBytes, normalize } from '../../lib/format';
import { deleteDocument } from '../../services/actions';
import { DateField, HorseSelect, SaveBar } from '../shared';

function DocTile({ doc, href }: { doc: HorseDocument; href: string }) {
  const file = useStoredFile(doc.fileId);
  const thumb = useFileUrl(doc.fileId, true);
  const expired = doc.expiresAt && doc.expiresAt < todayIso();
  return (
    <a className="doc-tile" href={href}>
      <span className="doc-tile__thumb">{file?.mime.startsWith('image/') && thumb ? <img src={thumb} alt="" /> : <Icon name="document" size={32} />}</span>
      <span className="doc-tile__body">
        <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</strong>
        <span className="muted">{doc.date ? formatDate(doc.date) : DOCUMENT_LABELS[doc.category]}</span>
        {expired && (
          <span style={{ display: 'block', marginTop: 4 }}>
            <Badge tone="danger">Expiré</Badge>
          </span>
        )}
      </span>
    </a>
  );
}

export function HorseDocuments({ horse }: { horse: Horse }) {
  const docs = useDocuments(horse.id) ?? [];
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const q = normalize(query);
  const filtered = q ? docs.filter((d) => normalize(`${d.title} ${DOCUMENT_LABELS[d.category]} ${d.ocrText ?? ''}`).includes(q)) : docs;

  const add = async (files: File[]) => {
    setAdding(true);
    try {
      for (const f of files) {
        const stored = await storeFile(f, f.name);
        await create('documents', {
          horseId: horse.id,
          fileId: stored.id,
          category: guessCategory(f.name),
          title: f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 120) || 'Document',
          date: todayIso(),
        });
      }
      toast(files.length > 1 ? `${files.length} documents ajoutés` : 'Document ajouté — touchez-le pour le renommer');
    } catch (e) {
      toastError(e);
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <div className="row row--wrap" style={{ marginBottom: 'var(--space-4)' }}>
        <Button icon="scan" onClick={() => navigate('scan', horse.id)}>
          Scanner
        </Button>
        <FilePicker label={adding ? 'Ajout…' : 'Importer'} icon="upload" accept="image/*,application/pdf" multiple onFiles={add} />
      </div>
      {docs.length > 3 && <TextField label="Rechercher" placeholder="Passeport, facture, texte scanné…" value={query} onChange={(e) => setQuery(e.target.value)} />}
      {!docs.length ? (
        <EmptyState icon="document" title="Aucun document">
          Passeport, factures, ordonnances, assurance : photographiez-les avec SCAN, les informations sont extraites automatiquement.
        </EmptyState>
      ) : (
        DOCUMENT_CATEGORIES.filter((c) => filtered.some((d) => d.category === c)).map((c) => (
          <Section key={c} title={DOCUMENT_LABELS[c]}>
            <div className="doc-grid">
              {filtered
                .filter((d) => d.category === c)
                .map((d) => (
                  <DocTile key={d.id} doc={d} href={toHash('horse', horse.id, 'doc', d.id)} />
                ))}
            </div>
          </Section>
        ))
      )}
    </>
  );
}

function guessCategory(name: string): DocumentCategory {
  const n = normalize(name);
  if (/passeport|sire/.test(n)) return 'passport';
  if (/facture|invoice/.test(n)) return 'invoice';
  if (/ordonnance/.test(n)) return 'prescription';
  if (/assurance/.test(n)) return 'insurance';
  if (/certificat/.test(n)) return 'certificate';
  return 'other';
}

/** Visionneuse + modification des informations d'un document. */
export function DocumentViewPage({ id, backHref }: { id: string; backHref: string }) {
  const doc = useLiveQuery(() => db.documents.get(id), [id]);
  const file = useStoredFile(doc?.fileId);
  const url = useFileUrl(doc?.fileId);
  const horses = useHorses() ?? [];
  const [draft, setDraft] = useState<Partial<HorseDocument>>({});
  const [saving, setSaving] = useState(false);
  if (!doc) return doc === undefined ? null : <EmptyState icon="document" title="Document introuvable" />;
  const d = { ...doc, ...draft };

  const share = async () => {
    if (!file) return;
    const f = new File([file.blob], file.name, { type: file.mime });
    try {
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: doc.title });
      else window.open(url, '_blank');
    } catch {
      /* partage annulé */
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await update('documents', doc.id, draft);
      setDraft({});
      toast('Document mis à jour');
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={doc.title} eyebrow={DOCUMENT_LABELS[doc.category]} backHref={backHref} />
      <Section>
        {file?.mime.startsWith('image/') && url && <img className="doc-viewer" src={url} alt={doc.title} />}
        {file?.mime === 'application/pdf' && (
          <Card className="spread">
            <div className="row">
              <Icon name="document" />
              <div>
                <strong>PDF</strong>
                <div className="small muted">{formatBytes(file.size)}</div>
              </div>
            </div>
            <Button variant="secondary" onClick={() => window.open(url, '_blank')}>
              Ouvrir
            </Button>
          </Card>
        )}
        <Button variant="secondary" icon="send" block onClick={share}>
          Partager / enregistrer
        </Button>
      </Section>
      <Section title="Informations">
        <div className="form">
          <TextField label="Titre" value={d.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <SelectField label="Catégorie" value={d.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as DocumentCategory })} options={options(DOCUMENT_LABELS)} />
          <HorseSelect horses={horses} value={d.horseId} allowNone onChange={(v) => setDraft({ ...draft, horseId: v })} />
          <div className="form-row">
            <DateField label="Date" value={d.date} onChange={(v) => setDraft({ ...draft, date: v })} />
            <DateField label="Expire le" value={d.expiresAt} onChange={(v) => setDraft({ ...draft, expiresAt: v })} />
          </div>
          {doc.ocrText && (
            <details>
              <summary className="small muted">Texte reconnu par le SCAN</summary>
              <pre className="small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{doc.ocrText}</pre>
            </details>
          )}
          <ConfirmButton
            onConfirm={async () => {
              await deleteDocument(doc.id);
              toast('Document supprimé');
              window.location.hash = backHref;
            }}
          >
            Supprimer le document
          </ConfirmButton>
        </div>
      </Section>
      {Object.keys(draft).length > 0 && <SaveBar onSave={save} saving={saving} />}
    </>
  );
}
