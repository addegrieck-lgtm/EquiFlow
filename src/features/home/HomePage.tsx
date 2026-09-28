import { QuickActionsGrid } from '../../app/QuickActionsSheet';
import { Card, ComingSoon, Icon, PageHeader, Section, Wordmark } from '../../design/components';

function greeting(date: Date): string {
  const h = date.getHours();
  return h >= 18 || h < 5 ? 'Bonsoir' : 'Bonjour';
}

export function HomePage() {
  const now = new Date();
  const today = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <Wordmark />
      </div>
      {/* Le prénom viendra du profil créé à l'onboarding (étape 2). */}
      <PageHeader eyebrow={today.charAt(0).toUpperCase() + today.slice(1)} title={`${greeting(now)} 👋`} />

      <Section title="Mon cheval">
        <ComingSoon icon="horseshoe" title="Ajoutez votre premier cheval" step="Étape 2">
          Photo, race, âge, discipline : son dossier complet commence ici.
        </ComingSoon>
      </Section>

      <Section title="Aujourd’hui">
        <ComingSoon icon="bell" title="Séances, soins et rappels" step="Étapes 7–8">
          Votre journée en un coup d’œil : prochaine séance, prochains soins, rendez-vous.
        </ComingSoon>
      </Section>

      <Section title="Actions rapides">
        <QuickActionsGrid />
      </Section>

      <Section title="EQUIFLOW AI">
        <Card className="card--brand stack">
          <div className="row">
            <Icon name="sparkle" />
            <strong>Posez vos questions sur votre cheval</strong>
          </div>
          <p className="small" style={{ opacity: 0.85 }}>
            « Quand Spirit a-t-il vu le maréchal ? » · « Combien m’a-t-il coûté depuis janvier ? » — des réponses
            calculées à partir de vos propres données, qui restent sur votre téléphone.
          </p>
          <span className="small" style={{ opacity: 0.85 }}>
            Disponible à l’étape 9
          </span>
        </Card>
      </Section>
    </>
  );
}
