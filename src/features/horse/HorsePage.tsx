import { ComingSoon, PageHeader } from '../../design/components';

export function HorsePage() {
  return (
    <>
      <PageHeader title="Mon cheval" />
      <ComingSoon icon="horseshoe" title="Le dossier du cheval" step="Étapes 2 à 4">
        Informations, santé, vaccins, vermifuges, maréchal, dentiste, ostéopathe et documents : tout son historique au
        même endroit.
      </ComingSoon>
    </>
  );
}
