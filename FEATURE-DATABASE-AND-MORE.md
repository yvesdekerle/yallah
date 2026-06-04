# Feature: base de données Firebase + profil/groupe (branche `feature/add-database-and-more`)

Suivi du chantier. **On traite point par point**, un commit par feature, tests à chaque
étape, vérif (`npm test` + `npm run lint` + `npm run build`) avant de passer au suivant.

> ⚠️ **Mise en prod différée.** Tant que les variables `VITE_FIREBASE_*` ne sont pas
> configurées, l'app retombe proprement en **mode démo** (Google SSO indisponible, comme
> aujourd'hui sans `VITE_GOOGLE_CLIENT_ID`). Ne **pas merger sur `main`** avant que le projet
> Firebase soit créé et testé, sinon le SSO de production casse. Le dev local + les e2e
> continuent de tourner en mode démo sans Firebase.

## Décisions d'architecture (validées avec Yves)

1. **Auth = Firebase Auth + GoogleAuthProvider** (remplace `@react-oauth/google`).
   → `request.auth.uid` côté serveur ⇒ vraies règles de sécurité Firestore.
   Fallback mode démo si Firebase non configuré.
2. **Activités = seed Firestore + lecture hybride.** Les 198 curées + les user-added sont
   poussées dans Firestore (la DB a « tout le détail »). L'app lit le **JSON bundlé en
   priorité** (rapide / offline) ; Firestore est la source de vérité pour les activités
   ajoutées, le « créé par » et l'édition partagée. Coût/latence Firestore minimal.
3. **Mode démo (point 7)** : on **garde** les faux participants + faux votes. Le point 9
   (vrais utilisateurs) ne s'applique qu'en mode Google.

---

## Ordre de traitement (par dépendance & risque)

| # | Item | Statut |
|---|------|--------|
| **1** | Fondation Firebase : config + Auth Google + modèle de données Firestore + script de seed + règles de sécurité + récap des données | ✅ fait |
| **3** | Profil : afficher le **nom** (pas le mail) + entrée **« Paramètres »** (→ page réglages) | ✅ |
| **4** | Fausse photo de profil + même menu en **mode démo** | ✅ |
| **5** | « Se déconnecter » → **page d'accueil** pour les 2 types de profil | ✅ |
| **6** | Réglages : **supprimer** le bouton « Retour à l'accueil » | ✅ |
| **8** | Activités : champ **« créé par »** (nom/prénom conservé) | ⏳ |
| **2** | Version par utilisateur en BDD : comparer vs version app, **recharger** si différent | ⏳ |
| **9** | Groupe (mode Google) : **vrais** utilisateurs (tri alpha par prénom) + **vrais** votes ; idem écran fullscreen votes-sous-carte. Règle « révélés quand ton deck est fini » conservée | ⏳ |

> L'item 1 est fait en premier car tout le reste s'appuie sur l'identité (uid) et la DB.
> L'auth switch (`@react-oauth/google` → Firebase Auth) est inclus dans l'item 1.

---

## Items (détail)

### 1. Fondation base de données (Firebase)
- `firebase` SDK, `src/services/firebase/` (init guardé par env, auth, firestore).
- Switch auth → Firebase Auth `GoogleAuthProvider` (`signInWithPopup`), conserve la forme
  `GoogleUser { uid, name, email, picture }` pour minimiser le rework UI.
- Couche d'accès dégradée gracieusement (pas de config Firebase ⇒ mode démo).
- Script `scripts/seed-firestore.ts` (poussé demain par Yves).
- `firestore.rules` (chacun n'écrit que ses votes / le doc version de son uid).
- **Récap des données en BDD** (voir ci-dessous, livrable de l'item).

### 2. Version par utilisateur
- Doc Firestore `users/{uid}.appVersion`. À la connexion + via listener temps réel
  (`onSnapshot`) : si version serveur ≠ version app embarquée ⇒ reload (recommandation :
  écouter en continu plutôt qu'au changement de page, couvre tous les cas).

### 3. Profil affiche le nom + entrée Paramètres
- `ProfileMenu` : remplacer `user.email` par `user.name`. Ajouter une entrée « Paramètres »
  au-dessus de « Se déconnecter », qui ouvre la `SettingsModal` (même cible que les 5 taps).

### 4. Photo de profil + menu en mode démo
- En mode démo, monter le `ProfileMenu` avec une fausse photo/avatar (initiale du participant
  choisi). Même menu (Paramètres + Se déconnecter).

### 5. Déconnexion → accueil (2 profils)
- `handleLogout` (Google) et l'équivalent démo renvoient à la `WelcomeScreen`.

### 6. Réglages : retirer « Retour à l'accueil »
- Supprimer le bouton de `SettingsModal` (l'action de retour passe désormais par la
  déconnexion, item 5).

### 8. « Créé par » sur les activités
- `Activity` / `StoredUserActivity` : champ `createdBy { uid, name }` (curées = `'curated'`).
- Capturé au `submit()` depuis l'utilisateur courant ; affiché dans `DetailModal`
  (« Créé par {prénom} » / « Créé par toi »).

### 9. Groupe + votes réels (mode Google)
- En mode Google : plus de participants en dur. Lister les utilisateurs **authentifiés Google**
  triés alpha par prénom, avec leurs **vrais** votes (Firestore).
- Règle conservée : votes des autres révélés quand mon deck est fini (🔒 sinon).
- Idem `DetailGroupVotes` (votes sous la carte) : vrais votes uniquement.
- Mode démo : inchangé (faux participants/votes).

---

## Récapitulatif des données en BDD (livrable item 1) ✅

Trois collections Firestore (types : `src/types/firestore.ts` ; règles : `firestore.rules`).
Auth = Firebase Auth (Google) ⇒ chaque clé `uid` = `auth.currentUser.uid`.

### `users/{uid}` — un doc par compte Google connecté
| champ | type | note |
|---|---|---|
| `uid` | string | = id du doc |
| `name` | string | nom affiché (Google `displayName`, fallback = partie locale du mail) |
| `email` | string | |
| `picture` | string? | URL avatar Google (optionnel) |
| `appVersion` | string | version de l'app au dernier accès (→ item 2 force reload) |
| `updatedAt` | timestamp | écrit à chaque connexion |

Écrit à la connexion / au restore de session (`useFirebaseAuthSync` → `upsertUserProfile`).

### `votes/{uid}` — un doc par utilisateur, tous ses votes
| champ | type | note |
|---|---|---|
| `uid` | string | |
| `name` | string | dénormalisé (l'écran Groupe n'a pas à joindre `users`) |
| `activities` | map `{ [activityId]: { verdict, quotaHit? } }` | un vote par activité |
| `updatedAt` | timestamp | |

Un seul doc/utilisateur (pas de sous-collection) : l'écran Groupe lit toute la
collection `votes` en quelques lectures. Écriture par merge de la clé
`activities.<id>` (ajout/maj) ou `deleteField` (undo/suppression) — jamais d'écrasement
global, donc un device neuf ne peut pas effacer les votes d'un autre.

### `activities/{activityId}` — détail complet, curées (seedées) + user-added
Tout le détail de l'`Activity` (titre, tags, lieu, description, prix, note, coords,
photoUrls, …) + `createdBy { uid, name }`. **Absent ⇒ curée** (house pick, lecture seule
côté client). Seedé via `npm run seed:firestore` (Admin SDK, contourne les règles).

### Sécurité (résumé `firestore.rules`)
- lecture : tout utilisateur authentifié (groupe partagé, petit groupe de confiance) ;
- `users/{uid}` & `votes/{uid}` : écriture **uniquement par le propriétaire** (`auth.uid == uid`) ;
- `activities` : création/maj **uniquement de ses propres** activités (`createdBy.uid == auth.uid`) ; curées en lecture seule.

### Bundle / perf
Le SDK Firebase (~105 kB gzip) est isolé dans un chunk `firebase-*` **chargé à la demande**
(jamais dans l'entrée). Garde anti-fuite dans `scripts/check-bundle-size.ts`. Entrée
principale toujours sous le budget 105 kB.

---

## Clôture
- Review du code produit (perf / sécurité / a11y) + itération sur les points faibles.
- Bump du numéro de version + push.
- Demain : Yves crée le projet Firebase, on teste en prod.
