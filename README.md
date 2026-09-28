# EQUIFLOW — le copilote numérique du cavalier et de son cheval

Dossier du cheval, soins, documents, séances, dépenses, agenda et assistant IA, dans une seule
application. **0 € d'infrastructure** : application web installable (PWA), publiée sur GitHub Pages,
données stockées sur l'appareil. Aucun serveur, aucun compte, aucun traceur.

> EQUIFLOW aide à organiser le suivi de votre cheval. Il ne remplace pas l'avis d'un vétérinaire
> ni d'un professionnel qualifié.

Cahier des charges complet, roadmap et architecture : [`docs/SPEC.md`](docs/SPEC.md).

## État d'avancement (V1)

| Étape | Contenu | État |
|---|---|---|
| 0 | Socle : design system, navigation, PWA, déploiement | ✅ |
| 1 | Données (IndexedDB), export / import / suppression | à venir |
| 2 | Onboarding + fiche cheval | à venir |
| 3 | Santé & soins, échéances | à venir |
| 4 | Documents + SCAN (OCR) | à venir |
| 5 | Dépenses, coût réel du cheval | à venir |
| 6 | Séances + progression | à venir |
| 7 | Agenda + rappels + export Calendrier | à venir |
| 8 | Accueil intelligent | à venir |
| 9 | EQUIFLOW AI | à venir |
| 10 | Mes professionnels + recherche | à venir |
| 11 | Finition, accessibilité, performance | à venir |

Les modules pas encore construits affichent « En construction · Étape N » : rien n'est simulé.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173 (accessible sur le réseau local grâce à --host)
npm test           # tests (contrastes du design system, routage…)
npm run build      # vérification des types + build de production dans dist/
npm run icons      # régénère icônes et écrans de démarrage iOS (sans dépendance)
```

## Mettre en ligne gratuitement (GitHub Pages)

1. Pousser le dépôt sur GitHub (branche `main`).
2. *Settings → Pages → Source : **GitHub Actions***.
3. Le workflow `.github/workflows/deploy.yml` teste, construit et publie à chaque push.
4. Sur iPhone : ouvrir l'URL dans **Safari** → Partager → **Sur l'écran d'accueil**.

Le mode hors ligne (service worker) exige HTTPS, fourni par GitHub Pages.

## Architecture

```
src/
  app/            App, routage par hash, barre d'onglets, actions rapides
  design/
    tokens.ts     source unique : couleurs (clair/sombre), espacements, rayons, typographie
    theme.ts      génère les variables CSS depuis les tokens, préférence clair/sombre/auto
    global.css    styles des composants
    components/   Button, Card, ListRow, StatTile, Badge, DueBadge, Chip, TextField,
                  SelectField, BottomSheet, PageHeader, Section, EmptyState, Icon, Logo
  features/       un dossier par module (home, horse, sessions, calendar, settings…)
public/           manifest, service worker, icônes, écrans de démarrage iOS
scripts/          générateur d'icônes (même géométrie que le logo de l'app)
tests/            Vitest
```

Sécurité : politique CSP stricte injectée au build (aucune ressource externe, aucun script inline),
polices embarquées (pas de Google Fonts à l'exécution), aucune dépendance chargée depuis un CDN.
