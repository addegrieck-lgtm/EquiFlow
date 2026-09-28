import { ComingSoon, PageHeader } from '../../design/components';

export function SessionsPage() {
  return (
    <>
      <PageHeader title="Mes séances" />
      <ComingSoon icon="activity" title="Séances et progression" step="Étape 6">
        Durée, discipline, allures, exercices, ressentis et photos, avec une timeline et vos statistiques de la semaine.
      </ComingSoon>
    </>
  );
}
