import { useState } from 'react';
import { toHash } from '../../app/router';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Chip,
  DueBadge,
  EmptyState,
  Icon,
  IconButton,
  ListRow,
  LogoMark,
  PageHeader,
  Section,
  SelectField,
  StatTile,
  TextField,
  type IconName,
} from '../../design/components';
import { colors } from '../../design/tokens';

const kebab = (s: string) => s.replace(/[A-Z0-9]/g, (m) => `-${m.toLowerCase()}`);
const ICONS: IconName[] = ['home', 'horseshoe', 'activity', 'calendar', 'health', 'document', 'scan', 'euro', 'sparkle', 'camera', 'video', 'bell', 'pro', 'search', 'shield', 'user'];
const GOALS = ['Progresser', 'Concours', 'Dressage', 'Saut', 'Loisir', 'Extérieur'];

/** Vitrine vivante du design system : chaque composant rendu dans le thème courant. */
export function DesignSystemPage() {
  const [sheet, setSheet] = useState(false);
  const [goals, setGoals] = useState<string[]>(['Progresser']);
  const [name, setName] = useState('');

  return (
    <>
      <PageHeader title="Design system" eyebrow="EQUIFLOW" backHref={toHash('more')} />

      <Section title="Marque">
        <div className="row">
          <LogoMark size={64} />
          <div>
            <p className="display">Equiflow</p>
            <p className="small muted">Premium équestre · moderne · fiable</p>
          </div>
        </div>
      </Section>

      <Section title="Couleurs (thème courant)">
        <div className="swatch-grid">
          {(Object.keys(colors.light) as (keyof typeof colors.light)[])
            .filter((k) => k !== 'overlay')
            .map((k) => (
              <div className="swatch" key={k}>
                <div className="swatch__chip" style={{ background: `var(--color-${kebab(k)})` }} />
                <span>{k}</span>
              </div>
            ))}
        </div>
      </Section>

      <Section title="Typographie">
        <Card className="stack">
          <p className="display">Fraunces — titres</p>
          <p className="page-header__title">Titre de page</p>
          <p>Inter — texte courant, lisible et neutre, pensé pour l’écran.</p>
          <p className="small muted">Texte secondaire · 14 px</p>
        </Card>
      </Section>

      <Section title="Boutons">
        <div className="stack">
          <Button size="lg" block icon="plus">
            Ajouter une séance
          </Button>
          <div className="row row--wrap">
            <Button variant="secondary">Secondaire</Button>
            <Button variant="ghost">Fantôme</Button>
            <Button variant="danger">Supprimer</Button>
            <Button disabled>Désactivé</Button>
            <IconButton icon="search" label="Rechercher" />
          </div>
        </div>
      </Section>

      <Section title="Badges & puces">
        <div className="row row--wrap">
          <DueBadge status="ok" />
          <DueBadge status="soon" />
          <DueBadge status="overdue" />
          <Badge tone="brand">Dressage</Badge>
          <Badge tone="gold">EQUIFLOW+</Badge>
          <Badge>Brouillon</Badge>
        </div>
        <div className="row row--wrap">
          {GOALS.map((g) => (
            <Chip
              key={g}
              selected={goals.includes(g)}
              onToggle={() => setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))}
            >
              {g}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Champs">
        <Card className="stack">
          <TextField
            label="Nom du cheval"
            placeholder="Spirit"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={name.length > 40 ? '40 caractères maximum' : undefined}
            hint="Seul champ obligatoire"
          />
          <SelectField
            label="Discipline"
            options={[
              { value: 'cso', label: 'Saut d’obstacles' },
              { value: 'dressage', label: 'Dressage' },
              { value: 'cce', label: 'Concours complet' },
              { value: 'loisir', label: 'Loisir / extérieur' },
            ]}
          />
        </Card>
      </Section>

      <Section title="Cartes & listes">
        <div className="stat-grid">
          <StatTile label="Séances cette semaine" value="4" hint="+1 vs semaine dernière" />
          <StatTile label="Coût du mois" value="660 €" hint="Exemple" />
        </div>
        <Card className="card--flush">
          <ListRow icon="health" title="Vaccin grippe" subtitle="Dans 14 jours" trailing={<DueBadge status="soon" />} />
          <ListRow icon="horseshoe" title="Maréchal-ferrant" subtitle="28/09/2026 · 85 €" onClick={() => undefined} />
        </Card>
      </Section>

      <Section title="État vide">
        <EmptyState icon="document" title="Aucun document" action={<Button icon="scan">Scanner un document</Button>}>
          Passeport, factures, ordonnances : tout sera ici.
        </EmptyState>
      </Section>

      <Section title="Icônes">
        <Card>
          <div className="row row--wrap" style={{ color: 'var(--color-brand-text)' }}>
            {ICONS.map((i) => (
              <Icon key={i} name={i} label={i} />
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Feuille modale">
        <Button variant="secondary" onClick={() => setSheet(true)}>
          Ouvrir une bottom sheet
        </Button>
        <BottomSheet open={sheet} title="Exemple" onClose={() => setSheet(false)}>
          <p className="muted" style={{ marginBottom: 'var(--space-4)' }}>
            Les actions secondaires s’ouvrent ici, sans quitter l’écran.
          </p>
          <Button block onClick={() => setSheet(false)}>
            Compris
          </Button>
        </BottomSheet>
      </Section>
    </>
  );
}
