# Page d'accueil (Welcome screen) — design

**Date** : 2026-06-03
**Statut** : validé en brainstorming, en attente de relecture spec

## Objectif

Ajouter une première page (écran d'accueil) affichée au lancement, avant le choix
d'identité. Elle comporte le logo en haut et deux boutons :

1. **« Continuer avec Google »** — bouton visuel au style Google (**placeholder**,
   aucune vraie auth). Au clic → ouvre l'`IdentityPicker` existant.
2. **« Essayer la démo »** — entre directement dans l'app, sur le deck de swipe,
   sous une identité **Invité**.

Le tout reste **100 % local**, conforme au scope v1 (pas de backend, pas d'auth).

## Contexte produit

Aujourd'hui, au premier lancement (`yallah.userId.v1 === null`), l'app affiche
directement l'`IdentityPicker` bloquant (« Tu es qui ? »). La page d'accueil
s'intercale **devant** ce picker : c'est le nouveau premier écran d'onboarding.

### Pourquoi un placeholder Google et pas une vraie auth

Décision explicite : un login Google *utile* dans Yallah servirait à **synchroniser
les votes entre les 9 participants** — ce qui suppose un backend + stockage, hors
scope v1 (« chaque appareil est une île »). Un login Google purement client-side
(Google Identity Services, sans BDD) reste techniquement possible mais a été écarté
pour cette itération. Le bouton est donc décoratif et renvoie vers le choix
d'identité local.

## Décisions validées

| Sujet | Décision |
|---|---|
| Clic « Continuer avec Google » | Ouvre l'`IdentityPicker` existant (placeholder, pas d'auth) |
| Bouton « Essayer la démo » | Entre directement dans l'app sous l'identité **Invité** |
| Identité démo | Nouveau participant **Invité** (`id: 'invite'`) |
| Invité dans Groupe | **Toujours dans la liste** → 10e participant permanent (texte « 10 personnes ») |
| Tagline sous le logo | **Aucun** — wordmark seul |

## Composants & modifications

### Nouveau : `src/components/WelcomeScreen.tsx`

Écran plein cadre, rendu au **niveau App** (sibling des écrans, comme l'`IdentityPicker`),
fond `YB.bgSun`. Layout vertical :

- **Haut** : le wordmark `yallah ·` en grand (logo seul, pas de tagline).
- **Centre** : espace / visuel léger optionnel (peut rester vide pour épure).
- **Bas** : deux boutons empilés, pleine largeur, au-dessus de
  `env(safe-area-inset-bottom)` :
  1. `« Continuer avec Google »` — surface blanche, bordure fine, icône « G »
     multicolore, texte ink. `onClick → onGoogle()`.
  2. `« Essayer la démo »` — bouton secondaire (coral ou ghost). `onClick → onDemo()`.

Props :
```ts
interface WelcomeScreenProps {
  onGoogle: () => void
  onDemo: () => void
}
```

Pas d'état interne, pas d'effet de bord — purement présentation + 2 callbacks.

### Nouveau (extraction) : `src/components/Wordmark.tsx`

Petit composant partagé rendant le wordmark `yallah ·` (texte 800 + point coral),
avec une prop `size` (et `dark` pour fond sombre). `TopBar` et `WelcomeScreen`
l'importent → une seule source de vérité pour le logo. La logique « 5 taps →
réglages » reste dans `TopBar` (hors du Wordmark).

### `src/data/participants.ts`

- Ajouter le participant invité :
  `{ id: 'invite', name: 'Invité', initial: '?', color: '#9A93A6', fakeProgress: 0 }`.
- Exporter une constante `GUEST_ID = 'invite'`.
- Conséquence (choix « toujours dans la liste ») : **Invité apparaît partout** où
  l'on itère `PARTICIPANTS` — donc aussi dans la liste de l'`IdentityPicker` et
  comme 10e ligne permanente du `GroupScreen`. Le compteur « N personnes » du
  Groupe passe à 10 via `PARTICIPANTS.length` (déjà dynamique).

### `src/App.tsx`

- Nouvel état `const [authStarted, setAuthStarted] = useState(false)`.
- `needsOnboarding = userId === null` (inchangé).
- Affichage :
  - `WelcomeScreen` quand `needsOnboarding && !authStarted`.
  - `showPicker = (needsOnboarding && authStarted) || changingIdentity`.
- Handlers :
  - `onGoogle` → `setAuthStarted(true)` (révèle le picker).
  - `onDemo` → entre en démo : `clearHistory()`, `setDone(false)`,
    `setReviewMode(false)`, `setUserId(GUEST_ID)`, toast « Bienvenue en démo » (👋),
    `setActiveTab(0)`.
  - `handleReset` : ajouter `setAuthStarted(false)` pour que la page d'accueil
    réapparaisse après une réinitialisation (qui remet `userId` à `null`).

Le `WelcomeScreen` est rendu au niveau App, au-dessus des écrans (z équivalent à
l'overlay du picker). Comme il ne s'affiche que pendant l'onboarding, il peut être
rendu de façon conditionnelle (contrairement aux tabs qui restent montées).

## Flux

```
userId === null
  ├─ !authStarted        → WelcomeScreen
  │     ├─ « Google »     → setAuthStarted(true) → IdentityPicker (choix réel)
  │     │                       └─ onPick(id)  → entre dans l'app sous `id`
  │     └─ « Démo »        → setUserId('invite') → entre dans l'app (deck swipe)
  └─ authStarted          → IdentityPicker

userId !== null           → app normale
Réinitialiser             → userId=null, authStarted=false → retour WelcomeScreen
```

## Gestion des erreurs / cas limites

- **Pas d'`onClose` sur le WelcomeScreen** : c'est un écran bloquant d'onboarding,
  on ne peut pas le « fermer » sans choisir une voie (Google ou Démo).
- **Retour en arrière depuis le picker** : si l'utilisateur a cliqué « Google » puis
  veut revenir à l'accueil — le picker en mode onboarding est bloquant (pas de
  bouton fermer). Acceptable pour la v1 ; on pourra ajouter une flèche retour plus
  tard si besoin (hors scope ici).
- **Accessibilité** : boutons `type="button"`, labels explicites. Le WelcomeScreen
  n'a pas de focus-trap dédié (pas un dialog) mais peut recevoir un `role`/`aria`
  léger ; on suit le style existant (boutons natifs).

## Tests

### Unitaires / composant
- `src/components/WelcomeScreen.test.tsx` (nouveau) :
  - rend le wordmark `yallah` + les deux boutons ;
  - clic « Continuer avec Google » → appelle `onGoogle` ;
  - clic « Essayer la démo » → appelle `onDemo`.
- `src/components/Wordmark.test.tsx` (nouveau, léger) : rend « yallah » + le point.
- `src/App.test.tsx` (maj) :
  - premier lancement (`userId` null) → la page d'accueil est visible, le picker
    **ne l'est pas** ;
  - clic « Continuer avec Google » → le picker « Tu es qui ? » apparaît ;
  - clic « Essayer la démo » → on entre dans l'app (deck visible) et
    `yallah.userId.v1 === 'invite'`.

### e2e (Playwright)
- `e2e/identity.spec.ts` (maj) : le test « premier lancement » passe d'abord par
  le clic « Continuer avec Google » avant d'asserter le picker.
- Nouveau test (ici ou dans un `e2e/welcome.spec.ts`) : « Essayer la démo » →
  le deck s'affiche, `userId` vaut `invite`.
- Les autres specs e2e seedent déjà `yallah.userId.v1 = 'yves'` dans
  `beforeEach` → **non impactées** (la page d'accueil ne s'affiche pas).

## Hors scope

- Vraie authentification Google (client-side ou backend) — voir backlog « plus tard ».
- Synchronisation multi-appareils des votes.
- Flèche « retour » de l'IdentityPicker vers la page d'accueil.

## Vérification

- `npm test` (+ coverage ratchet), `npm run lint`, `npm run build`.
- `npm run test:e2e` pour les specs onboarding/démo.
