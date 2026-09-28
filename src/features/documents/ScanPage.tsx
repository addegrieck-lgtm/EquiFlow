import { useState } from 'react';
import { navigate, toHash } from '../../app/router';
import { deleteFiles, storeFile, useFileUrl } from '../../data/files';
import { useActiveHorse, useProfessionals } from '../../data/hooks';
import { CARE_LABELS, DOCUMENT_LABELS, options } from '../../domain/labels';
import type { CareType, DocumentCategory } from '../../domain/models';
import { Button, Card, EmptyState, FilePicker, Icon, PageHeader, ProgressBar, SelectField, TextField, toast, toastError } from '../../design/components';
import { formatDate, todayIso } from '../../lib/dates';
import { parseMoney } from '../../lib/format';
import { saveScan } from '../../services/actions';
import { extractFromText, type Confidence, type ScanResult } from '../../services/scan/extract';
import { canRecognize, recognize } from '../../services/scan/ocr';
import { centsToInput, DateField, HorseSelect, MoneyField, ProSelect, SaveBar } from '../shared';

const CONF_LABEL: Record<Confidence, string> = { high: 'Détecté avec confiance', medium: 'À vérifier', low: 'Incertain' };

function Conf({ c }: { c?: Confidence }) {
  if (!c) return null;
  return <span className={`confidence confidence--${c}`} title={CONF_LABEL[c]} aria-label={CONF_LABEL[c]} />;
}

interface Draft {
  horseId?: string;
  category: DocumentCategory;
  title: string;
  date?: string;
  careType?: CareType;
  professionalId?: string;
  amount: string;
  nextDueAt?: string;
  product: string;
}

export function ScanPage({ horseId: initialHorse }: { horseId?: string }) {
  const { horses, horse: active } = useActiveHorse();
  const pros = useProfessionals() ?? [];
  const [fileId, setFileId] = useState<string>();
  const [phase, setPhase] = useState<'pick' | 'reading' | 'review'>('pick');
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState('');
  const [result, setResult] = useState<ScanResult>({});
  const [draft, setDraft] = useState<Draft>();
  const [saving, setSaving] = useState(false);
  const preview = useFileUrl(fileId);

  const onFile = async ([f]: File[]) => {
    try {
      const stored = await storeFile(f, f.name);
      setFileId(stored.id);
      const today = todayIso();
      let text = '';
      if (canRecognize(stored.mime)) {
        setPhase('reading');
        setProgress(0);
        try {
          text = await recognize(stored.blob, setProgress);
        } catch (e) {
          console.warn(e);
          toast('Lecture automatique impossible : complétez les champs à la main.', 'error');
        }
      } else {
        toast('Les PDF ne sont pas lus automatiquement : complétez les champs.');
      }
      const r = extractFromText(text, { horses, professionals: pros, today });
      setOcrText(text);
      setResult(r);
      const horseId = initialHorse ?? r.horseId?.value ?? active?.id;
      setDraft({
        horseId,
        category: r.category?.value ?? 'other',
        title: [r.careType ? CARE_LABELS[r.careType.value] : DOCUMENT_LABELS[r.category?.value ?? 'other'], r.date ? formatDate(r.date.value) : ''].filter(Boolean).join(' — '),
        date: r.date?.value ?? today,
        careType: r.careType?.value,
        professionalId: r.professionalId?.value,
        amount: centsToInput(r.amountCents?.value),
        nextDueAt: r.nextDue?.value,
        product: r.product?.value ?? '',
      });
      setPhase('review');
    } catch (e) {
      toastError(e);
      setPhase('pick');
    }
  };

  const cancel = async () => {
    await deleteFiles([fileId]);
    setFileId(undefined);
    setDraft(undefined);
    setPhase('pick');
  };

  const save = async () => {
    if (!draft || !fileId) return;
    const amountCents = draft.amount.trim() ? parseMoney(draft.amount) : undefined;
    if (draft.amount.trim() && !amountCents) return toast('Montant invalide', 'error');
    if (draft.careType && !draft.horseId) return toast('Choisissez le cheval concerné par ce soin', 'error');
    setSaving(true);
    try {
      await saveScan({
        fileId,
        horseId: draft.horseId,
        category: draft.category,
        title: draft.title.trim() || DOCUMENT_LABELS[draft.category],
        date: draft.date,
        ocrText,
        careType: draft.careType,
        professionalId: draft.professionalId,
        amountCents,
        nextDueAt: draft.nextDueAt,
        product: draft.product,
      });
      toast(draft.careType ? 'Document, soin et dépense ajoutés à l’historique' : 'Document enregistré');
      if (draft.horseId) navigate('horse', draft.horseId, draft.careType ? (['farrier', 'dental', 'osteopath', 'massage', 'other'].includes(draft.careType) ? 'care' : 'health') : 'documents');
      else navigate('home');
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(false);
    }
  };

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <>
      <PageHeader title="SCAN" eyebrow="Documents" backHref={toHash('home')} />

      {phase === 'pick' && (
        <>
          <EmptyState icon="scan" title="Photographiez un document" action={<FilePicker label="Prendre une photo" icon="camera" accept="image/*,application/pdf" onFiles={onFile} variant="primary" />}>
            Facture, ordonnance, certificat : EQUIFLOW lit la date, le montant, le type d’intervention et le cheval. Vous vérifiez avant d’enregistrer.
          </EmptyState>
          <p className="small muted" style={{ marginTop: 'var(--space-4)' }}>
            <Icon name="shield" size={16} /> La lecture se fait sur votre téléphone : l’image n’est envoyée nulle part. Conseil : document à plat, bien éclairé, cadré serré.
          </p>
        </>
      )}

      {phase === 'reading' && (
        <Card className="stack">
          {preview && <img className="doc-viewer" src={preview} alt="Document scanné" style={{ maxHeight: 260, objectFit: 'contain' }} />}
          <strong>Lecture du document…</strong>
          <ProgressBar value={Math.round(progress * 100)} max={100} label="Progression de la lecture" />
          <p className="small muted">La première lecture charge le moteur (quelques secondes). Les suivantes sont plus rapides, même hors ligne.</p>
        </Card>
      )}

      {phase === 'review' && draft && (
        <div className="form">
          {preview && <img className="doc-viewer" src={preview} alt="Document scanné" style={{ maxHeight: 220, objectFit: 'contain' }} />}
          <Card className="small">
            <div className="row row--wrap" style={{ gap: 'var(--space-3)' }}>
              <span className="row" style={{ gap: 6 }}><Conf c="high" /> fiable</span>
              <span className="row" style={{ gap: 6 }}><Conf c="medium" /> à vérifier</span>
              <span className="row" style={{ gap: 6 }}><Conf c="low" /> incertain</span>
            </div>
            {!ocrText.trim() && <p className="muted" style={{ marginTop: 8 }}>Aucun texte reconnu : saisissez les informations.</p>}
          </Card>

          <div className="scan-field"><Conf c={result.horseId?.confidence} /><div style={{ flex: 1 }}><HorseSelect horses={horses} value={draft.horseId} allowNone onChange={(v) => set({ horseId: v })} /></div></div>
          <div className="scan-field"><Conf c={result.category?.confidence} /><div style={{ flex: 1 }}><SelectField label="Type de document" value={draft.category} onChange={(e) => set({ category: e.target.value as DocumentCategory })} options={options(DOCUMENT_LABELS)} /></div></div>
          <TextField label="Titre" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          <div className="scan-field"><Conf c={result.date?.confidence} /><div style={{ flex: 1 }}><DateField label="Date" value={draft.date} onChange={(v) => set({ date: v })} /></div></div>
          <div className="scan-field">
            <Conf c={result.careType?.confidence} />
            <div style={{ flex: 1 }}>
              <SelectField
                label="Ajouter à l’historique comme"
                value={draft.careType ?? ''}
                onChange={(e) => set({ careType: (e.target.value || undefined) as CareType })}
                options={[{ value: '', label: 'Document seul (pas d’intervention)' }, ...options(CARE_LABELS)]}
              />
            </div>
          </div>
          {draft.careType && (
            <>
              <div className="scan-field"><Conf c={result.professionalId?.confidence} /><div style={{ flex: 1 }}><ProSelect pros={pros} value={draft.professionalId} onChange={(v) => set({ professionalId: v })} /></div></div>
              {(draft.careType === 'vaccination' || draft.careType === 'deworming' || draft.careType === 'treatment') && (
                <div className="scan-field"><Conf c={result.product?.confidence} /><div style={{ flex: 1 }}><TextField label="Produit" value={draft.product} onChange={(e) => set({ product: e.target.value })} /></div></div>
              )}
              <div className="scan-field"><Conf c={result.nextDue?.confidence} /><div style={{ flex: 1 }}><DateField label="Prochaine échéance" value={draft.nextDueAt} onChange={(v) => set({ nextDueAt: v })} hint="Vide = calcul automatique d’après l’intervalle habituel" /></div></div>
            </>
          )}
          <div className="scan-field"><Conf c={result.amountCents?.confidence} /><div style={{ flex: 1 }}><MoneyField value={draft.amount} onChange={(v) => set({ amount: v })} hint={draft.amount ? 'Une dépense sera créée.' : undefined} /></div></div>
          {ocrText && (
            <details>
              <summary className="small muted">Voir le texte reconnu</summary>
              <pre className="small" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{ocrText}</pre>
            </details>
          )}
          <Button variant="ghost" onClick={cancel}>
            Annuler ce scan
          </Button>
        </div>
      )}
      {phase === 'review' && <SaveBar onSave={save} saving={saving} label="Valider et enregistrer" />}
    </>
  );
}
