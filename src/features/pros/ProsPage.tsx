import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { navigate, toHash } from '../../app/router';
import { db } from '../../data/db';
import { HOME_KEY, useCareRecords, useHorses, useProfessionals, useSetting } from '../../data/hooks';
import { create, remove, setSetting, update } from '../../data/repo';
import { CARE_LABELS, TRADE_LABELS, options } from '../../domain/labels';
import { TRADES, type Trade } from '../../domain/models';
import { Badge, Button, Card, ConfirmButton, EmptyState, Icon, ListRow, PageHeader, Section, SelectField, TextArea, TextField, toast, toastError } from '../../design/components';
import { formatDate } from '../../lib/dates';
import { normalize } from '../../lib/format';
import { currentPosition, distanceKm, formatDistance, geocode, sortByDistance, type LatLon } from '../../services/geo';
import { fieldErrors } from '../horse/HorseForm';
import { SaveBar } from '../shared';

export function ProsRoute({ path }: { path: string[] }) {
  if (path[0] === 'new') return <ProEditPage />;
  if (path[0] && path[1] === 'edit') return <ProEditPage id={path[0]} />;
  if (path[0]) return <ProDetailPage id={path[0]} />;
  return <ProsPage />;
}

/** Point de référence pour les distances : position enregistrée (écurie / domicile). */
export function useHome(): LatLon | undefined {
  return useSetting<LatLon | undefined>(HOME_KEY, undefined);
}

function ProsPage() {
  const pros = useProfessionals() ?? [];
  const home = useHome();
  const [trade, setTrade] = useState<Trade | ''>('');
  const [query, setQuery] = useState('');
  const q = normalize(query);
  let list = pros.filter((p) => (!trade || p.trade === trade) && (!q || normalize(`${p.name} ${TRADE_LABELS[p.trade]} ${p.address ?? ''}`).includes(q)));
  const sorted = home ? sortByDistance(list, home) : list.map((p) => ({ ...p, distanceKm: undefined }));
  list = sorted;

  return (
    <>
      <PageHeader title="Mes professionnels" backHref={toHash('more')} actions={<Button icon="plus" onClick={() => navigate('more', 'pros', 'new')}>Ajouter</Button>} />
      <Section>
        <Button block variant="secondary" icon="locate" onClick={() => navigate('more', 'nearby', 'vet')}>
          Trouver un professionnel autour de moi
        </Button>
      </Section>
      {pros.length > 0 ? (
        <>
          <div className="form" style={{ marginBottom: 'var(--space-5)' }}>
            <TextField label="Rechercher" placeholder="Nom, métier, ville…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <SelectField label="Métier" value={trade} onChange={(e) => setTrade(e.target.value as Trade | '')} options={[{ value: '', label: 'Tous les métiers' }, ...options(TRADE_LABELS)]} />
          </div>
          {home && <p className="small muted" style={{ marginBottom: 'var(--space-3)' }}>Triés du plus proche au plus loin de votre position de référence.</p>}
          <Card className="card--flush">
            {sorted.map((p) => (
              <ListRow
                key={p.id}
                icon="pro"
                title={p.name}
                subtitle={[TRADE_LABELS[p.trade], p.address, p.phone].filter(Boolean).join(' · ')}
                trailing={p.distanceKm !== undefined ? <Badge>{formatDistance(p.distanceKm)}</Badge> : undefined}
                href={toHash('more', 'pros', p.id)}
              />
            ))}
            {!sorted.length && <ListRow title="Aucun résultat" />}
          </Card>
        </>
      ) : (
        <EmptyState icon="pro" title="Votre carnet est vide">
          Ajoutez votre vétérinaire, votre maréchal, votre dentiste… ou trouvez-les autour de vous. Ils seront proposés lors de la saisie des soins.
        </EmptyState>
      )}
    </>
  );
}

function ProDetailPage({ id }: { id: string }) {
  const pro = useLiveQuery(() => db.professionals.get(id), [id]);
  const care = useCareRecords() ?? [];
  const horses = useHorses() ?? [];
  const home = useHome();
  if (!pro) return pro === undefined ? null : <EmptyState icon="pro" title="Professionnel introuvable" />;
  const history = care.filter((c) => c.professionalId === pro.id);
  const dist = home && pro.lat !== undefined && pro.lon !== undefined ? distanceKm(home, { lat: pro.lat, lon: pro.lon }) : undefined;
  const mapUrl = pro.lat !== undefined ? `https://maps.apple.com/?ll=${pro.lat},${pro.lon}&q=${encodeURIComponent(pro.name)}` : pro.address ? `https://maps.apple.com/?q=${encodeURIComponent(pro.address)}` : undefined;

  return (
    <>
      <PageHeader title={pro.name} eyebrow={TRADE_LABELS[pro.trade]} backHref={toHash('more', 'pros')} actions={<Button variant="ghost" icon="edit" onClick={() => navigate('more', 'pros', pro.id, 'edit')}>Modifier</Button>} />
      <Section>
        <Card className="card--flush">
          {pro.phone && <ListRow icon="phone" title={pro.phone} subtitle="Appeler" href={`tel:${pro.phone.replace(/[^\d+]/g, '')}`} />}
          {pro.email && <ListRow icon="mail" title={pro.email} subtitle="Écrire un e-mail" href={`mailto:${pro.email}`} />}
          {pro.address && <ListRow icon="pin" title={pro.address} subtitle={dist !== undefined ? `À ${formatDistance(dist)} · itinéraire` : 'Itinéraire'} href={mapUrl} />}
          {!pro.address && mapUrl && <ListRow icon="pin" title="Voir sur la carte" subtitle={dist !== undefined ? `À ${formatDistance(dist)}` : undefined} href={mapUrl} />}
          {pro.website && <ListRow icon="globe" title={pro.website.replace(/^https?:\/\//, '')} subtitle="Site web" href={pro.website.startsWith('http') ? pro.website : `https://${pro.website}`} />}
          {!pro.phone && !pro.email && !pro.address && <ListRow title="Aucune coordonnée" subtitle="Complétez la fiche" href={toHash('more', 'pros', pro.id, 'edit')} />}
        </Card>
        {pro.osmId && <p className="small muted">Ajouté depuis OpenStreetMap : vérifiez les informations et les soins équins proposés.</p>}
      </Section>
      {pro.notes && (
        <Section title="Notes">
          <Card className="small" style={{ whiteSpace: 'pre-wrap' }}>{pro.notes}</Card>
        </Section>
      )}
      <Section title="Interventions">
        {history.length ? (
          <Card className="card--flush">
            {history.slice(0, 20).map((c) => (
              <ListRow key={c.id} icon="health" title={`${CARE_LABELS[c.type]} · ${horses.find((h) => h.id === c.horseId)?.name ?? ''}`} subtitle={formatDate(c.date)} href={toHash('horse', c.horseId, 'care', c.id)} />
            ))}
          </Card>
        ) : (
          <p className="small muted">Aucune intervention enregistrée avec ce professionnel.</p>
        )}
      </Section>
    </>
  );
}

function ProEditPage({ id }: { id?: string }) {
  const existing = useLiveQuery(() => (id ? db.professionals.get(id) : undefined), [id]);
  const [s, setS] = useState<{ name: string; trade: Trade; phone: string; email: string; address: string; website: string; notes: string; lat?: number; lon?: number }>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  if (id && existing === undefined) return null;
  const d = s ?? {
    name: existing?.name ?? '',
    trade: existing?.trade ?? 'vet',
    phone: existing?.phone ?? '',
    email: existing?.email ?? '',
    address: existing?.address ?? '',
    website: existing?.website ?? '',
    notes: existing?.notes ?? '',
    lat: existing?.lat,
    lon: existing?.lon,
  };
  const set = (p: Partial<typeof d>) => setS({ ...d, ...p });

  const locateAddress = async () => {
    if (!d.address.trim()) return;
    setLocating(true);
    try {
      const r = await geocode(d.address);
      if (r) {
        set({ lat: r.lat, lon: r.lon });
        toast('Adresse localisée');
      } else toast('Adresse introuvable', 'error');
    } catch (e) {
      toastError(e);
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const data = { name: d.name, trade: d.trade, phone: d.phone, email: d.email, address: d.address, website: d.website, notes: d.notes, lat: d.lat, lon: d.lon };
      const saved = existing ? await update('professionals', existing.id, data) : await create('professionals', data);
      toast(existing ? 'Fiche mise à jour' : 'Ajouté à votre carnet');
      navigate('more', 'pros', saved.id);
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
      <PageHeader title={existing ? 'Modifier' : 'Nouveau professionnel'} backHref={existing ? toHash('more', 'pros', existing.id) : toHash('more', 'pros')} />
      <div className="form">
        <TextField label="Nom" value={d.name} error={errors.name} onChange={(e) => set({ name: e.target.value })} placeholder="Dr Martin, Jean Dupont…" />
        <SelectField label="Métier" value={d.trade} onChange={(e) => set({ trade: e.target.value as Trade })} options={TRADES.map((t) => ({ value: t, label: TRADE_LABELS[t] }))} />
        <TextField label="Téléphone" type="tel" autoComplete="off" value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
        <TextField label="E-mail" type="email" autoComplete="off" value={d.email} error={errors.email} onChange={(e) => set({ email: e.target.value })} />
        <TextField label="Adresse" value={d.address} onChange={(e) => set({ address: e.target.value, lat: undefined, lon: undefined })} hint={d.lat !== undefined ? 'Localisée ✓ (distance calculable)' : 'Localisez-la pour trier vos pros par distance.'} />
        {d.address.trim() && d.lat === undefined && (
          <Button variant="secondary" icon="pin" disabled={locating} onClick={locateAddress}>
            {locating ? 'Localisation…' : 'Localiser l’adresse (OpenStreetMap)'}
          </Button>
        )}
        <TextField label="Site web" value={d.website} onChange={(e) => set({ website: e.target.value })} />
        <TextArea label="Notes" value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Tarifs, disponibilités, secteur…" />
        {existing && (
          <ConfirmButton
            onConfirm={async () => {
              await remove('professionals', existing.id);
              toast('Retiré du carnet');
              navigate('more', 'pros');
            }}
          >
            Retirer du carnet
          </ConfirmButton>
        )}
      </div>
      <SaveBar onSave={save} saving={saving} />
    </>
  );
}

/** Enregistre la position de référence (écurie / domicile) pour les distances. */
export function HomeLocationCard() {
  const home = useHome();
  const [busy, setBusy] = useState(false);
  const [address, setAddress] = useState('');
  const useGps = async () => {
    setBusy(true);
    try {
      await setSetting(HOME_KEY, await currentPosition());
      toast('Position enregistrée');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };
  const useAddress = async () => {
    setBusy(true);
    try {
      const r = await geocode(address);
      if (!r) return toast('Adresse introuvable', 'error');
      await setSetting(HOME_KEY, { lat: r.lat, lon: r.lon });
      toast('Position enregistrée');
      setAddress('');
    } catch (e) {
      toastError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="stack">
      <div className="row">
        <Icon name="pin" />
        <strong>{home ? 'Position de référence enregistrée' : 'Position de référence'}</strong>
      </div>
      <p className="small muted">Votre écurie ou domicile : sert à trier les professionnels par distance. Elle reste sur votre téléphone.</p>
      <Button variant="secondary" icon="locate" disabled={busy} onClick={useGps}>
        {home ? 'Mettre à jour avec ma position' : 'Utiliser ma position actuelle'}
      </Button>
      <div className="row">
        <input className="field__control" style={{ flex: 1, minWidth: 0 }} placeholder="ou une adresse / ville" aria-label="Adresse de référence" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Button variant="secondary" disabled={busy || !address.trim()} onClick={useAddress}>OK</Button>
      </div>
      {home && (
        <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => db.settings.delete(HOME_KEY)}>
          Effacer la position
        </button>
      )}
    </Card>
  );
}
