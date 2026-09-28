# EQUIFLOW — le copilote numérique du cavalier et de son cheval

Dossier du cheval, soins, documents, séances, dépenses, agenda et assistant IA, dans une seule
application. **0 € d'infrastructure** : application web installable (PWA), publiée sur GitHub Pages,
données stockées sur l'appareil. Aucun serveur, aucun compte, aucun traceur.

> EQUIFLOW aide à organiser le suivi de votre cheval. Il ne remplace pas l'avis d'un vétérinaire
> ni d'un professionnel qualifié.

Cahier des charges complet, roadmap et architecture : [`docs/SPEC.md`](docs/SPEC.md).

## Fonctionnalités (V1)

| Module | Contenu |
|---|---|
| Onboarding | 6 étapes : bienvenue, profil, premier cheval, objectifs, rappels, code facultatif |
| Accueil | « Bonjour {prénom} », journée (rendez-vous + soins à faire), carte du cheval, progression de la semaine, actions rapides, question à l'IA |
| Dossier du cheval | Aperçu, santé (vaccins, vermifuges, traitements, vétérinaire), soins (maréchal, dentiste, ostéo, massage), documents, dépenses, séances ; plusieurs chevaux |
| Échéances | Calcul automatique des prochains soins, intervalles réglables par cheval, statut à jour / bientôt / en retard |
| SCAN | Photo d'une facture → lecture du texte **sur le téléphone** (Tesseract.js) → date, montant, type de soin, cheval, professionnel, rappel détectés → validation → document + soin + dépense + échéance |
| Documents | Classement par catégorie, recherche (y compris dans le texte scanné), date d'expiration, partage |
| Séances | Saisie complète (allures, exercices, difficulté, ressentis, photos/vidéos), **chronomètre en direct par allure**, « refaire la dernière », objectif hebdomadaire, régularité, programme de la semaine ajoutable à l'agenda |
| Progression | Cheval (minutes/semaine, allures, disciplines, ressenti) et cavalier (séances/mois, objectif atteint, exercices) |
| Agenda | Calendrier mensuel, événements récurrents, fait / à faire, centre de rappels, **export vers le Calendrier de l'iPhone (.ics)** avec alertes |
| Dépenses | Ponctuelles ou mensuelles (pension), 12 mois, catégories, **coût réel du cheval** |
| EQUIFLOW AI | Assistant local qui répond à partir des données : chaque information est étiquetée (donnée enregistrée, calcul, suggestion, incertain). Garde-fous santé : jamais de diagnostic, urgence signalée avec bouton d'appel du vétérinaire |
| Professionnels | Carnet, fiche (appel, e-mail, itinéraire), tri par distance, **« Autour de moi »** : vétérinaires et centres équestres proches via OpenStreetMap |
| Recherche globale | Chevaux, soins, documents, séances, pros, dépenses, agenda |
| Données | Export / import JSON (avec fichiers), suppression totale, code de verrouillage (PBKDF2) |

### Limites assumées de la V1 (0 € sans serveur)

- **Notifications** : sur iPhone, une notification push exige un serveur. Les rappels s'affichent dans
  l'app et s'exportent vers le Calendrier de l'iPhone, qui déclenche les alertes.
- **Synchronisation entre appareils** : via export / import en V1, automatique en V1.5 (Supabase gratuit).
- **Annuaire public des professionnels** et réservation : V2. « Autour de moi » utilise les données
  ouvertes d'OpenStreetMap, donc incomplètes (les maréchaux y sont rares).
- **Analyse vidéo** : les vidéos sont stockées avec la séance ; l'analyse assistée par IA arrive en V2.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173 (accessible sur le réseau local grâce à --host)
npm test           # 116 tests (moteurs, IA, SCAN, géolocalisation, données, sauvegarde…)
npm run build      # vérification des types + build de production dans dist/
npm run icons      # régénère icônes et écrans de démarrage iOS (sans dépendance)
```

## Mettre en ligne gratuitement (GitHub Pages)

Chaque push sur `main` lance `.github/workflows/deploy.yml` : tests → build → publication.
Sur iPhone : ouvrir l'URL dans **Safari** → Partager → **Sur l'écran d'accueil**.

## Architecture

```
src/
  app/            App (onboarding, verrouillage, routes), routage par hash, onglets, actions rapides
  design/         tokens (source unique des couleurs), thème clair/sombre, composants, styles
  domain/         modèles + schémas Zod, libellés français
  data/           base IndexedDB (Dexie), dépôt validé, fichiers, lectures réactives, exercices
  services/       moteurs purs et testés :
    reminders     échéances des soins
    expenses      totaux, séries, coût réel
    progress      statistiques de séances
    calendar      récurrences + export iCalendar
    liveSession   chronomètre par allure
    scan/         OCR (Tesseract.js auto-hébergé) + extraction des factures
    ai/           EQUIFLOW AI : périodes, intentions, outils, planificateur, garde-fous
    geo           distances, OpenStreetMap (Nominatim / Overpass)
    actions       opérations multi-tables en transaction (soin + dépense, SCAN, suppressions)
    backup / pin  sauvegarde, restauration, effacement ; code de verrouillage
  features/       un dossier par module (home, horse, documents, sessions, calendar, expenses,
                  pros, assistant, search, onboarding, settings)
public/           manifest, service worker, icônes ; tesseract/ est copié au build
tests/            Vitest
```

Sécurité : CSP stricte injectée au build (aucun script externe ni inline ; seules connexions sortantes :
OpenStreetMap, sur action explicite), polices et moteur OCR embarqués, aucune donnée envoyée à un tiers.
