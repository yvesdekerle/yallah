# Cartes (mini sur activité + agrégée dans Résultats)

**Date** : 2026-05-27
**Statut** : design approuvé, prêt pour planification

## Contexte

Aujourd'hui l'app affiche le champ texte `location` (« Blue Bay
(sud-est) ») dans le DetailModal mais sans repère spatial. Pour
9 personnes qui préparent un voyage à Maurice, la dimension
géographique est centrale : grouper les activités proches en une même
journée, situer ce qu'on like par rapport au logement (Tamarin),
visualiser les zones non couvertes. On ajoute donc des cartes Leaflet
à deux endroits :

1. **Mini-carte dans le DetailModal** — un seul pin pour l'activité en
   cours.
2. **Carte agrégée full-screen** depuis la page Résultats — tous les
   pins LIKE + SUPER LIKE.

## Objectifs

- Géolocaliser les 201 activités via un pipeline reproductible
  (Nominatim + overrides manuels).
- Afficher une mini-carte 180 px dans le DetailModal, juste après le
  titre, avant les MetaChips.
- Permettre depuis la page Résultats d'ouvrir une carte plein écran
  avec un pin par activité LIKE / SUPER LIKE.
- Lazy-loader Leaflet pour que la tab Swipe reste à ~112 KB gzipped.

## Non-objectifs

- Pas de cluster automatique (à reconsidérer si plus de 30 pins se
  superposent dans une zone).
- Pas de pins pour WHY_NOT / NON / SKIP sur la carte agrégée.
- Pas de précache de tuiles offline.
- Pas de routing « activités groupables dans une journée ».
- Pas de carte sur la `Card` du deck en plein swipe — le `Card`
  affiche déjà la photo, ajouter une carte alourdirait l'expérience.

## Pipeline de coordonnées

### Script `npm run geocode:activities`

Nouveau fichier `scripts/geocode-activities.ts`. Logique :

1. Charge `src/data/activities.json`.
2. Construit la liste des `location` uniques (~164 entrées).
3. Pour chaque location, requête `https://nominatim.openstreetmap.org/search?q=<location>+Mauritius&format=json&limit=1` avec un délai de 1.2 s entre requêtes (politique Nominatim : max 1 req/s, on prend une marge).
4. User-Agent customisé `yallah-geocoder/1.0 (yves.dekerle@gmail.com)` requis par Nominatim.
5. Si Nominatim retourne 0 résultat OU si le `lat` retourné est hors du bounding box approximatif de Maurice (lat: -20.6..-19.9, lng: 57.2..57.9) → coords `null` dans la sortie.
6. Sortie : `src/data/coords.json` au format

```json
{
  "a001": { "lat": -20.443, "lng": 57.715, "source": "nominatim" },
  "a002": null,
  ...
}
```

Resumable : si `coords.json` existe déjà, on garde les entrées
existantes et on ne ré-interroge que celles à `null` (mode default)
ou celles passées en `--only=a012,a045`. Flag `--force` pour
ré-interroger tout.

### Overrides manuels

Nouveau fichier `src/data/coords-overrides.json` (versionné, vide au
début) :

```json
{
  "a002": { "lat": -20.123, "lng": 57.456 },
  ...
}
```

Format simple : `Record<string, { lat, lng }>`. À remplir
manuellement pour les activités où Nominatim a échoué ou retourné un
mauvais point. Les coords sont collées depuis Google Maps
(clic-droit → coordonnées).

### Utilitaire `src/utils/coords.ts`

API publique unique :

```ts
export interface Coords { lat: number; lng: number }
export function getCoords(activityId: string): Coords | null
```

Implémentation :

1. Si présent dans `coords-overrides.json` → retourne ces coords.
2. Sinon si présent et non-null dans `coords.json` → retourne `{ lat, lng }` (drop `source`).
3. Sinon → `null`.

Test unitaire vérifie les trois branches + le merge override-wins.

## Bibliothèque & chargement

### Dépendances

Ajouts à `package.json` :

- `leaflet` (~140 KB minifié, ~40 KB gzipped)
- `react-leaflet`
- `@types/leaflet` (devDep)

CSS Leaflet : import dans `src/index.css` (`@import 'leaflet/dist/leaflet.css';`).

### Lazy-loading

Les composants `ActivityMiniMap` et `FullscreenMap` importent Leaflet.
Pour éviter de payer le coût sur la tab Swipe (la plus utilisée),
on utilise `React.lazy` au site d'utilisation :

```ts
const ActivityMiniMap = lazy(() => import('./ActivityMiniMap'))
const FullscreenMap = lazy(() => import('./FullscreenMap'))
```

Avec un `<Suspense fallback={...}>` léger qui affiche un placeholder
de la même hauteur le temps que Leaflet charge.

Conséquence : la première ouverture d'un DetailModal a un délai de
chargement (mesuré <300 ms sur 4G typique). Acceptable.

### Tuiles

Provider : OSM Mapnik standard
`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.

Attribution : `© OpenStreetMap contributors`. `react-leaflet` la pose
automatiquement via `<TileLayer attribution=…>`.

## Composant `ActivityMiniMap`

`src/components/ActivityMiniMap.tsx` :

```ts
interface ActivityMiniMapProps {
  coords: Coords | null
  pinColor: string
  onExpand?: () => void
}
```

Comportement :

- **`coords === null`** : bloc gris clair (`background: YB.bgSoft`),
  même hauteur (180 px), centré « 📍 Pas de localisation précise »
  en `YB.muted`. Leaflet n'est PAS chargé dans ce cas.
- **`coords !== null`** : MapContainer 180 px, centré sur `coords`,
  zoom 14, pin custom (cercle SVG 24×24 de couleur `pinColor` avec
  bordure blanche, voir `FullscreenMap` ci-dessous — le pin est
  partagé).
- Interactions : `dragging={false}`, `scrollWheelZoom={false}`,
  `doubleClickZoom={false}`, `zoomControl={false}`,
  `touchZoom={false}`. La mini-carte est purement passive — pas de
  voleur de geste vs le scroll du DetailModal.
- Tap sur la mini-carte (uniquement quand `coords !== null`) → appel
  `onExpand?.()` (ouvre la carte plein écran sur ce pin). Le
  placeholder « Pas de localisation précise » n'est pas tappable.

### Pin custom

Helper interne `makePinIcon(color: string): L.DivIcon` retournant un
`L.divIcon` avec un SVG cercle + bordure :

```html
<svg viewBox="0 0 24 24" width="24" height="24">
  <circle cx="12" cy="12" r="9" fill="${color}" stroke="#fff" stroke-width="2.5" />
</svg>
```

Pour les LIKE/SUPER LIKE on dérive le pin du verdict — voir
FullscreenMap.

## Composant `FullscreenMap`

`src/components/FullscreenMap.tsx` :

```ts
interface FullscreenMapProps {
  pins: Array<{ activity: Activity; coords: Coords; verdict: Verdict }>
  initialCenter?: Coords
  onClose: () => void
  onSelectActivity: (a: Activity) => void
}
```

UI :

- Layer plein écran, `absolute inset-0 z-[40]`.
- MapContainer sur tout l'écran.
- **fitBounds** sur l'ensemble des `pins` au mount, SAUF si
  `initialCenter` est défini → on centre dessus avec zoom 13.
- Croix de fermeture en haut-droite (`absolute top-4 right-4 z-[1]`,
  même style que la croix d'IdentityPicker pour cohérence).
- Attribution OSM Leaflet en bas (gérée par TileLayer).
- Un `<Marker>` par pin avec :
  - LIKE → SVG cœur rose (`YB.oui`) dans un cercle blanc
  - SUPER LIKE → SVG étoile dorée (`YB.top`) dans un cercle blanc
- Tap sur un marker → ouvre un Leaflet `<Popup>` avec :
  - `{activity.number}. {activity.title}`
  - Petit bouton « Voir le détail »
  - Tap sur le bouton → `onSelectActivity(activity)` (le parent
    ouvrira le DetailModal en mode `'review'`).

### Marker icons

Deux helpers de pin (cœur, étoile) dans le composant. Construits
identiquement au pin `ActivityMiniMap` mais avec un SVG du verdict.
Si jamais le bundle gonfle, on factorise plus tard.

## DetailModal — intégration de la mini-carte

Dans `src/components/DetailModal.tsx` :

- Imports : `lazy(() => import('./ActivityMiniMap'))`, `Suspense`,
  `getCoords` depuis `utils/coords`.
- Juste après le `<h1>` du titre, avant le bloc des MetaChips, on
  insère :

```tsx
<Suspense fallback={<div style={{ height: 180, background: YB.bgSoft, borderRadius: 12 }} />}>
  <ActivityMiniMap
    coords={getCoords(activity.id)}
    pinColor={YB.coral}
    onExpand={() => onOpenMap?.({ mode: 'single', activityId: activity.id })}
  />
</Suspense>
```

Nouvelle prop optionnelle `onOpenMap?: (view: MapView) => void`
passée par `App.tsx`. Si absente, la mini-carte n'est pas tapable
(juste un visuel).

## ResultsScreen — bouton « Voir sur la carte »

Dans `src/components/ResultsScreen.tsx` :

- Nouvelle prop : `onOpenMap?: () => void`.
- Au-dessus de la liste `voted`, après les stat tiles, avant la liste
  ou l'état vide, on ajoute un bouton coral plein largeur :

```
[ 🗺 Voir sur la carte (12) ]
```

où `12` est le nombre d'activités LIKE+SUPER_LIKE pour lesquelles
`getCoords` retourne non-null. Caché si zéro.

En-dessous, en petit texte si `nMissing > 0` :

> *3 activités sans localisation précise non affichées.*

Tap → `onOpenMap?.()`.

## App.tsx — orchestration

Nouvelle pièce d'état :

```ts
type MapView =
  | { mode: 'all' }
  | { mode: 'single'; activityId: string }

const [mapView, setMapView] = useState<MapView | null>(null)
```

À la racine du JSX (sibling des autres modales), render conditionnel :

```tsx
{mapView && (
  <Suspense fallback={null}>
    <FullscreenMap
      pins={mapView.mode === 'single' ? singlePins(mapView.activityId) : allLikedPins()}
      initialCenter={mapView.mode === 'single' ? getCoords(mapView.activityId)! : undefined}
      onClose={() => setMapView(null)}
      onSelectActivity={(a) => setDetail({ activity: a, source: 'review' })}
    />
  </Suspense>
)}
```

Helpers locaux dans `App` :

- `allLikedPins()` : itère `history`, filtre `verdict in {oui, top}`,
  garde ceux dont `getCoords(id) !== null`, retourne le tableau de
  pins.
- `singlePins(id)` : retourne un seul pin pour l'activité demandée.
  Si l'activité a déjà été votée LIKE/SUPER_LIKE, on prend le verdict
  réel ; sinon (activité non votée ou votée WHY_NOT/NON/SKIP), on
  utilise un verdict synthétique `'oui'` pour le pin (couleur coral
  cohérente avec la mini-carte). Le pin est toujours affiché, c'est
  l'utilisateur qui a tapé sur la mini-carte donc on lui montre
  exactement le point qu'il voulait voir. `getCoords(id) === null`
  est impossible ici par construction (la mini-carte tapable
  n'existe que si les coords sont présentes).

Le DetailModal reste mounted SOUS le FullscreenMap quand on l'ouvre
depuis la mini-carte — cohérent avec PhotoLightbox.

`onSelectActivity` ouvre le DetailModal en `'review'`. Si l'activité
n'a pas encore été votée, le DetailModal permettra de voter et
patcher l'historique (cas déjà géré par `handleDetailVerdict`).

### Wiring DetailModal

`App.tsx` passe `onOpenMap={(view) => setMapView(view)}` à
`DetailModal`. La mini-carte tapable ouvre donc le FullscreenMap
centré sur le pin de l'activité courante.

## Tests

### Unitaires (Vitest + Testing Library)

- **`src/utils/coords.test.ts`** :
  - lookup direct dans `coords.json`
  - override prime sur `coords.json`
  - `null` si absent partout
  - `null` si `coords.json` a une entrée `null` sans override
- **`src/components/ActivityMiniMap.test.tsx`** :
  - render le placeholder « Pas de localisation précise » si `coords===null` (et ne charge pas Leaflet — testable en mockant `react-leaflet`)
  - render le MapContainer si coords présents
  - appel `onExpand` au tap (uniquement quand coords présents)
- **`src/components/FullscreenMap.test.tsx`** :
  - filtre les verdicts LIKE/SUPER_LIKE uniquement (sur input mixte, vérifie le nombre de markers)
  - exclu les coords null (déjà filtrés à l'entrée mais testons le contrat avec un mock)
  - `onClose` au tap de la croix
  - `onSelectActivity` quand on clique le bouton du popup

Pour les composants Leaflet, mocker `react-leaflet` via
`vi.mock('react-leaflet', () => ({ MapContainer: …, TileLayer: …,
Marker: …, Popup: … }))` qui rendent des `<div>` testables.

### E2E (Playwright)

Nouveau `e2e/map.spec.ts` :

- Ouvre un DetailModal d'activité géolocalisée (a001 = Blue Bay) →
  la mini-carte rend un canvas Leaflet (`page.locator('.leaflet-container')`).
- Tap sur la mini-carte → FullscreenMap visible.
- Ferme le FullscreenMap → DetailModal toujours visible derrière.
- Sur la page Résultats avec un LIKE casté → bouton « Voir sur la
  carte » présent ; tap → FullscreenMap ; ferme.

Les tests existants ne devraient pas être impactés (les tabs
existantes restent identiques).

## Fichiers touchés

| Fichier | Action |
|---|---|
| `package.json` | dépendances Leaflet + script `geocode:activities` |
| `scripts/geocode-activities.ts` | **nouveau** |
| `src/data/coords.json` | **généré** (committé) |
| `src/data/coords-overrides.json` | **nouveau** (vide / curé manuellement) |
| `src/utils/coords.ts` + `.test.ts` | **nouveau** |
| `src/components/ActivityMiniMap.tsx` + `.test.tsx` | **nouveau** |
| `src/components/FullscreenMap.tsx` + `.test.tsx` | **nouveau** |
| `src/components/DetailModal.tsx` | insère ActivityMiniMap + nouvelle prop `onOpenMap` |
| `src/components/DetailModal.test.tsx` | mise à jour pour la nouvelle prop |
| `src/components/ResultsScreen.tsx` | bouton « Voir sur la carte » + prop `onOpenMap` |
| `src/components/ResultsScreen.test.tsx` | nouveau test sur le bouton |
| `src/App.tsx` | state `mapView`, render FullscreenMap, wiring DetailModal + ResultsScreen |
| `src/App.test.tsx` | un test sur le bouton qui ouvre la carte (sans rendre Leaflet) |
| `e2e/map.spec.ts` | **nouveau** |
| `src/index.css` | import des styles Leaflet |
| `CLAUDE.md` | doc du pipeline coords + composants carte + nouveau script npm |

## Risques / points de vigilance

- **Bundle initial** : le lazy-load doit fonctionner. Vérifier
  `npm run build` et inspecter la taille du chunk principal — il
  doit rester ≤ ~115 KB gzipped. Si Vite n'isole pas correctement
  Leaflet, c'est probablement parce qu'il est importé de manière
  synchrone quelque part : tracker l'import statique fautif.
- **Couverture Nominatim** : sur les 164 locations uniques, la
  proportion résolue dépend de la qualité du texte. Les locations
  multi-sites (« Trou aux Biches, Blue Bay, Flic-en-Flac »)
  retourneront probablement le 1er. Politique : on accepte (un pin
  représentatif, pas tous les sites), c'est documenté dans les
  overrides.
- **Politique Nominatim** : 1 req/s, User-Agent obligatoire, pas
  d'usage commercial massif. À 164 requêtes une fois, on est large
  sous la limite. À documenter dans le script (commentaire en
  haut).
- **CSS Leaflet** : `leaflet.css` ajoute ~15 KB minifié. Importé
  globalement, donc payé même si l'utilisateur n'ouvre jamais une
  carte. Acceptable (les classes Tailwind + Leaflet ne se marchent
  pas dessus).
- **Pins sur iOS Safari** : `L.divIcon` avec SVG inline marche
  partout, mais le tap target Leaflet par défaut est 30×30. Vérifier
  que la zone tappable est confortable (étendre via CSS si besoin).
- **Tuiles HTTPS mixed-content** : OSM tiles servies en HTTPS, pas
  d'issue.

## Hors-scope (déjà discuté)

- Cluster automatique : on n'en met pas. À revoir si plus de 30 pins
  se superposent visuellement (au-delà de 40 LIKE, le user verra).
- Toggle filtres (why not, non) : non. On reste à LIKE + SUPER LIKE.
- Précache offline des tuiles : non. Si l'utilisateur est offline et
  ouvre une carte, il verra une carte grise — acceptable pour v1.
- Lien Google Maps « Itinéraire depuis Tamarin » : potentiel ajout
  ultérieur dans le popup du marker.
