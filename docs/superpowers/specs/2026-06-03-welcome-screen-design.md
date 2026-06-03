# Page d'accueil + connexion Google (SSO) — design

**Date** : 2026-06-03
**Statut** : validé en brainstorming, en attente de relecture spec

## Objectif

Ajouter une **page d'accueil** affichée au lancement, avant tout usage de l'app,
avec deux options :

1. **« Se connecter avec Google »** — vrai SSO Google **client-side** (sans backend
   ni BDD). À la connexion on récupère le **prénom + email** du compte Google et
   l'utilisateur arrive **directement sur son deck d'activités**, sans choisir de
   prénom (son prénom = celui de son compte Google).
2. **« Mode démo »** — comportement **identique à aujourd'hui** : la liste des
   prénoms en dur (`IdentityPicker`), on en choisit un, on utilise l'app.

L'app reste une **SPA statique sans backend**. Le SSO Google n'a pas besoin de BDD :
Google renvoie un token signé contenant l'identité, on l'exploite en local.

## Contexte produit

Aujourd'hui, au premier lancement (`yallah.userId.v1 === null`), l'app affiche
directement l'`IdentityPicker` bloquant. La page d'accueil s'intercale **devant** :
c'est le nouveau premier écran. Le mode démo redescend ensuite sur l'`IdentityPicker`
inchangé.

## Décisions validées

| Sujet | Décision |
|---|---|
| Mode démo | **Inchangé** : `IdentityPicker` (liste de prénoms en dur) → choix → app |
| Connexion Google | Vrai SSO client-side, récupère prénom + email, entre direct sur le deck |
| Lib SSO | `@react-oauth/google` |
| Affichage Groupe (connecté Google) | **Ligne « toi » en plus** en haut (prénom Google + vraie progression), 9 prénoms en dur en dessous |
| Prénoms en dur | Conservés tels quels (Groupe / comparaison) |
| « Changer d'identité » | **Réservé au mode démo**. En Google : pas de changement d'identité |
| Avatar topbar | **Google uniquement** : photo de profil en haut à droite de la barre `yallah` → menu **« Se déconnecter »** → page d'accueil. En démo : rien dans la topbar |
| OAuth Client ID | Fourni par l'utilisateur via `VITE_GOOGLE_CLIENT_ID` (.env) |
| Tagline page d'accueil | Aucun — wordmark seul |

## Modèle de données (stockage)

Aujourd'hui : `yallah.userId.v1: string | null` (id de participant en dur).

On ajoute une **deuxième clé** pour le profil Google, sans casser la première :

- `yallah.userId.v1: string | null` — id de participant **démo** (sémantique inchangée).
- `yallah.googleUser.v1: GoogleUser | null` — profil Google :
  ```ts
  interface GoogleUser {
    sub: string      // id stable du compte Google
    name: string     // prénom (given_name)
    email: string
    picture?: string // URL avatar Google (optionnel)
  }
  ```

**Identité courante** (dérivée) :
- connecté Google si `googleUser !== null` ;
- sinon démo si `userId !== null` ;
- sinon : non connecté → page d'accueil.

`signedIn = userId !== null || googleUser !== null`.
Les deux clés ne sont jamais non-nulles en même temps (Google a priorité ;
choisir l'un efface l'autre à la connexion).

## Composants & modifications

### Nouveau : `src/components/WelcomeScreen.tsx`

Écran plein cadre rendu au **niveau App** (sibling des écrans, comme l'`IdentityPicker`),
fond `YB.bgSun`. **Purement présentation** (testable, pas de logique OAuth dedans) :

```ts
interface WelcomeScreenProps {
  onGoogle: () => void   // déclenche le flux Google (câblé dans App via le hook)
  onDemo: () => void     // ouvre l'IdentityPicker
  googleAvailable: boolean // false si VITE_GOOGLE_CLIENT_ID absent
}
```

Layout vertical :
- **Haut** : wordmark `yallah ·` en grand (logo seul, pas de tagline).
- **Bas** : deux boutons empilés pleine largeur, au-dessus de `env(safe-area-inset-bottom)` :
  1. `« Se connecter avec Google »` — surface blanche, bordure fine, icône « G »
     multicolore, texte ink. Désactivé (avec libellé d'aide) si `!googleAvailable`.
  2. `« Mode démo »` — bouton secondaire (coral/ghost).

### Nouveau : `src/components/Wordmark.tsx`

Extraction du wordmark `yallah ·` (texte 800 + point coral), prop `size`/`dark`.
`TopBar` et `WelcomeScreen` l'importent (une seule source pour le logo). La logique
« 5 taps → réglages » reste dans `TopBar`.

### Nouveau : `src/components/GoogleGIcon.tsx`

Petit SVG « G » multicolore Google (cohérent avec le style des icônes maison
`icons/index.tsx`, props `size`).

### Nouveau : `src/hooks/useGoogleAuth.ts`

Encapsule `useGoogleLogin` de `@react-oauth/google` (flux implicite → `access_token`),
puis **fetch** `https://www.googleapis.com/oauth2/v3/userinfo` avec ce token pour
récupérer `{ given_name, email, picture, sub }`. Expose :
```ts
function useGoogleAuth(onUser: (u: GoogleUser) => void): {
  login: () => void   // à brancher sur onGoogle du WelcomeScreen
  available: boolean  // VITE_GOOGLE_CLIENT_ID présent ?
}
```
Gère l'erreur (popup fermée / fetch KO) → toast « Connexion Google échouée ».

> Choix du flux : `useGoogleLogin` (bouton 100 % custom) renvoie un `access_token`
> qu'on échange contre le profil via l'endpoint `userinfo`. C'est ce qui permet un
> bouton à notre charte tout en restant client-side et sans BDD. (Le composant
> `<GoogleLogin>` aurait imposé le bouton stylé par Google.)

### `src/main.tsx`

Envelopper `<App>` dans `<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''}>`.
Si la clé est absente, le provider se monte quand même mais `useGoogleAuth.available`
sera `false` → bouton Google désactivé, **le mode démo et le reste de l'app marchent
normalement** (pas de crash en CI / chez un dev sans clé).

### `src/App.tsx`

- État : `const [googleUser, setGoogleUser] = useLocalStorage<GoogleUser | null>('yallah.googleUser.v1', null)`.
- État : `const [demoStarted, setDemoStarted] = useState(false)` (clic « Mode démo »).
- `signedIn = userId !== null || googleUser !== null`.
- Affichage :
  - `WelcomeScreen` quand `!signedIn && !demoStarted`.
  - `IdentityPicker` (démo) quand `(!signedIn && demoStarted) || changingIdentity`.
- Câblage Google : `const { login: googleLogin, available } = useGoogleAuth(onGoogleUser)`.
  - `onGoogleUser(u)` → `clearHistory()` (nouvelle session), `setUserId(null)`,
    `setGoogleUser(u)`, `setDone(false)`, `setReviewMode(false)`, `setActiveTab(0)`,
    toast « Salut {u.name} 👋 ».
- `onDemo` → `setDemoStarted(true)` (révèle le picker).
- `handlePickIdentity` (démo) : inchangé, mais s'assure `setGoogleUser(null)`.
- `handleLogout` (menu avatar Google) → `setGoogleUser(null)`, `setDemoStarted(false)`,
  `setDone(false)`, `setReviewMode(false)`, `setActiveTab(0)`. On **revient à la page
  d'accueil**. (L'historique de votes local : voir « cas limites ».)
- `handleReset` (Réinitialiser) : ajoute `setGoogleUser(null)` + `setDemoStarted(false)`
  (efface tout, y compris l'historique → page d'accueil).
- Props passées :
  - `TopBar` reçoit `googleUser` + `onLogout={handleLogout}` ;
  - `GroupScreen` reçoit `googleUser` (en plus de `userId`).

Le `WelcomeScreen` est rendu conditionnellement au niveau App (au-dessus des écrans,
z = overlay), puisqu'il ne vit que le temps de l'onboarding.

### `src/components/GroupScreen.tsx`

- Nouvelle prop optionnelle `googleUser: GoogleUser | null`.
- Si `googleUser` présent :
  - rendre une **ligne « toi » supplémentaire en tête de liste** (avatar = initiale
    du prénom Google dans `AvatarPill` ; la photo Google reste un nice-to-have
    optionnel), progression réelle = `currentUserProgress` ;
  - les 9 participants en dur s'affichent ensuite, **aucun marqué « toi »** ;
  - **masquer** le bouton « Changer d'identité ».
- Si pas de `googleUser` (mode démo) : comportement actuel (le participant courant
  porte « toi », bouton « Changer d'identité » visible).
- Le compteur « N personnes pour Maurice » reste basé sur `PARTICIPANTS.length` (9).

### `src/components/TopBar.tsx`

- Nouvelles props optionnelles : `googleUser?: GoogleUser | null` et `onLogout?: () => void`.
- Quand `googleUser` est présent : rendre un **bouton avatar rond en haut à droite**
  (absolute right, aligné verticalement au wordmark). Image = `googleUser.picture`
  dans un `<img>` rond ; **fallback** = `AvatarPill` avec l'initiale du prénom si
  `picture` absent ou en erreur de chargement (`onError`).
- Au clic sur l'avatar → ouvre un **petit menu** (popover) ancré sous l'avatar,
  contenant **« Se déconnecter »**. Le menu se ferme au clic extérieur et sur Esc.
- Quand `googleUser` est absent (démo / onboarding) : **pas d'avatar** (topbar
  inchangée). Le wordmark reste centré ; le geste « 5 taps → réglages » est conservé.

Nouveau (ou inline) `src/components/ProfileMenu.tsx` : le popover « Se déconnecter ».
Léger, dismiss au clic extérieur + Esc (réutilise `useModalA11y` si pertinent, sinon
un backdrop transparent cliquable). `z` au-dessus de la topbar.

### `package.json`

Ajouter la dépendance `@react-oauth/google`.

### `.env` / docs

Documenter `VITE_GOOGLE_CLIENT_ID` (lu par `GoogleOAuthProvider`). L'utilisateur
crée le Client ID (origines autorisées : `http://localhost:5173` + domaine Vercel).
Ne **pas** committer de clé (le Client ID OAuth web n'est pas secret, mais on le
garde en var d'env par propreté + pour gérer dev/prod).

## Flux

```
Pas connecté (userId null ET googleUser null)
  ├─ !demoStarted  → WelcomeScreen
  │     ├─ « Google » → popup Google → userinfo → setGoogleUser → deck (direct)
  │     └─ « Démo »   → setDemoStarted(true) → IdentityPicker
  │                         └─ pick(prénom) → setUserId → app
  └─ demoStarted   → IdentityPicker

Connecté (Google ou démo)            → app normale
  Google : avatar topbar → menu « Se déconnecter » → page d'accueil
  Groupe : « Changer d'identité » visible seulement en démo
Réinitialiser (Résultats)            → tout effacé (dont historique) → page d'accueil
```

## Gestion des erreurs / cas limites

- **Pas de `VITE_GOOGLE_CLIENT_ID`** : bouton Google désactivé + libellé « Connexion
  Google indisponible » ; démo + app intacts. Aucun crash.
- **Popup Google fermée / refus / fetch userinfo KO** : toast d'échec, on reste sur
  la page d'accueil.
- **Déconnexion Google** : via l'**avatar en haut à droite → menu « Se déconnecter »**
  (efface `googleUser`, retour page d'accueil). L'historique local n'est **pas**
  effacé par la déconnexion seule ; il sera de toute façon remis à zéro à la
  prochaine connexion (Google ou choix démo, qui appellent `clearHistory()`).
  « Réinitialiser » (Résultats) reste le moyen d'effacer aussi l'historique.
  Pas de « changer d'identité » en Google (décision).
- **Persistance** : `googleUser` est en `localStorage` → la session survit au reload
  (on ne re-demande pas Google à chaque lancement).
- **Migration** : aucune clé existante renommée ; les utilisateurs en cours (avec
  `yallah.userId.v1` déjà posé) restent en mode démo, ne voient pas la page d'accueil.

## Tests

### Unitaires / composant
- `WelcomeScreen.test.tsx` (nouveau) : rend le wordmark + 2 boutons ; clic Google →
  `onGoogle` ; clic Démo → `onDemo` ; bouton Google désactivé si `googleAvailable=false`.
- `Wordmark.test.tsx` (nouveau, léger).
- `GroupScreen.test.tsx` (maj) : avec `googleUser` → ligne « toi » en tête + bouton
  « Changer d'identité » masqué ; sans → comportement actuel.
- `TopBar.test.tsx` (maj/nouveau) : avec `googleUser` → avatar visible ; clic →
  menu « Se déconnecter » ; clic « Se déconnecter » → `onLogout` appelé ; sans
  `googleUser` → pas d'avatar. Fallback initiale si `picture` absent.
- `App.test.tsx` (maj) :
  - 1er lancement → WelcomeScreen visible, picker non visible ;
  - clic « Mode démo » → picker « Tu es qui ? » visible ;
  - (Google : voir note ci-dessous).
- `useGoogleAuth` : le hook dépend de `@react-oauth/google` + `fetch` ; on teste le
  **mapping userinfo → GoogleUser** (fonction pure extraite `toGoogleUser(raw)`),
  pas le popup OAuth lui-même.

### e2e (Playwright)
- `e2e/identity.spec.ts` (maj) : 1er lancement → page d'accueil ; clic « Mode démo »
  → picker → choix prénom → deck.
- Les specs existantes seedent `yallah.userId.v1='yves'` → **non impactées**
  (page d'accueil non affichée).
- **SSO Google non testé en e2e** (popup OAuth réelle non automatisable simplement) ;
  couvert par le test unitaire du mapping. Noté explicitement.

## Hors scope

- Vérification serveur du token, sessions serveur (inutile sans backend).
- Synchronisation multi-appareils / partage des votes (backlog « plus tard »).
- Affichage de la photo Google dans l'avatar (nice-to-have, initiale suffit).

## Vérification

- `npm test` (+ coverage ratchet), `npm run lint`, `npm run build`, `npm run check:bundle`
  (la nouvelle dép + le provider ne doivent pas faire exploser le budget gzip ;
  vérifier, sinon lazy-load le bloc Google).
- `npm run test:e2e` pour le flux page d'accueil + démo.
