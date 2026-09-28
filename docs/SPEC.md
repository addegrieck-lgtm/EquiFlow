# EQUIFLOW — Document de cadrage (Phase 1 → 4)

> Le copilote numérique du cavalier et de son cheval.
> Version 0.1 — 28/09/2026 — **à valider avant tout développement.**

**Contrainte fondatrice : 0 € de coût fixe.** Même modèle que MUSCLEOS : application web
installable (PWA), code sur GitHub, publiée gratuitement sur GitHub Pages, données stockées sur
l'appareil. Tout ce qui exige un serveur (partage entre utilisateurs, paiements, annuaire public)
est conçu dès maintenant mais activé plus tard, sur des offres gratuites, sans réécrire l'application.

Légende des chiffres : **[Source]** = donnée publiée par l'organisme cité, à revérifier avant usage
public · **[Estimation]** = ordre de grandeur calculé ou supposé, explicitement hypothétique.

---

## A. Analyse du marché

### A.1 Tailles de marché par pays (ordres de grandeur)

| Pays | Équidés | Cavaliers / licenciés | Organisme de référence |
|---|---|---|---|
| France | ~1 million d'équidés | ~650–700 k licenciés FFE ; pratiquants réels plus nombreux | IFCE (Observatoire), FFE **[Source, à vérifier]** |
| Royaume-Uni | ~700–850 k chevaux | ~1,5–2 M cavaliers réguliers | BETA National Equestrian Survey **[Source, à vérifier]** |
| Allemagne | ~1 M+ chevaux | ~650–700 k membres FN ; 2+ M pratiquants occasionnels | FN (Deutsche Reiterliche Vereinigung) **[Source, à vérifier]** |
| États-Unis | ~6–7 M chevaux | plusieurs millions de propriétaires/cavaliers | American Horse Council (étude 2023) **[Source, à vérifier]** |
| Canada | ~0,8–1 M chevaux | — | Equestrian Canada / études économiques **[Source, à vérifier]** |
| Australie | ~0,9–1 M chevaux | — | études sectorielles, peu de données consolidées **[Estimation]** |
| Pays-Bas | ~400–450 k chevaux | ~150–200 k membres KNHS | KNHS / Sectorraad Paarden **[Source, à vérifier]** |

Ces chiffres ne sont pas assez fiables pour un business plan chiffré. Première tâche business :
récupérer les rapports officiels (IFCE, BETA, FN, AHC) et remplacer chaque ligne par la valeur sourcée.

### A.2 TAM / SAM / SOM

Méthode : on compte des **propriétaires et cavaliers réguliers équipés d'un smartphone**, pas des chevaux.

- **TAM** (monde, abonnements et services numériques pour propriétaires/cavaliers) :
  ~10–15 M de cavaliers réguliers et propriétaires dans les pays à forte culture équestre ×
  ~60–100 €/an de dépense numérique potentielle ≈ **0,6–1,5 Md€/an** **[Estimation]**.
  Ce montant n'inclut pas le GMV des marketplaces (matériel, prestations), qui est bien plus
  élevé mais ne rapporte que la commission.
- **SAM** (France + Belgique + Suisse francophone, puis UK, en français/anglais) :
  ~1,5–2,5 M de pratiquants, dont ~500–800 k propriétaires ou demi-pensionnaires
  **[Estimation]**. C'est la cible réaliste des 3 premières années.
- **SOM** (3 ans) : 1 à 2 % du SAM actif = **10 000 à 30 000 utilisateurs actifs**, dont
  5–8 % payants ≈ 500–2 400 abonnés EQUIFLOW+ ≈ **50–230 k€ d'ARR** **[Estimation]**.
  C'est un plancher de viabilité, pas une promesse.

### A.3 Lecture par pays

- **France** : marché de départ évident (langue, FFE très structurée, forte culture « pension +
  demi-pension »). La demi-pension y est courante : c'est un vrai différenciateur local.
- **Royaume-Uni** : marché le plus mûr numériquement (livery yards, forte dépense par cheval).
  Deuxième marché naturel dès que l'app est traduite en anglais.
- **Allemagne** : très gros marché, clubs puissants (FN), exigence RGPD élevée ; l'approche
  « données sur l'appareil » y est un argument fort. Nécessite une traduction soignée.
- **Pays-Bas** : petit en volume mais très forte densité et adoption numérique ; bon marché test.
- **États-Unis / Canada** : énorme volume, mais concurrence américaine installée, disciplines
  différentes (western, hunter). Pas avant la V3.
- **Australie** : anglophone, bonne culture équestre, bon marché secondaire après le UK.

## B. Concurrents

### B.1 Directs (applis pour cavaliers/propriétaires)

| Concurrent | Ce qu'il fait bien | Faiblesse exploitable |
|---|---|---|
| **Equilab** | Suivi GPS des séances, gratuit, grosse base d'utilisateurs, social léger | Centré sur l'activité ; le dossier du cheval, les dépenses et les documents sont secondaires |
| **Equisense** (FR) | Capteur Motion + appli, analyse des allures | Dépend d'un matériel payant |
| **Seaver** (FR) | Sangle connectée, données précises | Matériel coûteux, cible sport |
| **Ridely** | Exercices et programmes, lien avec les coachs | Peu de gestion administrative et financière du cheval |
| **Ride iQ** | Leçons audio de coachs reconnus | Contenu uniquement, pas de suivi du cheval |
| **Pivo / Pixem** | Caméra qui suit le cavalier (vidéo) | Matériel, pas de dossier ni d'historique |
| Applis de gestion d'écurie (divers éditeurs) | Planning, facturation pour les écuries | Pensées pour la structure, pas pour le propriétaire |

### B.2 Indirects (les vrais concurrents au quotidien)

- **Notes, Excel, WhatsApp, un carnet papier et le passeport** : c'est ce qu'utilisent la plupart
  des propriétaires aujourd'hui. EQUIFLOW doit être plus rapide que noter dans un carnet.
- **Leboncoin, Vinted, groupes Facebook** : matériel d'occasion et demi-pensions.
- **ehorses, Equirodi** : vente de chevaux (hors périmètre, à ne pas attaquer).
- **FFE / SIF, sites d'engagement** : concours et résultats (à intégrer, pas à concurrencer).
- **Doctolib-like pour vétérinaires** : quelques cliniques ont leur propre prise de RDV.

### B.3 SWOT

- **Forces** : approche « dossier complet du cheval » ; aucun matériel requis ; données privées
  sur l'appareil (argument RGPD) ; coût d'infrastructure nul ; IA qui répond à partir de
  l'historique réel du cheval.
- **Faiblesses** : pas de synchronisation entre appareils tant qu'il n'y a pas de serveur ;
  une PWA est moins visible qu'une app de l'App Store ; stockage vidéo limité sur iPhone.
- **Opportunités** : la demi-pension (très française, mal servie) ; les coachs indépendants,
  qui cherchent un outil simple ; les cartes partageables sur Instagram et TikTok.
- **Risques** : Equilab ajoute un vrai dossier de santé ; marché fragmenté et saisonnier ;
  adoption des professionnels lente (vétérinaires et maréchaux peu outillés).

## C. Proposition de valeur

> **« Tout ce qui concerne mon cheval, au même endroit, et une IA qui s'en souvient. »**

1. **Ne plus rien oublier** : vaccins, vermifuges, maréchal, dentiste. Les échéances se
   calculent seules à partir de l'historique.
2. **Savoir ce que coûte vraiment son cheval**, au mois et à l'année, par catégorie.
3. **Garder une trace de sa progression** : séances, ressentis, vidéos, avec une timeline lisible.
4. **Retrouver n'importe quel document en 3 secondes** : passeport, factures, ordonnances.
5. **Poser des questions en langage naturel** (« Quand Spirit a-t-il vu le maréchal ? ») et
   obtenir une réponse sourcée à partir de ses propres données.

Ce qui rend l'usage durable : **l'historique**. Plus il est complet, plus l'app est utile et
moins on la quitte. L'export reste libre à tout moment (confiance, RGPD).

## D. Personas

| Persona | Profil | Besoin n°1 | Frustration actuelle | Fréquence d'usage visée |
|---|---|---|---|---|
| **Camille, 34 ans, propriétaire amateur** | 1 cheval en pension, CSO club, cadre | Ne rien oublier, maîtriser le budget | Factures éparpillées, rappels oubliés | 3–5×/semaine |
| **Léa, 17 ans, demi-pensionnaire** | Monte 2×/semaine un cheval qui n'est pas à elle | Suivre ses séances, progresser | Aucun historique de sa progression | 2–3×/semaine |
| **Thomas, 45 ans, coach indépendant** | 25 élèves, se déplace dans les écuries | Suivre ses élèves, commenter des vidéos | Tout passe par WhatsApp | quotidien (V2) |
| **Dr Martin, vétérinaire équin** | Tournées, clientèle rurale | Être trouvé, remplir son agenda | Appels téléphoniques, oublis de RDV | hebdo (V2) |
| **Écurie des Pins** | 30 boxes, 3 salariés | Planning des soins, facturation | Tableau blanc et Excel | quotidien (V3) |

**Persona prioritaire du MVP : Camille.** Tout le V1 est conçu pour elle.

## E. MVP (V1) — ajusté à la contrainte 0 €

Le prompt maître liste 12 briques. Voici ce qui est **réellement faisable à 0 € et sans serveur**,
et comment chaque brique est adaptée :

| # | Brique demandée | V1 à 0 € | Adaptation honnête |
|---|---|---|---|
| 1 | Authentification | ✅ Profil local + verrouillage par code PIN optionnel | Pas de compte en ligne tant qu'il n'y a pas de serveur. Le modèle de données est déjà prêt pour les comptes. |
| 2 | Profil | ✅ | — |
| 3 | Ajout cheval | ✅ Plusieurs chevaux | Limite « 1 cheval en FREE » désactivée tant qu'il n'y a pas de paiement. |
| 4 | Dossier cheval | ✅ Complet | Santé, maréchal, dentiste, ostéo, vaccins, vermifuges, traitements |
| 5 | Calendrier | ✅ + récurrences + échéances automatiques | — |
| 6 | Séances | ✅ + timeline + photos | Vidéo courte stockée sur l'appareil (analyse en V2) |
| 7 | Dépenses | ✅ + « Coût réel du cheval » | — |
| 8 | Documents | ✅ Photos/PDF sur l'appareil + **SCAN** (OCR dans le navigateur) | OCR Tesseract.js, gratuit, fonctionne hors ligne. L'utilisateur valide toujours ce qui a été détecté. |
| 9 | EQUIFLOW AI | ✅ Moteur local qui interroge les données | Voir section K. Réponses sourcées, sans LLM payant. LLM optionnel (Ollama sur PC ou clé API personnelle). |
| 10 | Notifications | ⚠️ Centre de rappels dans l'app + export calendrier `.ics` | Sur iPhone, une notification push exige un serveur. Solution à 0 € : exporter les échéances vers le Calendrier iOS, qui déclenche lui-même les alertes. |
| 11 | Profils professionnels | ⚠️ **« Mes professionnels »** : carnet de ses propres pros | Un annuaire public nécessite un serveur partagé. |
| 12 | Recherche de professionnels | ⚠️ Recherche dans son carnet + recherche globale dans l'app | L'annuaire public arrive en V1.5 (Supabase gratuit). **Pas de faux annuaire rempli de données inventées.** |

Hors V1, volontairement : vidéo analysée, coach, marketplace, paiements, demi-pension, concours
partagés, communauté.

**Critère de réussite du V1** : Camille saisit tout l'historique de son cheval en moins de
15 minutes et rouvre l'app au moins 3 fois par semaine pendant un mois.

## F. Roadmap

| Version | Contenu | Infrastructure | Coût fixe |
|---|---|---|---|
| **V1 — Mon cheval** | Section E | GitHub Pages, stockage IndexedDB | **0 €** |
| **V1.5 — Compte & sync** | Compte e-mail, synchronisation entre appareils, sauvegarde cloud, **annuaire public des pros** (les pros créent leur fiche), notifications push | Supabase, offre gratuite (Postgres + Auth + Storage) | **0 €** tant que les quotas gratuits suffisent |
| **V2 — Coach & vidéo** | Partage d'une séance avec son coach, commentaires horodatés, programmes ; analyse vidéo assistée (détection du cheval, durée, temps par allure estimé) ; concours perso et palmarès | Supabase + vision dans le navigateur (TensorFlow.js / MediaPipe, gratuits) | 0 € puis quelques €/mois au-delà des quotas |
| **V2.5 — Réservation & paiement** | Réservation de pros, paiement, commissions, abonnements EQUIFLOW+/PRO | Stripe (aucun abonnement, commission par transaction) | Frais Stripe uniquement sur les ventes ; nécessite une structure juridique |
| **V3 — Écosystème** | Market matériel + Smart Listing, demi-pension + matching, communauté, écuries multi-utilisateurs | Supabase payant (~25 $/mois) quand les revenus le justifient | Payé par les revenus |
| **Stores** | Emballage iOS/Android via Capacitor, même code | Compte développeur Apple (99 $/an), Google (25 $ une fois) | Quand il y a des utilisateurs |

## G. Liste complète des écrans

Navigation principale (barre du bas, 5 onglets) : **Accueil · Cheval · Séances · Agenda · Plus**.
Bouton central flottant « + » pour les actions rapides. EQUIFLOW AI est accessible depuis
l'Accueil et depuis un bouton permanent.

### V1

| # | Écran | Objectif | Composants clés | États |
|---|---|---|---|---|
| 1 | Onboarding 1 — Bienvenue | Promesse en une phrase | Logo, visuel, CTA | — |
| 2 | Onboarding 2 — Profil | Rôle (cavalier, propriétaire, coach, pro, écurie) + prénom | Cartes de choix | Coach/pro/écurie : « bientôt, commencez en cavalier » |
| 3 | Onboarding 3 — Premier cheval | Nom, photo, sexe, âge, race, discipline, niveau, lieu | Formulaire court, seul le nom est obligatoire | Photo optionnelle |
| 4 | Onboarding 4 — Objectifs | Objectifs multiples | Chips | — |
| 5 | Onboarding 5 — Rappels | Expliquer les rappels + export Calendrier | Illustration, choix | — |
| 6 | Onboarding 6 — Sécurité | Code PIN optionnel, rappel de sauvegarde | — | — |
| 7 | **Accueil** | Voir sa journée en 5 secondes | « Bonjour {prénom} », Aujourd'hui (séance, soins, RDV, rappels), carte du cheval, progression de la semaine, actions rapides, champ IA | Vide : cartes d'amorçage (« Ajoutez le dernier passage du maréchal ») |
| 8 | Sélecteur de cheval | Changer de cheval actif | Bottom sheet | — |
| 9 | **Fiche cheval** | Tout le dossier | En-tête photo, onglets : Infos · Santé · Soins · Documents · Dépenses · Séances | Chaque onglet a son état vide |
| 10 | Santé — Vaccinations | Historique + prochaine échéance | Liste, badge « à jour / bientôt / en retard » | En retard = badge ambre |
| 11 | Santé — Vermifuges | idem | idem | idem |
| 12 | Santé — Traitements | En cours / terminés, posologie | Liste | — |
| 13 | Santé — Visites vétérinaires | Historique, notes, pièces jointes | Timeline | — |
| 14 | Soins — Maréchal | Dernier/prochain passage, type de ferrure | Carte + historique | Échéance calculée (intervalle réglable, 6–8 semaines par défaut) |
| 15 | Soins — Dentiste / Ostéopathe / autres | idem | idem | — |
| 16 | Formulaire d'intervention (générique) | Saisir tout soin en moins de 20 s | Type, date, pro, montant, notes, pièce jointe, « créer la dépense » coché d'office | Validation |
| 17 | **Documents** | Retrouver un document | Grille par catégorie, recherche | Vide |
| 18 | Visionneuse de document | Voir, partager, supprimer | Zoom, partage iOS | — |
| 19 | **SCAN** | Photo → données | Caméra/fichier, progression OCR, champs détectés **modifiables**, niveau de confiance par champ | Échec OCR → saisie manuelle pré-remplie |
| 20 | **Séances** | Timeline des séances | Liste par semaine, filtres, résumé hebdo | Vide |
| 21 | Nouvelle séance | Saisie rapide | Durée, discipline, type, allures, exercices, difficulté, ressenti cheval/cavalier (1–5), notes, photos, vidéo | Brouillon auto |
| 22 | Détail séance | Relire, modifier | — | — |
| 23 | **Progression** | Cheval et cavalier | Graphiques : séances/semaine, durée, disciplines, régularité, objectifs | < 3 séances : message pédagogique |
| 24 | **Agenda** | Tous les événements | Vues mois/semaine/liste, filtres par type, couleurs | — |
| 25 | Nouvel événement | Créer, avec récurrence | Type, date, heure, récurrence, rappel, cheval, pro | — |
| 26 | **Dépenses** | Budget | Total du mois, moyenne, évolution sur 12 mois, répartition par catégorie, **coût réel mensuel** | Vide |
| 27 | Nouvelle dépense | Saisie en 10 s | Montant, catégorie, date, cheval, récurrente (pension) | — |
| 28 | **EQUIFLOW AI** | Questions en langage naturel | Chat, suggestions de questions, badges de source (Donnée / Calcul / Suggestion / Incertain) | Question hors périmètre → réponse honnête |
| 29 | **Mes professionnels** | Carnet | Liste par métier, appel, e-mail, historique des interventions | Vide |
| 30 | Fiche professionnel | Coordonnées, interventions, dépenses liées | — | — |
| 31 | **Recherche globale** | Tout retrouver | Champ unique, résultats groupés (chevaux, soins, documents, séances, pros, dépenses) | Aucun résultat |
| 32 | Rappels | Centre de rappels | Liste des échéances, « fait », « reporter », export `.ics` | — |
| 33 | Plus / Réglages | — | Profil, chevaux, notifications, IA, PIN, thème, langue, sauvegarde | — |
| 34 | Sauvegarde & données | RGPD | Export JSON (avec/sans fichiers), import, suppression totale | Confirmation forte |
| 35 | Mentions / À propos | Avertissements (pas de diagnostic vétérinaire), licences | — | — |

### V1.5 → V3 (conçus plus tard, listés pour la cohérence)

Connexion / inscription · Synchronisation · Annuaire des pros (liste, carte, filtres) · Fiche pro
publique · Espace pro (profil, prestations, disponibilités) · Enregistrement vidéo · Analyse de
séance · Comparaison de séances · Partage avec son coach · Espace coach (élèves, commentaires,
programmes) · Réservation → paiement → confirmation · Abonnement · Concours & palmarès · Market
(liste, filtres, annonce, Smart Listing, messagerie, favoris) · Demi-pension (annonce, profil
cavalier, matching) · Fil communauté · Challenges · Cartes partageables · Back-office admin.

## H. User flows principaux

1. **Premier lancement (objectif < 2 min)** : Bienvenue → rôle + prénom → cheval (nom seul
   obligatoire) → objectifs → rappels → Accueil avec 3 cartes d'amorçage.
2. **Saisir une facture de maréchal** : `+` → SCAN → photo → OCR détecte « 85 € »,
   « 28/09/2026 », « maréchal » → l'utilisateur confirme → création **en une fois** de
   l'intervention maréchal + de la dépense + du document + de la prochaine échéance
   (+7 semaines, réglable).
3. **Vaccin qui arrive** : à l'ouverture, l'Accueil affiche « Vaccin grippe de Spirit dans
   14 jours » → « Planifier » crée l'événement → « Ajouter au Calendrier iPhone » exporte un
   `.ics` avec alerte J-1.
4. **Séance** : `+` → Séance → durée, discipline, ressenti → enregistrer → la carte
   « Progression de la semaine » se met à jour.
5. **Question à l'IA** : « Combien Spirit m'a coûté depuis janvier ? » → l'IA identifie le
   cheval et la période → calcule à partir des dépenses → répond avec le total, la répartition
   et un lien vers la liste, badge « Calcul sur vos données ».
6. **Changer de téléphone (V1)** : Réglages → Exporter → fichier dans iCloud Drive → nouveau
   téléphone → Importer. (Automatique à partir de la V1.5.)

## I. Architecture technique

### I.1 Choix structurants

| Sujet | Choix | Pourquoi |
|---|---|---|
| Type d'application | **PWA** (web installable) | 0 €, une seule base de code pour iPhone, Android et ordinateur, pas de validation App Store. Emballage Capacitor possible plus tard sans réécriture. |
| Framework | **React 18 + TypeScript strict + Vite** | Même stack que MUSCLEOS, écosystème mature, typage strict. |
| Hébergement | **GitHub Pages** + GitHub Actions (tests → build → déploiement) | Gratuit, HTTPS (obligatoire pour la PWA, la caméra et le mode hors ligne). |
| Stockage | **IndexedDB via Dexie** | Vraies requêtes (index par cheval, par date), fichiers binaires (photos, PDF, vidéos), plusieurs centaines de Mo possibles. `localStorage` serait trop limité. |
| Validation | **Zod** | Schémas partagés entre formulaires, import de sauvegarde et futur serveur. |
| Routage | Routage par hash (léger) | Compatible GitHub Pages sans configuration serveur. |
| Graphiques | SVG maison (comme MUSCLEOS) | Léger, contrôle total du design. |
| OCR | **Tesseract.js** (français + anglais), fichiers de langue hébergés dans l'app | Gratuit, hors ligne, rien n'est envoyé à un tiers. |
| Tests | **Vitest** (moteurs, requêtes, IA locale) + tests de composants | — |
| Backend futur | **Supabase** (Postgres + Auth + Storage + Edge Functions) | Offre gratuite, Postgres standard, sécurité ligne par ligne (RLS), pas d'enfermement propriétaire. |

### I.2 Le principe clé : une couche d'accès aux données interchangeable

```
UI (pages, composants)
   │
Services métier (échéances, coûts, progression, IA, OCR)  ← purs, testés
   │
Repository<T> (interface)
   ├── DexieRepository      ← V1 : IndexedDB, sur l'appareil
   └── SupabaseRepository   ← V1.5 : même interface, synchronisée
```

Chaque enregistrement porte dès le V1 : `id` (UUID), `ownerId`, `createdAt`, `updatedAt`,
`deletedAt` (suppression douce), `version`. La synchronisation V1.5 se fait donc sans migration
lourde (stratégie « le dernier modifié gagne » par enregistrement, suffisante pour un usage
personnel).

### I.3 Structure des dossiers

```
equiflow/
  .github/workflows/deploy.yml     tests → build → GitHub Pages
  docs/SPEC.md                     ce document
  public/                          manifest, service worker, icônes, données de langue OCR
  scripts/                         génération des icônes / écrans de démarrage
  src/
    app/                           App, routes, navigation, providers
    design/                        tokens (couleurs, typo, espacements), composants UI de base
    domain/                        types + schémas Zod (Horse, CareRecord, Expense…)
    data/
      db.ts                        schéma Dexie + migrations versionnées
      repositories/                interface Repository + implémentation Dexie
      reference/                   référentiels : races, disciplines, types de soins, intervalles
    services/
      reminders/                   calcul des échéances (vaccins, vermifuges, maréchal…)
      expenses/                    agrégations, coût réel, moyennes
      progress/                    statistiques de séances
      scan/                        OCR + extraction (date, montant, type, pro)
      ai/                          EQUIFLOW AI : intentions, outils, fournisseurs, garde-fous
      calendar/                    récurrences, export .ics
      backup/                      export / import / suppression totale
    features/                      un dossier par module : onboarding, home, horse, health,
                                   care, documents, sessions, calendar, expenses, pros,
                                   assistant, search, settings
  tests/
```

### I.4 Variables d'environnement

V1 : **aucune clé secrète**, puisque rien ne passe par un serveur. Seulement :

| Variable | Rôle |
|---|---|
| `VITE_APP_VERSION` | Affichée dans Réglages, injectée par le build |
| `VITE_FEATURE_FLAGS` | Activation progressive des modules (`sync`, `video`, `market`…) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | V1.5 (la clé « anon » est publique par conception ; la sécurité repose sur les règles RLS) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | V2.5, **uniquement côté Edge Functions**, jamais dans l'app |
| `AI_PROVIDER_KEY` | Si un LLM hébergé est utilisé un jour : côté serveur uniquement |

La clé API personnelle d'un utilisateur (option IA) reste stockée sur son appareil et n'est
jamais versionnée.

### I.5 Authentification

- **V1** : profil local unique, code PIN optionnel (haché, verrouillage à l'ouverture), sans
  prétention de chiffrement fort. Honnêteté : le PIN protège contre un regard indiscret, pas
  contre quelqu'un qui a accès au téléphone déverrouillé.
- **V1.5** : Supabase Auth (lien magique par e-mail + Sign in with Apple/Google), sessions
  à rafraîchissement automatique, RLS sur chaque table (`owner_id = auth.uid()`), rôles
  (`rider`, `coach`, `pro`, `stable_admin`, `admin`).
- **Partage coach / écurie (V2+)** : table `horse_access` (cheval, utilisateur, rôle, droits
  lecture/écriture, expiration), vérifiée par les règles RLS.

### I.6 Paiements (conçu maintenant, activé en V2.5)

Stripe Connect (comptes « Express » pour les pros) : l'acheteur paie → EQUIFLOW prélève sa
commission (`application_fee`) → le pro reçoit le reste. Remboursements et litiges via l'API
Stripe, factures générées par Stripe. Webhooks traités par une Edge Function qui met à jour
`payments`, `bookings`, `payouts`. Stripe ne facture pas d'abonnement, seulement un pourcentage
par transaction → compatible avec la contrainte 0 € de coût fixe. **Prérequis** : une structure
juridique (micro-entreprise au minimum) et des CGV.

### I.7 Notifications

- **V1** : moteur d'échéances local → centre de rappels + badges sur l'Accueil à chaque
  ouverture + **export `.ics`** (le Calendrier iOS gère les alertes, même app fermée).
- **V1.5** : Web Push (supporté par iOS 16.4+ pour les PWA installées), envoyé par une Edge
  Function planifiée. Préférences fines par type de notification.

### I.8 Sécurité et RGPD

- V1 : aucune donnée ne quitte l'appareil (sauf si l'utilisateur branche lui-même un LLM
  externe, avec un avertissement explicite). C'est l'argument RGPD le plus solide possible.
- Export complet (droit à la portabilité) et suppression totale (droit à l'effacement) dès le V1.
- Content Security Policy stricte, aucune dépendance chargée depuis un CDN à l'exécution,
  pas de traqueur ni d'analytics tiers.
- V1.5+ : RLS partout, stockage des fichiers dans des buckets privés avec URL signées,
  limitation de débit sur les Edge Functions, journal d'audit des accès partagés,
  sauvegardes quotidiennes (incluses chez Supabase), suppression de compte en cascade.

## J. Base de données

Conçue une seule fois, identique en IndexedDB (V1) et en Postgres (V1.5). Colonnes communes à
toutes les tables : `id uuid PK, owner_id, created_at, updated_at, deleted_at, version`.

### J.1 Tables V1 (sur l'appareil)

| Table | Champs principaux | Index |
|---|---|---|
| `profiles` | first_name, role, level, disciplines[], goals[], locale, units, currency, pin_hash | — |
| `horses` | name, photo_file_id, sex, birth_year, breed, color, height_cm, discipline, level, location, sire_number (n° SIRE/UELN), microchip, status (actif/retraité/vendu), is_primary | owner_id |
| `files` | kind (image/pdf/video), mime, size, blob, thumbnail_blob, sha256 | — |
| `horse_documents` | horse_id, file_id, category (passeport, facture, ordonnance, certificat, assurance, concours, autre), title, date, expires_at, extracted_json, tags[] | horse_id, category, date |
| `professionals` | name, trade (véto, maréchal, dentiste, ostéo, masseur, transporteur, pension, groom, photographe, coach, autre), phone, email, address, notes | trade |
| `care_records` | horse_id, **type** (vet_visit, vaccination, deworming, treatment, farrier, dental, osteopath, massage, other), date, professional_id, cost_expense_id, notes, document_ids[], **details** (JSON typé selon le type), next_due_at | horse_id+type+date |
| `medications` | horse_id, care_record_id, name, dosage, frequency, start_date, end_date, withdrawal_notes | horse_id |
| `reminder_rules` | horse_id, care_type, interval_days, advance_notice_days, enabled | horse_id |
| `training_sessions` | horse_id, date, duration_min, discipline, session_type, gaits {walk,trot,canter min}, distance_km, exercises[], difficulty 1–5, horse_feeling 1–5, rider_feeling 1–5, notes, file_ids[], program_id | horse_id+date |
| `goals` | horse_id?, label, target (ex. 12 séances/mois), period, status | — |
| `expenses` | horse_id?, date, amount_cents, currency, category (pension, véto, maréchal, alimentation, matériel, concours, transport, coaching, assurance, soins, autre), label, professional_id, document_id, care_record_id, recurrence_id | horse_id+date, category |
| `recurrences` | rrule (RFC 5545), start, end, target_table, template_json | — |
| `calendar_events` | horse_id?, type (entraînement, concours, véto, maréchal, dentiste, ostéo, vaccination, vermifuge, transport, coach, autre), title, starts_at, ends_at, all_day, recurrence_id, professional_id, linked_record_id, reminder_minutes[], status | starts_at, type |
| `reminders` | source (rule/event/manual), horse_id, due_at, title, status (pending/done/snoozed/dismissed), snoozed_until | due_at+status |
| `ai_conversations` | title, horse_id? | — |
| `ai_messages` | conversation_id, role, content, tool_calls_json, sources_json, created_at | conversation_id |
| `app_settings` | clé/valeur : thème, IA, notifications, dernière sauvegarde | — |

Choix : les soins sont regroupés dans `care_records` avec un champ `details` typé (validé par
Zod selon `type`) plutôt que 8 tables quasi identiques. Les vues « vaccinations »,
« vermifuges », « maréchal »… sont des filtres. En Postgres, on garde la même table (avec un
`CHECK` sur `type`) ou on crée des vues SQL portant les noms du prompt maître.

### J.2 Tables ajoutées en V1.5 → V3 (Postgres/Supabase)

- **Comptes et accès** : `users` (Supabase Auth), `horse_access`, `organizations` (écuries),
  `organization_members`, `devices`, `push_subscriptions`, `notification_preferences`,
  `notifications`, `audit_log`.
- **Pros et réservation** : `professional_profiles` (fiche publique, zone, géolocalisation),
  `professional_services`, `availability` (créneaux et exceptions), `bookings`, `reviews`.
- **Coach et vidéo** : `training_videos` (stockage, durée, statut d'analyse),
  `video_analyses` (résultats du modèle, version du modèle, confiance), `coach_comments`
  (timestamp dans la vidéo), `training_programs`, `program_sessions`, `coach_clients`.
- **Paiements et abonnements** : `plans` (prix configurables depuis l'admin),
  `subscriptions`, `payments`, `refunds`, `payouts`, `commission_rules` (taux par type de
  transaction), `invoices`.
- **Marketplace** : `marketplace_listings`, `listing_photos`, `favorites`, `saved_searches`,
  `marketplace_orders`, `conversations`, `messages`, `reports` (signalements).
- **Demi-pension** : `half_lease_listings`, `rider_profiles`, `half_lease_matches` (score,
  explication).
- **Concours** : `competitions`, `competition_entries`, `competition_results`.
- **Communauté** : `posts`, `follows`, `likes`, `comments`, `challenges`, `challenge_participants`.
- **Admin** : `admin_roles`, `content_pages`, vues matérialisées pour les indicateurs (DAU/MAU,
  GMV, commissions, rétention).

## K. Architecture IA — EQUIFLOW AI

### K.1 Principe : l'IA ne voit jamais toute la base

```
Question  →  1. Compréhension (intention + entités : cheval, période, type de soin)
          →  2. Outils internes (requêtes typées sur les données autorisées)
          →  3. Calculs déterministes (sommes, moyennes, dates)
          →  4. Rédaction de la réponse + étiquetage des sources
          →  5. Garde-fous (santé, incertitude)
```

**Outils internes** (identiques pour le moteur local et pour un futur LLM, sous forme de
« function calling ») :

`find_horse(name)` · `get_care_history(horse, type, period)` · `get_next_due(horse, type)` ·
`sum_expenses(horse, period, category?)` · `list_sessions(horse, period, limit)` ·
`summarize_sessions(ids)` · `list_events(period, type?)` · `find_professionals(trade)` ·
`search_documents(query)` · `plan_training_week(horse, goals, constraints)`.

Chaque outil n'accède qu'aux données de l'utilisateur (V1 : l'appareil ; V1.5 : filtrées par
`owner_id` et `horse_access`).

### K.2 Trois niveaux de « cerveau », tous à 0 €

1. **Moteur local (par défaut, V1)** : reconnaissance d'intentions en français et en anglais
   (règles + synonymes + extraction de dates comme « depuis janvier », « la semaine
   prochaine »), puis appel des outils et réponse rédigée à partir de modèles. Il couvre les
   questions du prompt maître : dernier passage du maréchal, coût depuis janvier, soins de la
   semaine, résumé des 5 dernières séances, semaine d'entraînement type. Rapide, hors ligne,
   exact, testable.
2. **Ollama (optionnel)** : un LLM gratuit qui tourne sur le PC de l'utilisateur, comme dans
   MUSCLEOS. Il reformule et gère les questions libres, mais les chiffres viennent toujours
   des outils.
3. **Clé API personnelle (optionnel)** : l'utilisateur peut brancher sa propre clé (par ex.
   Claude). Avertissement explicite : dans ce cas, les données nécessaires à la réponse sont
   envoyées au fournisseur.

Plus tard (V2+, avec revenus) : LLM hébergé côté serveur, réservé à EQUIFLOW+.

### K.3 Étiquetage obligatoire de chaque réponse

- 🟢 **Donnée enregistrée** : « Dernier passage du maréchal : 28/09/2026 (Jean Dupont). »
- 🔵 **Calcul** : « 1 842 € depuis le 1er janvier, soit 204 €/mois en moyenne. »
- 🟡 **Suggestion** : « Proposition de semaine : mardi transitions 35 min… »
- ⚪ **Incertain / manquant** : « Aucune visite de dentiste enregistrée : je ne peux pas
  estimer la prochaine. »

### K.4 Garde-fous santé

- Détection de sujets médicaux (boiterie, colique, fièvre, plaie, toux, amaigrissement…).
- Réponse : information générale uniquement + « contactez votre vétérinaire » ; pour les
  signes d'urgence (colique, cheval couché qui se roule, hémorragie…), message d'urgence en
  premier, avec un bouton d'appel vers le vétérinaire du carnet.
- Jamais de diagnostic, jamais de posologie de médicament.
- Tests automatisés dédiés sur ces garde-fous.

### K.5 Mémoire

- **Mémoire par cheval** = son dossier structuré (rien à « mémoriser » en plus : l'IA
  interroge).
- **Historique conversationnel** stocké dans `ai_conversations` / `ai_messages`, avec
  suppression possible.
- Pas de recherche vectorielle en V1 (inutile sur des données structurées). En V2, recherche
  plein texte sur les notes et documents OCR.

### K.6 SCAN (OCR)

Tesseract.js dans un Web Worker → texte brut → extracteurs (dates FR/EN, montants en €,
mots-clés de métier « maréchal », « ferrure », « vaccin », « vermifuge », nom du cheval
reconnu parmi ses chevaux, n° SIRET du pro) → score de confiance par champ → **validation
par l'utilisateur obligatoire** → création liée intervention + dépense + document + échéance.

### K.7 Vidéo (V2, préparé)

Enregistrement via l'API MediaRecorder. Analyse **dans le navigateur** : détection du cheval
et du cavalier (le modèle COCO-SSD reconnaît la classe « cheval »), trajectoire approximative
dans la carrière, durée, segments d'activité, puis estimation des allures à partir de la vitesse
de déplacement. Présenté comme **« Analyse assistée par IA — estimation »** avec un niveau de
confiance, jamais comme une analyse biomécanique.

## L. Modèle économique

| Source | Quand | Principe |
|---|---|---|
| Gratuit | V1 | Tout est gratuit pendant la bêta : l'objectif est l'usage et l'historique. |
| **EQUIFLOW+** (~7,99 €/mois ou ~69 €/an) | V2.5 | Plusieurs chevaux, IA avancée, analyse vidéo, sync illimitée, stockage |
| **PRO** (29–59 €/mois) | V2.5 | Coachs et pros : clients, planning, réservations, facturation |
| Commission réservations | V2.5 | ~5–10 % ou frais fixes côté client **[Estimation, à tester]** |
| Commission marketplace | V3 | ~5–8 % sur le matériel vendu **[Estimation]** |
| Demi-pension | V3 | Frais de mise en relation ou d'annonce premium |
| Partenariats | V3 | Assurances, alimentation, sellerie (offres contextuelles, jamais de revente de données) |
| Écuries | V3 | Tarif par box ou par structure |

Tous les prix vivent dans une table `plans` modifiable depuis l'administration, jamais en dur.

## M. Stratégie d'acquisition

1. **100 bêta-testeurs** : son propre réseau d'écurie, 3–5 écuries locales, groupes Facebook
   de propriétaires, coachs connus. Un groupe WhatsApp bêta, un retour hebdomadaire.
   L'application gratuite sur GitHub Pages permet de démarrer **dès la fin du V1**.
2. **1 000 utilisateurs** : contenu TikTok/Instagram « le vrai coût d'un cheval » (très
   partageable, alimenté par la fonction Dépenses), cartes partageables (« Ma progression en
   30 jours », « Mon cheval du mois »), présence dans les concours clubs.
3. **10 000 utilisateurs** : programme **EQUIFLOW RIDERS** (ambassadeurs : accès anticipé,
   badge, code parrainage, EQUIFLOW+ offert), partenariats avec des coachs qui imposent l'app
   à leurs élèves (V2), micro-influenceurs équestres (5–50 k abonnés, meilleur engagement).
4. **International** : UK puis Pays-Bas/Allemagne, localisation complète, ambassadeurs locaux.

**Viralité intégrée au produit** : cartes au format story générées dans l'app (sans serveur,
rendu canvas), challenges (« 20 séances en 30 jours »), récapitulatif de concours, bilan annuel
« Spirit en 2026 ».

## N. Risques

| Risque | Impact | Réponse |
|---|---|---|
| Perte de données (téléphone perdu, stockage vidé par iOS) | **Critique** en V1 | Stockage persistant demandé au navigateur, rappel de sauvegarde mensuel, export en un clic ; sync V1.5 en priorité |
| iOS limite le stockage des PWA / des vidéos | Élevé | Compression des photos, vidéos courtes en V1, stockage cloud en V2 |
| Notifications limitées sans serveur | Moyen | Export `.ics` + rappels à l'ouverture ; push en V1.5 |
| Faible adoption des pros | Élevé pour V2 | Commencer par le carnet de l'utilisateur ; faire venir les pros par la demande de leurs clients |
| Responsabilité santé (conseil mal interprété) | Élevé | Garde-fous, mentions, pas de diagnostic, tests dédiés |
| OCR peu fiable (factures manuscrites) | Moyen | Validation systématique, saisie manuelle pré-remplie |
| Surconstruction | Élevé | Règle fondamentale n°43 appliquée à chaque décision ; V1 limité à la section E |
| Quotas gratuits dépassés (V1.5+) | Faible au début | Surveillance ; bascule payante seulement avec des revenus |
| Marque « EQUIFLOW » déjà déposée | À vérifier | Recherche INPI / EUIPO avant communication publique |

## O. Plan de développement V1

Chaque étape se termine par : tests verts, build OK, vérification mobile (375 px), revue sécurité.

| Étape | Contenu | Livrable vérifiable |
|---|---|---|
| **0. Socle** | Projet Vite/React/TS strict, design system (tokens, composants), navigation, PWA (manifest, service worker, icônes), workflow GitHub Pages | Coquille installable sur iPhone, en ligne sur GitHub Pages |
| **1. Données** | Schéma Dexie, repositories, schémas Zod, export/import/suppression | Tests CRUD + aller-retour d'export |
| **2. Onboarding + cheval** | Onboarding 6 étapes, fiche cheval, multi-chevaux | Premier cheval créé en < 2 min |
| **3. Santé & soins** | `care_records`, vaccins, vermifuges, traitements, maréchal, dentiste, ostéo, moteur d'échéances | Tests des échéances (intervalles, retards) |
| **4. Documents + SCAN** | Stockage fichiers, visionneuse, OCR, extraction, création liée | Tests des extracteurs sur un jeu de factures types |
| **5. Dépenses** | Saisie, récurrence (pension), agrégations, coût réel | Tests des agrégations |
| **6. Séances + progression** | Saisie, timeline, graphiques cheval/cavalier | — |
| **7. Agenda + rappels** | Calendrier, récurrences RFC 5545, centre de rappels, export `.ics` | Import réel dans le Calendrier iPhone |
| **8. Accueil** | Dashboard intelligent, actions rapides, états vides | — |
| **9. EQUIFLOW AI** | Intentions, outils, étiquetage, garde-fous, option Ollama / clé perso | Tests : 30+ questions types, garde-fous santé |
| **10. Pros + recherche** | Carnet de pros, recherche globale | — |
| **11. Finition** | Accessibilité (contrastes, tailles tactiles, VoiceOver), performance, textes | Audit Lighthouse, test sur iPhone réel |

---

## Design system (Phase 4, résumé)

- **Couleurs** : noir profond `#0E0F0D` · blanc cassé `#F5F1EA` · vert forêt `#1F3D2B` (couleur
  de marque) · sable `#D8C7A6` · accent doré discret `#B8964E` (réservé aux moments premium et
  aux badges) · sémantiques : succès vert sauge, alerte ambre, erreur terracotta. Thème clair
  (fond blanc cassé) et sombre (fond noir profond).
- **Typographie** : titres en serif élégant (*Fraunces*, libre) pour l'identité « équestre
  premium » ; interface en *Inter* (libre, très lisible). Polices embarquées dans l'app (hors
  ligne, pas de Google Fonts à l'exécution).
- **Espacements** : grille de 4 px (4, 8, 12, 16, 24, 32, 48) ; marges latérales de 20 px ;
  rayons de 12 px (cartes) et 999 px (chips) ; zones tactiles ≥ 44 px.
- **Composants** : Button (primaire, secondaire, fantôme, danger), Card, HorseCard, StatTile,
  Badge d'échéance (à jour, bientôt, en retard), Chip, Input, Select, DatePicker, BottomSheet,
  TabBar, FAB « + », Timeline, EmptyState illustré, Toast, SourceBadge (IA).
- **Logo** : monogramme « E » dont la barre centrale forme une courbe de mouvement, évoquant
  une encolure ou une trajectoire de carrière ; vert forêt sur blanc cassé, filet doré.
  Déclinaisons icône d'app, favicon, écrans de démarrage iOS.

---

## Décisions à valider

1. **Stack 0 €** : PWA React/TS sur GitHub Pages, données sur l'appareil (comme MUSCLEOS).
2. **Adaptations du V1** : notifications par export Calendrier, « Mes professionnels » à la
   place d'un annuaire public, IA locale (+ Ollama / clé perso optionnels).
3. **V1.5 Supabase gratuit** pour la sync et l'annuaire, quand tu le décideras.
4. **Nom du dépôt GitHub** (proposition : `EquiFlow`, sur le compte `addegrieck-lgtm`).
