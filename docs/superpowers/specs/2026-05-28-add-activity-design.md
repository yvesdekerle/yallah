# Ajout d'activités — Design

**Date** : 2026-05-28
**Statut** : validé (brainstorming)

## Objectif

Permettre à l'utilisateur d'ajouter ses propres activités depuis l'app, en plus
des 201 activités curées. **Stockage 100 % local pour l'instant** (localStorage +
IndexedDB) ; une migration vers une BDD est prévue plus tard, donc la couche de
stockage doit être confinée à un nombre minimal de modules.

Périmètre décidé pendant le brainstorming :

- **But** : ajout perso local (deck du device courant). Pas de partage/sync en v1.
- **Formulaire complet** : tous les champs d'`Activity` exposés.
- **Photos** : les deux sources — upload galerie (redimensionné, IndexedDB) **et**
  URL collée.
- **Carte** : pin sur une mini-carte Leaflet + recherche d'adresse Nominatim.
- **Entrée** : un **4ᵉ onglet « Ajouter »** dans la BottomNav.
- **Gestion** : formulaire **+ liste éditable** (édition et suppression).
- **Photos** : pas de réordonnancement — la **1ʳᵉ photo ajoutée = hero**.
- **Catégorie** : menu des 11 catégories existantes **+ texte libre** (« Autre… »).

## Architecture retenue

Approche « état dans `App.tsx` + prop-drilling », alignée avec l'existant (pas de
global store ; `App` possède déjà l'état et passe `activities` en prop). La liste
fusionnée `allActivities = [...ACTIVITIES, ...userActivities]` remplace `ACTIVITIES`
partout où il était consommé.

## Modèle de données & stockage

### Type persistant — clé localStorage `yallah.userActivities.v1`

```ts
interface StoredUserActivity extends Activity {
  userAdded: true
  photoRefs: PhotoRef[]        // ordonné, [0] = hero
  coords?: { lat: number; lng: number }
  createdAt: number
}

type PhotoRef =
  | { kind: 'url'; url: string }        // URL collée — string brute
  | { kind: 'upload'; id: string }      // clé d'un blob en IndexedDB
```

- **ID** : `u-<crypto.randomUUID()>`. Le préfixe `u-` garantit l'absence de
  collision avec `a001..a201`.
- **`number`** : valeur synthétique haute (≥ 900) pour ne pas heurter un éventuel
  tri par numéro de source. À vérifier à l'implémentation : confirmer que `number`
  n'est pas affiché d'une façon qui choquerait (sinon le masquer pour les activités
  perso).

### Photos

- **Upload** : redimensionnement côté client via `<canvas>` avant stockage —
  hero **800×1000**, miniatures **400×500**, JPEG **q≈0.72**, `fit: cover` (mêmes
  cibles que `scripts/download-photos.ts`). Blob stocké en **IndexedDB**
  (db `yallah`, store `photos`, clé = `PhotoRef.id`).
- **URL collée** : conservée telle quelle dans `photoRefs` ; passe intacte dans
  `heroPhotoUrl`/`detailPhotos` (qui ne réécrivent que les URLs `images.pexels.com`).
- **Hero** = `photoRefs[0]`. Pas de réordonnancement ; supprimer la 1ʳᵉ photo
  promeut la suivante.

### Modules isolés (seule surface à réécrire pour la future BDD)

- `src/data/userActivities.ts` — CRUD localStorage : `list() / add() / update() / remove()`.
- `src/data/photoStore.ts` — wrapper IndexedDB (`put / get / delete`) **+**
  `resizeImage(file): Promise<Blob>` (canvas).

## Intégration & fusion

### Hook `useUserActivities()` (appelé dans `App.tsx`)

- Lit le localStorage (sync) → liste des `StoredUserActivity`.
- Dans un effet : ouvre IndexedDB, lit les blobs référencés, crée des **object
  URLs** (`URL.createObjectURL`). Révoque les object URLs au cleanup / au
  remplacement.
- Renvoie des **activités runtime** portant en plus :
  - `photoUrls: string[]` — object URLs (uploads) + URLs collées, dans l'ordre.
  - `coords?: { lat; lng }`.
- Expose aussi les actions `add / update / remove` (qui écrivent via les modules
  isolés et déclenchent un re-render).

### `App.tsx`

- `const allActivities = useMemo(() => [...ACTIVITIES, ...userActivities], [userActivities])`.
- Remplace `ACTIVITIES` par `allActivities` pour : `SwipeDeck`, `ResultsScreen`,
  `GroupScreen` (`total`), `likedPins`, `singleMapPin`, `handleRandomFill`, le
  fallback `ActionRow` (`ACTIVITIES[history.length]`), et les messages utilisant
  `ACTIVITIES.length`.

### Résolution photos / coords (sans context)

Les données voyagent sur l'objet activité déjà prop-drillé.

- `heroPhotoUrl(activity)` / `detailPhotos(activity)` : si `activity.photoUrls?.length`
  → les utiliser ; sinon logique `photos.json` actuelle.
- Nouveau `coordsFor(activity)` : `activity.coords ?? getCoords(activity.id)`.
  Tous les appels `getCoords(id)` (App.tsx : likedPins, singleMapPin, initialCenter
  carte ; ResultsScreen ×2 ; DetailModal) basculent vers `coordsFor(activity)` — les
  call sites ont déjà l'objet activité (pour le cas `mapView.activityId` d'App,
  résoudre via `allActivities.find`).

### Placement dans le deck

- Activités perso **appended en fin** de `allActivities`.
- Comme `SwipeDeck.topIdx = history.length` en mode normal, une activité ajoutée
  apparaît en fin de deck — et **immédiatement** comme nouvelle carte si
  l'utilisateur avait déjà tout swipé.
- **Au `add`** : si `history.length < allActivities.length`, forcer `done = false`
  pour que la nouvelle carte soit atteignable (sinon `DeckDone` masque le deck).

## UI — onglet « Ajouter »

### Navigation

- `BottomNav` passe à 4 onglets : `swipe · résultats · groupe · ajouter` (icône `+`).
- `TabIndex` : `0 | 1 | 2 | 3`. Nouveau bloc `display: contents/none` dans `App.tsx`,
  identique aux trois existants (jamais d'unmount conditionnel).

### `AddActivityScreen` (scrollable, safe-areas respectées)

Formulaire en haut, liste éditable en dessous.

**Formulaire** (titre requis, reste optionnel avec défauts raisonnables — note 0,
pas de tags, pas de difficulté) :

- Titre *(requis)*, Description, Lieu, Trajet depuis Tamarin, Durée, Prix — texte.
- Catégorie — menu des 11 catégories existantes + « Autre… » → champ texte libre.
- Difficulté — 4 niveaux (🟢🟡🟠🔴) ou « aucune ».
- Note — sélecteur 0–5 étoiles.
- Tags — saisie d'emojis (chips).
- Toggles 💎 pépite / 🗝️ secret.
- Insolite — texte.
- **Photos** — bloc acceptant les deux sources :
  - « Ajouter depuis la galerie » : `<input type=file accept="image/*" multiple>`
    → `resizeImage` → IndexedDB → `PhotoRef{kind:'upload'}`.
  - « Coller une URL » : champ texte → `PhotoRef{kind:'url'}`.
  - Vignettes affichées dans l'ordre, 1ʳᵉ = hero, suppression unitaire. Pas de
    réordonnancement.
- **Position** — mini-carte Leaflet centrée sur Maurice :
  - Champ recherche → Nominatim (debounce, respect 1 req/s) recentre la carte.
  - Tap sur la carte pose/déplace le pin → `coords`.
  - Bouton « effacer la position ».
- Bouton **Ajouter** (désactivé si titre vide) → `add(...)`, toast « Activité
  ajoutée », `done=false`, reset du formulaire.

**Liste « Mes activités ajoutées »** :

- Une ligne par activité perso (vignette + titre).
- **Éditer** : recharge le formulaire en mode édition → `update`.
- **Supprimer** : via `ConfirmModal` rendu au niveau App (comme reset). Nettoie
  aussi le `VoteEntry` correspondant dans l'historique **et** les blobs IndexedDB
  référencés par ses `photoRefs`.

## Tests

- **Unitaires (Vitest)** :
  - `userActivities.ts` — CRUD + forme du merge.
  - `coordsFor` — priorité `activity.coords` puis `getCoords`.
  - `heroPhotoUrl` / `detailPhotos` — branche activité perso (`photoUrls`).
  - Suppression — nettoyage du vote + des blobs.
  - IndexedDB : `fake-indexeddb` (nouvelle devDependency).
- **e2e (Playwright)** — `e2e/add-activity.spec.ts` : ajouter via URL, vérifier la
  présence dans le deck + Résultats, éditer, supprimer.
- **Limites assumées** : le resize `<canvas>` et la carte Leaflet ne sont pas
  testables en jsdom → upload galerie + pin carte couverts en QA manuelle.
- « Terminé » inclut `npm test`, `npm run lint`, `npm run build`.

## Hors périmètre (v1)

- Partage / sync entre participants (migration BDD ultérieure).
- Réordonnancement des photos.
- Géocodage automatique à l'ajout (seule la recherche manuelle Nominatim est prévue).
