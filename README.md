# Yallah

> Swipe en groupe pour décider d'activités. Premier cas d'usage : voyage à l'île Maurice — novembre 2026, 9 personnes, 201 activités à départager.

[Yallah](https://yallah.vercel.app) (à venir) est une mini-app mobile-first qui adapte la mécanique Tinder/Bumble au choix d'activités en groupe. Chacun swipe sur son téléphone, et on compare les coups de cœur en se montrant les écrans.

## Mécanique de swipe

| Geste | Action |
|---|---|
| → droite | 👍 OUI, partant |
| ← gauche | 👎 NON |
| ↑ haut | 🤷 WHY NOT (neutre) |
| ↓ bas | ⭐ SUPER LIKE (5 max par personne) |

- **Boutons** en bas comme alternative aux gestes
- **Undo** pour annuler le dernier swipe (gestion du super-like sans stress)
- **Tap court** sur la carte → ouvre la vue détail plein écran avec carousel de 12 photos, lightbox, et boutons de vote
- **Quota super-like** : le 6ᵉ super-like est silencieusement converti en "oui" avec un toast d'avertissement
- **Persistance locale** : tes votes survivent à un reload. Pas de backend en v1.

## Stack

- **Frontend** : React 19, TypeScript 5.9, Vite 8
- **Styling** : Tailwind CSS 3.4 (palette `yallah-*` + keyframes custom)
- **State** : React hooks + `useLocalStorage` (pas de Redux/Zustand)
- **Tests** : Vitest + @testing-library/react (101 tests) + Playwright (10 e2e)
- **Lint** : ESLint flat config + typescript-eslint
- **Déploiement** : Vercel (SPA + CSP headers via `vercel.json`)
- **Pas de BDD, pas d'auth** dans le v1

## Commands

```bash
npm install              # Install deps
npm run dev              # Vite dev server (http://localhost:5173)
npm run build            # tsc -b && vite build
npm run preview          # Preview the production build
npm test                 # Vitest unit tests
npm run test:watch       # Vitest watch mode
npm run test:e2e         # Playwright e2e
npm run lint             # ESLint
npm run parse:activities # Re-parse activites-maurice.md → src/data/activities.json
```

## Structure

```
yallah/
├── activites-maurice.md      # Source de vérité des 201 activités (markdown curé à la main)
├── claude-design/            # Bundle de design exporté de claude.ai/design
├── specs/
│   └── todo.md               # Liste de tâches + checkboxes
├── scripts/
│   ├── parse-activities.ts   # Parse le markdown → JSON
│   └── parse-activities.test.ts
├── src/
│   ├── App.tsx               # Orchestrateur (state + composition)
│   ├── main.tsx
│   ├── components/           # 16 composants + tests colocalisés
│   ├── hooks/                # useLocalStorage
│   ├── icons/                # SVG components typés
│   ├── constants/            # swipe (thresholds, durées)
│   ├── utils/                # swipe (drag math), theme (palette), photos (LoremFlickr URLs)
│   ├── types/                # Activity, Verdict
│   ├── data/
│   │   ├── activities.ts     # Exporte ACTIVITIES typé
│   │   └── activities.json   # Généré par parse:activities
│   └── test/setup.ts
├── e2e/                      # Playwright specs
└── vercel.json
```

## Photos

Les photos sont servies depuis le CDN **Pexels** (gratuit, pas de bande passante limitée à notre échelle). Pour chaque activité on stocke 12 URLs dans `src/data/photos.json` ; le carousel et le hero piochent dedans. Tant que ce fichier est vide, l'app affiche `public/photos/hero.jpg` (la photo de récif bundlée) en placeholder.

### Régénérer les URLs (script `fetch:photos`)

1. Crée un compte sur [pexels.com/api](https://www.pexels.com/api/) (30s, gratuit), récupère ta clé
2. Crée un `.env` à la racine (copie `.env.example` puis remplace la valeur) :
   ```bash
   cp .env.example .env
   # puis édite .env pour y mettre ta vraie clé Pexels
   ```
3. Lance :
   ```bash
   npm run fetch:photos
   ```
4. Le script interroge Pexels pour chaque activité (mot-clé auto depuis le titre + catégorie), sauve les URLs dans `src/data/photos.json` après chaque appel, et reprend où il s'est arrêté à la prochaine exécution.

> `.env` est déjà gitignored. Si tu préfères ne pas créer de fichier, tu peux toujours passer la clé inline : `PEXELS_API_KEY=xxx npm run fetch:photos`.

> Pexels limite à **200 req/h sur fenêtre glissante**. Avec 201 activités, le run prend ~1h dans tous les cas, mais en mode burst (défaut) tu as ~200 activités peuplées en ~1 minute, puis le script attend que la fenêtre se libère pour faire la 201ᵉ. Quand Pexels renvoie un 429, le script lit le header `X-Ratelimit-Reset` et attend exactement le temps qu'il faut.

```bash
PEXELS_API_KEY=xxx npm run fetch:photos
```

Laisse tourner. Le script affiche en live ce qu'il fait, sauve `photos.json` après chaque activité, et reprend où il s'est arrêté si tu l'interromps.

Flags utiles :
- `--throttle=Nms` — pause entre les appels (défaut `300`). Mettre `19000` pour une cadence régulière sans 429.
- `--max=N` — stop après N succès et exit proprement
- `--only=a012,a045` — ne fetch que ces ids
- `--force` — refetch tout, même les entrées existantes

### Voir le résultat (`preview:photos`)

Pour vérifier d'un coup d'œil ce que Pexels a renvoyé pour chaque activité (et repérer celles à customiser) :

```bash
npm run preview:photos
```

Génère `preview-photos.html` à la racine et l'ouvre dans ton navigateur. Page autonome (offline OK une fois chargée), une section par activité avec :
- N°, titre, badges 💎 / 🗝️
- Query Pexels utilisée (en mono, badge `auto` ou `custom`)
- Status `12 / 12` vert, `8 / 12` orange, ou `aucune photo` corail
- Grille de 12 vignettes 240×240 cliquables (ouvre la photo en taille réelle)

Workflow pour personnaliser : tu repères une activité où les photos sont moches, tu ajoutes une override dans `scripts/photo-queries.json` (`"a017": "submarine mauritius diving"`), tu fais `npm run fetch:photos -- --force --only=a017`, puis `npm run preview:photos` pour revoir.

> `preview-photos.html` est gitignoré (regénéré à la demande).

### Personnaliser certaines activités

Deux options :

- **Forcer un mot-clé** : édite `scripts/photo-queries.json` puis relance `npm run fetch:photos -- --force --only=a012,a045`
- **URLs custom** : édite directement `src/data/photos.json` et mets ce que tu veux (URLs Pexels d'autres recherches, photos perso hébergées ailleurs, paths locaux dans `/public/photos/`, etc.). Le script `fetch:photos` ne touche QUE les activités qui n'ont pas encore d'entrée, donc tes URLs custom sont préservées.

## Déploiement

Push vers GitHub puis lier le repo à un projet Vercel — pas de variables d'environnement à configurer en v1. La config dans `vercel.json` ajoute des en-têtes de sécurité (CSP, X-Frame-Options, etc.) et redirige les routes inconnues vers `index.html` (SPA).

## Installer sur ton téléphone (mode "app")

L'app est une **PWA** : ajoutée à l'écran d'accueil, elle s'ouvre en plein écran sans barre d'adresse, comme une vraie app native.

### iPhone / iPad (Safari uniquement)

1. Ouvre l'URL Vercel dans **Safari** (Chrome ne propose pas l'ajout)
2. Tape le bouton **Partager** (carré avec flèche, en bas au centre)
3. Fais défiler et tape **« Sur l'écran d'accueil »**
4. Renomme si besoin (défaut : "Yallah"), puis **Ajouter**
5. L'icône apparaît sur ton home — tape dessus, l'app s'ouvre en plein écran. La barre Safari disparaît, le swipe se fait à pleine surface.

> **Note iOS** : pour l'instant l'icône est un SVG basique (fond jaune + "yallah"). Si l'iOS rend une vignette grise au lieu de l'icône, c'est parce qu'iOS <17 ne supporte pas SVG pour `apple-touch-icon`. Pour fixer ça : dépose un PNG 180x180 dans `public/apple-touch-icon.png` puis redeploie.

### Android (Chrome)

1. Ouvre l'URL dans Chrome
2. Menu (⋮) → **Installer l'application** (ou "Ajouter à l'écran d'accueil")
3. L'icône apparaît dans le drawer + sur le home. L'app s'ouvre en standalone.

## Étendre les activités

1. Édite `activites-maurice.md` en gardant le format existant (`#### n°N — Titre`, puis champs `**Tags**`, `**Lieu**`, etc.)
2. `npm run parse:activities` régénère `src/data/activities.json`
3. `npm run build && npm test` pour vérifier

## Hors v1

- Multi-utilisateurs synchronisés (lobby + écran résultats à 3 onglets)
- Auth Google
- i18n (FR uniquement pour l'instant)
- PWA / offline first
