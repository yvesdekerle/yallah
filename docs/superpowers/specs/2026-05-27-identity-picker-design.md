# Sélection du prénom (identité utilisateur)

**Date** : 2026-05-27
**Statut** : design approuvé, prêt pour planification

## Contexte

L'app Yallah est aujourd'hui mono-utilisateur avec un identifiant en dur
(`yves`). La page **Groupe** affiche les 9 participants avec une barre de
progression réelle pour Yves et des barres `fakeProgress` pour les 8
autres. Le but est de laisser n'importe qui installer l'app et choisir
quel participant il est, pour que **sa** barre de progression devienne
celle qui reflète son `localStorage` au lieu d'être systématiquement
attribuée à Yves.

## Objectifs

1. Permettre à l'utilisateur de choisir son prénom dans la liste des 9
   participants au premier lancement.
2. Sa barre de progression sur la page Groupe utilise l'historique
   réel ; les 8 autres conservent leur `fakeProgress`.
3. Possibilité de changer d'identité après coup depuis la page Groupe.
4. Le bouton « Réinitialiser » de la page Résultats efface tout, y
   compris le prénom choisi, et fait retomber l'app en onboarding.

## Non-objectifs

- Pas de multi-profils sur un même device.
- Pas de synchro réseau, pas de comptes (toujours v1 local-only).
- Pas d'avatar de l'utilisateur dans la TopBar (potentielle v2).
- Pas de modification de `ResultsScreen` — les votes y sont déjà ceux du
  device local, pas de distinction « vrais / fake » à introduire.

## Persistance

Nouvelle clé dans `localStorage` :

| Clé | Type | Description |
|---|---|---|
| `yallah.userId.v1` | `string \| null` | Id du participant choisi (`"chloe"`, `"yves"`, …). Absente ⇒ mode onboarding. |

La constante `CURRENT_USER_ID` dans `src/data/participants.ts` disparaît
au profit d'une valeur lue dynamiquement depuis le state.

`STORAGE_KEYS.userId = 'yallah.userId.v1'` est ajouté à
`src/constants/swipe.ts`.

## Composant `IdentityPicker`

Nouveau composant `src/components/IdentityPicker.tsx`. Rendu au niveau
de `App` (frère de `ConfirmModal`) pour éviter le bug du modal clippé
par un conteneur scrollable.

Props :

```ts
interface IdentityPickerProps {
  currentUserId: string | null
  onPick: (id: string) => void
  /** Quand absent, le picker est bloquant (pas de croix, pas de tap
      hors-zone pour fermer). */
  onClose?: () => void
}
```

UI : bottom-sheet dans les deux modes (bloquant ou dismissable). En
mode bloquant, on ajoute un overlay sombre plein-écran sous la
bottom-sheet (au lieu du `rgba(0,0,0,0.4)` plus clair de
`ConfirmModal`) et on retire la croix. Pas de full-screen takeover —
on reste cohérent avec les autres modaux de l'app.

Contenu :

- Titre : `"Tu es qui ?"` (ou `"Bienvenue !"` pour l'onboarding — à
  affiner pendant l'implémentation, peu importe).
- Sous-titre court : `"Choisis ton prénom dans la liste."`
- Liste tapable des 9 participants, une ligne par participant :
  - avatar coloré (initiale + couleur)
  - prénom
  - badge `toi` si `p.id === currentUserId` (la ligne reste tapable
    mais c'est l'identité actuelle)

Tap sur une ligne → `onPick(id)`.

Si `onClose` est défini, une croix en haut à droite ferme le picker.

## Onboarding (premier lancement / utilisateurs existants)

Dans `App.tsx`, ajouter :

```ts
const [userId, setUserId] = useLocalStorage<string | null>(
  STORAGE_KEYS.userId,
  null,
)
const needsOnboarding = userId === null
```

Quand `needsOnboarding` est `true`, on render `IdentityPicker` **sans**
`onClose` (donc bloquant). Le reste de la Phone est rendu en arrière,
mais le picker est par-dessus avec un overlay sombre pour qu'on n'ait
pas envie de cliquer derrière.

Sur `onPick(id)` en mode onboarding :

```ts
setUserId(id)
setHistory([])  // wipe pour les utilisateurs existants
```

Le `setHistory([])` est exécuté à chaque transition out-of-onboarding
(ie quand `userId` passe de `null` à une valeur). Pour les nouveaux
utilisateurs c'est un no-op ; pour les utilisateurs qui avaient déjà
swipé avant la migration, ça remet tout à zéro — comportement validé
par l'utilisateur (« Reset complet au prochain lancement »).

Toast optionnel après pick : `"Salut Chloé 👋"`.

## Bouton « Changer d'identité » (page Groupe)

Sous la liste des participants dans `GroupScreen`, ajouter un bouton
secondaire (style cohérent avec « Réinitialiser » : blanc, bordé) :

```
[ Changer d'identité ]
```

Tap → appelle un callback (`onChangeIdentity`) passé par `App.tsx`, qui
ouvre le même `IdentityPicker` cette fois **avec** `onClose` défini
(donc dismissable). Sur pick :

```ts
setUserId(newId)
// pas de wipe — l'historique reste attaché au device, c'est juste
// l'étiquette qui change.
```

Toast : `"Tu es maintenant {Prénom}"`.

## Page Groupe — passage à un `currentUserId` dynamique

`GroupScreen` accepte une nouvelle prop :

```ts
interface GroupScreenProps {
  currentUserId: string | null
  currentUserProgress: number
  total: number
  onChangeIdentity: () => void
}
```

`currentUserId` est typée `string | null` parce que les 3 tabs restent
mountées simultanément (pattern `display: contents`/`display: none` de
l'app) : pendant l'onboarding, `GroupScreen` est rendu mais
invisible, et `userId` peut être `null`. Quand `null`, aucune ligne ne
porte le badge `toi` et toutes les barres utilisent leur
`fakeProgress` — c'est un état transitoire que l'utilisateur ne voit
pas, mais le composant doit le supporter sans crasher.

La ligne 48 `const isMe = p.id === CURRENT_USER_ID` devient
`const isMe = currentUserId !== null && p.id === currentUserId`.

Si l'utilisateur choisit Yves, l'UI est identique à aujourd'hui.

## Page Résultats — aucun changement

`ResultsScreen` reste inchangé. Les votes affichés sont déjà ceux du
device local, indépendamment de quel participant on a choisi d'être.

## Réinitialisation

`handleReset` dans `App.tsx` ajoute `setUserId(null)` après le
`setHistory([])`. Au prochain render, `needsOnboarding === true` →
picker bloquant réapparaît. Côté UX, la modale de confirmation
« Tout effacer ? » reste la même ; le texte du message peut mentionner
que le prénom sera aussi réinitialisé :

> « Tes votes en cours **et ton prénom** seront supprimés. Cette action
> est irréversible. »

## Tests

### Unitaires (Vitest + Testing Library)

- **Nouveau** `IdentityPicker.test.tsx` :
  - rend les 9 participants
  - tap → `onPick` appelé avec le bon id
  - badge `toi` sur la ligne du `currentUserId`
  - croix présente uniquement quand `onClose` est défini
  - tap croix → `onClose` appelé
- `GroupScreen.test.tsx` (mise à jour) :
  - quand `currentUserId === 'chloe'`, la ligne `chloe` affiche le
    badge `toi` et la barre réelle, `yves` la barre `fakeProgress`
  - bouton « Changer d'identité » présent et déclenche le callback

### E2E (Playwright)

- **Nouveau** `e2e/identity.spec.ts` :
  - 1er lancement : picker visible et bloquant ; tap sur Chloé → picker
    disparaît, app fonctionne normalement
  - sur Groupe, la ligne Chloé porte le badge `toi`
  - bouton « Changer d'identité » → re-pick Adé → badge migre
  - Réinitialiser depuis Résultats → confirme → picker réapparaît au
    reload
- `e2e/persistence.spec.ts` (mise à jour) : précharger `userId` dans le
  `localStorage` au `beforeEach` pour ne pas tomber sur l'onboarding.

## Fichiers touchés

| Fichier | Action |
|---|---|
| `src/components/IdentityPicker.tsx` | **nouveau** |
| `src/components/IdentityPicker.test.tsx` | **nouveau** |
| `src/data/participants.ts` | retire `CURRENT_USER_ID` |
| `src/constants/swipe.ts` | ajoute `STORAGE_KEYS.userId` |
| `src/App.tsx` | state `userId`, gating onboarding, callback `onChangeIdentity`, reset modifié |
| `src/components/GroupScreen.tsx` | prop `currentUserId`, bouton « Changer d'identité » |
| `src/components/GroupScreen.test.tsx` | tests pour le nouveau comportement |
| `e2e/identity.spec.ts` | **nouveau** |
| `e2e/persistence.spec.ts` | précharge `userId` |
| `CLAUDE.md` | section storage : ajouter `yallah.userId.v1` ; gotchas si nécessaire |

## Risques / points de vigilance

- **Cross-tab sync** — `useLocalStorage` synchronise via le `storage`
  event. Si l'utilisateur ouvre l'app dans deux onglets et change
  d'identité dans l'un, l'autre doit se mettre à jour. Comportement
  natif du hook, pas d'action requise.
- **Ordre du wipe d'historique** — le `setHistory([])` doit
  s'exécuter **avant** ou **simultanément** au `setUserId(id)` pour
  éviter une frame où la barre de progression de Chloé montre l'ancien
  total. En pratique React batche les deux setState dans le même
  callback, donc OK.
- **Tests e2e existants** — `persistence.spec.ts` et autres specs qui
  démarrent l'app et interagissent avec le deck doivent précharger
  `userId` sinon ils restent bloqués sur le picker.
