import { useState } from 'react';
import { navigate, toHash } from '../../app/router';
import { useProfessionals } from '../../data/hooks';
import { create, setSetting } from '../../data/repo';
import { HOME_KEY } from '../../data/hooks';
import { Badge, Button, Card, EmptyState, Icon, PageHeader, Segmented, toast, toastError } from '../../design/components';
import { currentPosition, fetchNearby, formatDistance, geocode, NEARBY_KINDS, type LatLon, type NearbyKind, type Place } from '../../services/geo';
import { useHome } from './ProsPage';

const RADII = [10, 25, 50] as const;

/** « Autour de moi » : professionnels et lieux équestres proches (OpenStreetMap). */
export function NearbyPage({ kind: initialKind }: { kind?: string }) {
  const home = useHome();
  const pros = useProfessionals() ?? [];
  const [kind, setKind] = useState<NearbyKind>((NEARBY_KINDS.find((k) => k.kind === initialKind)?.kind ?? 'vet') as NearbyKind);
  const [radius, setRadius] = useState<(typeof RADII)[number]>(25);
  const [origin, setOrigin] = useState<LatLon | undefined>(home);
  const [places, setPlaces] = useState<Place[]>();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  const meta = NEARBY_KINDS.find((k) => k.kind === kind)!;

  const search = async (o: LatLon, k = kind, r = radius) => {
    setLoading(true);
    setPlaces(undefined);
    try {
      setPlaces(await fetchNearby(k, o, r));
    } catch (e) {
      toastError(e instanceof TypeError ? new Error('Connexion Internet nécessaire pour cette recherche.') : e);
    } finally {
      setLoading(false);
    }
  };

  const locate = async () => {
    setLoading(true);
    try {
      const pos = await currentPosition();
      setOrigin(pos);
      await setSetting(HOME_KEY, pos);
      await search(pos);
    } catch (e) {
      toastError(e);
      setLoading(false);
    }
  };

  const fromAddress = async () => {
    setLoading(true);
    try {
      const r = await geocode(address);
      if (!r) {
        toast('Adresse introuvable', 'error');
        setLoading(false);
        return;
      }
      setOrigin(r);
      await search(r);
    } catch (e) {
      toastError(e);
      setLoading(false);
    }
  };

  const addToBook = async (p: Place) => {
    try {
      const saved = await create('professionals', { name: p.name, trade: meta.trade, phone: p.phone, email: p.email, website: p.website, address: p.address, lat: p.lat, lon: p.lon, osmId: p.osmId });
      toast(`${p.name} ajouté à votre carnet`);
      navigate('more', 'pros', saved.id);
    } catch (e) {
      toastError(e);
    }
  };

  return (
    <>
      <PageHeader title="Autour de moi" backHref={toHash('more', 'pros')} />
      <div className="form" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="chips" role="group" aria-label="Type de professionnel">
          {NEARBY_KINDS.map((k) => (
            <button
              key={k.kind}
              type="button"
              className="chip"
              aria-pressed={k.kind === kind}
              onClick={() => {
                setKind(k.kind);
                if (origin) search(origin, k.kind);
              }}
            >
              {k.label}
            </button>
          ))}
        </div>
        <Segmented
          label="Rayon"
          value={String(radius)}
          onChange={(v) => {
            const r = Number(v) as (typeof RADII)[number];
            setRadius(r);
            if (origin) search(origin, kind, r);
          }}
          options={RADII.map((r) => ({ value: String(r), label: `${r} km` }))}
        />
        <Button block icon="locate" disabled={loading} onClick={locate}>
          {loading ? 'Recherche…' : 'Utiliser ma position'}
        </Button>
        <div className="row">
          <input className="field__control" style={{ flex: 1, minWidth: 0 }} placeholder="ou une ville / adresse" aria-label="Ville ou adresse" value={address} onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && address.trim() && fromAddress()} />
          <Button variant="secondary" disabled={loading || !address.trim()} onClick={fromAddress}>
            Chercher
          </Button>
        </div>
        {origin && !places && !loading && (
          <Button variant="secondary" onClick={() => search(origin)}>
            Chercher autour de ma position enregistrée
          </Button>
        )}
      </div>

      <p className="small muted" style={{ marginBottom: 'var(--space-4)' }}>
        <Icon name="info" size={16} /> Données OpenStreetMap (libres et contributives) : {meta.hint} Votre position n’est envoyée qu’au moment de la recherche et n’est pas conservée par
        EQUIFLOW ailleurs que sur votre téléphone.
      </p>

      {places && !places.length && (
        <EmptyState icon="search" title="Aucun résultat dans ce rayon">
          Élargissez le rayon ou essayez une autre catégorie. Vous pouvez aussi ajouter vos pros à la main.
        </EmptyState>
      )}
      {places && places.length > 0 && (
        <div className="stack">
          {places.map((p) => {
            const known = pros.some((x) => x.osmId === p.osmId);
            return (
              <Card key={p.osmId} className="stack" style={{ gap: 'var(--space-2)' }}>
                <div className="spread">
                  <strong>{p.name}</strong>
                  <Badge>{formatDistance(p.distanceKm)}</Badge>
                </div>
                {p.address && <span className="small muted">{p.address}</span>}
                <div className="row row--wrap">
                  {p.phone && (
                    <a className="btn btn--secondary btn--md" href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}>
                      <Icon name="phone" size={18} /> Appeler
                    </a>
                  )}
                  <a className="btn btn--ghost btn--md" href={`https://maps.apple.com/?ll=${p.lat},${p.lon}&q=${encodeURIComponent(p.name)}`} target="_blank" rel="noreferrer">
                    <Icon name="pin" size={18} /> Carte
                  </a>
                  {known ? <Badge tone="success">Dans mon carnet</Badge> : <Button variant="ghost" icon="plus" onClick={() => addToBook(p)}>Ajouter</Button>}
                </div>
              </Card>
            );
          })}
          <p className="small muted">© contributeurs OpenStreetMap (ODbL).</p>
        </div>
      )}
    </>
  );
}
