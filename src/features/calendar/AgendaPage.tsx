import { ComingSoon, PageHeader } from '../../design/components';

export function AgendaPage() {
  return (
    <>
      <PageHeader title="Agenda" />
      <ComingSoon icon="calendar" title="Calendrier et rappels" step="Étape 7">
        Entraînements, concours, vétérinaire, maréchal, vaccins, vermifuges : les échéances se calculent seules et
        s’ajoutent au Calendrier de votre iPhone.
      </ComingSoon>
    </>
  );
}
