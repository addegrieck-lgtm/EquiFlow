import { toHash } from '../../app/router';
import { Badge, Card, ListRow, PageHeader, Section } from '../../design/components';
import { ThemePicker } from './ThemePicker';

export function MorePage() {
  return (
    <>
      <PageHeader title="Plus" />

      <Section title="Apparence">
        <ThemePicker />
      </Section>

      <Section title="Mon compte">
        <Card className="card--flush">
          <ListRow icon="user" title="Profil" subtitle="Prénom, rôle, objectifs" trailing={<Badge>Étape 2</Badge>} />
          <ListRow icon="pro" title="Mes professionnels" subtitle="Vétérinaire, maréchal, dentiste…" trailing={<Badge>Étape 10</Badge>} />
          <ListRow icon="bell" title="Rappels" subtitle="Échéances et export Calendrier" trailing={<Badge>Étape 7</Badge>} />
        </Card>
      </Section>

      <Section title="Mes données">
        <Card className="card--flush">
          <ListRow
            icon="shield"
            title="Confidentialité"
            subtitle="Vos données restent sur cet appareil. Aucun serveur, aucun traceur."
          />
          <ListRow icon="download" title="Sauvegarde et export" subtitle="Exporter, importer, tout supprimer" trailing={<Badge>Étape 1</Badge>} />
        </Card>
      </Section>

      <Section title="À propos">
        <Card className="card--flush">
          <ListRow icon="palette" title="Design system" subtitle="Couleurs, typographie, composants" href={toHash('more', 'design')} />
          <ListRow
            icon="info"
            title="EQUIFLOW"
            subtitle={`Version ${import.meta.env.VITE_APP_VERSION} · bêta`}
          />
        </Card>
        <p className="small muted">
          EQUIFLOW aide à organiser le suivi de votre cheval. Il ne remplace pas l’avis d’un vétérinaire ni d’un
          professionnel qualifié.
        </p>
      </Section>
    </>
  );
}
