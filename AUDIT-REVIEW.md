# Contre-expertise — AUDIT.md (2026-06-02)

Lecture seule. Vérifications faites sur le code (commit courant `48b8dab`), tests (`npm test` = 233/31 ✓), build (`npm run build` = 126.66 kB gzip main ✓).

---

## 1. Verdict global

**Fiable sur les chiffres, à corriger avant implémentation.** Les métriques (LOC, bundle, tests, headers, flags TS) sont exactes. **Mais** trois recommandations s'appuient sur une mauvaise lecture du code (PERF-07, TEST-04, TEST-10), deux priorités P1 sont disproportionnées pour le contexte v1 (SEC-01, PERF-01/02), et l'audit rate du code mort + une injection HTML directe que sa propre section sécurité aurait dû flagger.

Tel quel : implémenter SEC-02, CSS-01, TEST-01/02, ARCH-04/05 sans réserve. Pour le reste, passer par les corrections ci-dessous.

---

## 2. Désaccords

| ID | Type | Constat de l'audit | Ce que je constate dans le code | Reco |
|---|---|---|---|---|
| **PERF-07** | Factuel | "`MAURITIUS_CENTER` constant et `BoundsFitter` dans `FullscreenMap.tsx:31-63` sont recréés à chaque render. Préfixer par `useMemo` ou les sortir au top-level." | `MAURITIUS_CENTER` est déjà module-level (`FullscreenMap.tsx:34`). `BoundsFitter` est déjà une fonction top-level (`:46`). `verdictPinIcon` aussi (`:38`). Aucun n'est recréé par render. Le seul vrai coût restant : `verdictPinIcon(p.activity, p.verdict)` appelé inside `.map()` (`:121`) crée des `L.DivIcon` à chaque render. | **Reformuler** : memoizer par-pin via `useMemo` sur `pins`, retirer le reste du texte. |
| **TEST-04** | Factuel | "Aujourd'hui les tests existants ne couvrent que le happy path." | `useLocalStorage.test.ts` couvre déjà : parsing failure (`:42-48`), cross-tab change (`:50-63`), cross-tab clear (`:65-76`). Les seuls vrais cas manquants : `setItem` qui throw (QuotaExceeded) + `storage` event avec `newValue` non parsable. | **Reformuler** : citer les 2 cas réellement manquants, supprimer la mention "happy path only". |
| **TEST-10** | Factuel | "Tests Playwright manquants : (a) parcours random-fill, (b) ajout d'activité, (c) bascule d'identité depuis Groupe." | (a) **Couvert** par `e2e/review-prompt.spec.ts:16-23` et `e2e/add-activity.spec.ts:30-36`. (b) **Couvert** par `e2e/add-activity.spec.ts` (les deux tests). (c) **Couvert** par `e2e/identity.spec.ts:42-58` (`'"Changer d\'identité" reopens the dismissable picker'`). | **Supprimer (a) (b) (c)**. Seul `tag-legend.spec.ts` reste défendable comme nouveau test. |
| **TEST-06b** | Factuel | "reset depuis Résultats vide history ET userId (vérifié visuellement aujourd'hui mais sans test)." | `App.test.tsx:125-139` (`'reset from résultats clears history after confirmation'`) couvre exactement ça. | **Supprimer.** |
| **SEC-01** | Priorité | P1 — préparer CSP sans `'unsafe-inline'`. | v1 = SPA closed beta, 9 utilisateurs nommés, aucun backend, aucun rendu HTML utilisateur (`rg dangerouslySetInnerHTML src/` = 0). Le seul vecteur XSS théorique est l'interpolation user-controlled dans `mapMarkers.ts` (voir NEW-03), que cette tâche ne corrige pas. Effort L pour zéro gain dans le scope actuel. | **Reclasser P3** ou conditionner à la décision "v1 reste fermé / v2 ouvre" ; recommander d'attaquer NEW-03 d'abord. |
| **PERF-01** | Priorité | P1 — lazy-load `activities.json` (gain ~35 kB gzip). | Le bundle est déjà à 126.66 kB gzip total avec ces données ; les activities sont nécessaires à la première carte rendue. Dynamique = ajout d'un état de chargement / écran vide avant la première card. Sur SPA mobile 4G, le 35 kB ne change pas la perception ; le splash supplémentaire si. | **Reclasser P2** et lier explicitement à PERF-03 (budget) — pas de lazy-load sans budget pour le justifier. |
| **PERF-02** | Priorité | P1 — lazy-load `photos.json`, n'inliner que les URL hero. | `heroPhotoUrl` est appelé dès la première carte. "N'inliner que les URLs hero" = 198 URLs (~30 kB raw, ~8 kB gzip économisés). Pour un gain de 8 kB gzip, complexifier le pipeline photos est sur-dimensionné. | **Reclasser P3** ou supprimer. |
| **PERF-04** | Factuel | "`useLocalStorage` … sérialise et écrit en synchrone à chaque setState. Un debounce de ~80 ms supprime les jank lors d'un random-fill rapide." | `handleRandomFill` (`App.tsx:244-284`) fait **un seul** `setHistory((h) => [...h, ...additions])`. Il n'y a pas de boucle de `setItem` à debouncer. La sérialisation `JSON.stringify` sur 198 entrées { id, verdict } = ~7 kB, exécution < 1 ms. Pas de jank mesurable. | **Supprimer**. |
| **PERF-05** | Opinion | P2 — driver la transform de drag via CSS variable hors React (~60 fps sur appareils anciens). | Le re-render React pendant drag est limité au `<SwipeDeck>` et son fils direct (`Card` est memoisable). 60 fps déjà atteint sur iPhone récent en testant manuellement. Optimisation prématurée, à valider par mesure réelle d'abord. | **Garder P2 mais conditionner** à un profilage qui prouve le bottleneck. |
| **CSS-02** | Opinion | P2 — adopter `clsx`. | Le code utilise peu de classes conditionnelles longues. Ajout d'une dépendance pour confort cosmétique. | **Reclasser P3.** |
| **TS-03** | Opinion | "Modéliser le source DetailModal en discriminated union… rendre invalides `source: 'swipe' && reviewMode`." | DetailModal n'a aucun prop `reviewMode` (`DetailModal.tsx:101-118`). `reviewMode` est un état parent. La "combinaison interdite" décrite n'est pas un schéma type-modélisable au niveau du composant. | **Reformuler** ou supprimer — la valeur réelle est faible. |

---

## 3. Faux positifs / erreurs de référence

| ID | Référence donnée | Réalité | Sévérité |
|---|---|---|---|
| TS-01 | `stack[0]` à `SwipeDeck.tsx:119` | ligne 123 (`const current = stack[0]`) | mineure |
| SEC-01 | drag transform à `SwipeDeck.tsx:243` | ligne 229 (dans `cardTransform`) | mineure |
| TS-02 | `as Activity[]` à `src/data/activities.ts:8` | ligne 9 | mineure |
| TS-02 | cast `photos.ts:7` | ligne 9 | mineure |
| TS-02 | cast `links.ts:9` | ligne 13 | mineure |
| PERF-07 | `verdictPinIcon line 35` | ligne 38 | mineure |
| TS-02 | "4 same casts" | il n'y en a que 3 (`activities.ts:9`, `photos.ts:9`, `links.ts:13`) | mineure |
| TEST-04 | (voir tableau §2) | rationale globalement fausse | **majeure** |
| TEST-10 | (voir tableau §2) | 2/3 des "nouveaux tests" existent déjà | **majeure** |
| PERF-07 | (voir tableau §2) | top-level déjà, audit recommande de faire ce qui est déjà fait | **majeure** |
| TEST-06b | (voir tableau §2) | déjà testé | **majeure** |

---

## 4. Angles morts (problèmes réels manqués par l'audit)

| ID | P | Axe | Tâche | Fichier(s) clés | Effort | Impact |
|---|---|---|---|---|---|---|
| **NEW-01** | P2 | Arch / Cleanup | **`src/components/MetaChip.tsx` est du code mort.** Le composant est défini et exporté mais aucun import dans le reste de `src/` (`rg 'from .*/MetaChip' src/` = 0). L'audit le liste parmi les "10 composants sans test" sans noter qu'il est aussi inutilisé. Supprimer le fichier (ou trouver l'endroit où il devait servir et le brancher). | `src/components/MetaChip.tsx` | S | Supprime 30 lignes mortes ; évite un test inutile. |
| **NEW-02** | P1 | Tests | **`migrateHistory` (`App.tsx:54-58`) n'a aucun test direct.** Le seul test de la migration `neutre→whynot` passerait par un setup `localStorage.setItem(..., 'neutre')` + rendu de `<App />`. ARCH-05 propose de déplacer la fonction "avec un test dédié" mais ne couvre pas le besoin avant relocation. La prochaine migration de verdict casserait silencieusement. | `src/App.tsx`, créer `src/App.test.tsx` (cas migration) | S | Anti-régression sur la migration verdict actuelle ET les futures. |
| **NEW-03** | P2 | Sécurité | **Injection HTML directe via URL photo user-pasted dans `mapMarkers.ts:36`.** Le template `background-image:url('${photo}')` est concaténé puis passé à `L.divIcon({ html })`. Pour les activités user-added, `heroPhotoUrl` retourne `activity.photoUrls[0]`, alimenté par `urlInput` dans `AddActivityScreen.tsx:94` sans validation. Une URL contenant `'` permet de sortir du contexte CSS et d'injecter du HTML arbitraire dans une popup map. Scope : utilisateur s'auto-attaque (faible en v1 closed beta), mais c'est l'unique vecteur XSS concret du projet — et l'audit ne le voit pas tout en proposant un refactor CSP de 1+ semaine (SEC-01). | `src/utils/mapMarkers.ts`, `src/components/AddActivityScreen.tsx` | S | Valide l'URL (whitelist `https://`/`blob:`, refus de `'`, `<`, `>`) au moment du paste. |
| **NEW-04** | P2 | Accessibilité | **`Card.tsx:38` rend la photo via `background: url(...)` sans alternative texte.** Pour les lecteurs d'écran, seule la `<h2>` du titre est annoncée — la photo est invisible (et le côté "visuel-first" du swipe n'a aucun analogue audio). PhotoLightbox a bien `alt` (`:131`), Card non. À ajouter sur le wrapper photo : `role="img"` + `aria-label={\`Photo : \${activity.title}\`}`. Manquant côté audit qui ne traite que `prefers-reduced-motion` (CSS-01). | `src/components/Card.tsx` | S | WCAG 1.1.1 ; couplé à CSS-01 pour une vraie passe a11y. |
| **NEW-05** | — | Méta | **Ordre d'implémentation imposé non mis dans la TODO.** Les notes de fin mentionnent que SEC-01 dépend de CSS-03 qui dépend de ARCH-02/03/04, mais aucune colonne "depends-on" dans la table. Un dev qui prend SEC-01 isolé découvrira la dépendance mi-implémentation. Idem TEST-02 qui requiert TEST-01 d'abord — déjà noté mais en notes de bas de page. | (table TODO de l'audit) | S | Ajouter colonne `depends-on` ou regrouper en chantiers (`security`, `tests`, `arch`). |

---

## 5. Risques d'ordre / dépendances

À grouper / sérialiser :

- **Chantier "tests"** : `TEST-01` → `TEST-02` (cliquet seulement quand coverage instrumenté). Faire **TEST-01 d'abord seul**, mesurer la couverture réelle, **puis** poser le seuil — sinon on choisit un plancher arbitraire.
- **Chantier "CSP stricte"** : `ARCH-04 (MetaPill)` → `CSS-03 (déstyler inline)` → `SEC-01 (nonce CSP)`. Dans cet ordre, sinon CSS-03 sera fait deux fois (avant et après extraction de MetaPill). Si SEC-01 reste P3 comme recommandé, la chaîne entière peut être différée.
- **`NEW-03` doit précéder `SEC-01`.** Inutile de durcir la CSP avant de fermer l'injection HTML existante : l'attaquant n'utiliserait pas un inline-style pour exploiter `mapMarkers.ts`, il utiliserait directement le `divIcon({ html })`. CSP `style-src` ne protège pas contre ça (il faudrait `script-src` strict + sandboxing).
- **`ARCH-01` (split App.tsx)** ne doit **pas** se faire avant `NEW-02` (test migration) sous peine de perdre l'attache test ↔ migration pendant le déplacement.

---

## 6. Notes brèves

- **Volume des tests** : audit dit 233 tests / 31 fichiers ✓ (vérifié). Le `CLAUDE.md` indique "134 unit tests across 19 files" — c'est `CLAUDE.md` qui est obsolète, pas l'audit.
- **`npm audit` propre** : non re-vérifié dans cette session, présomption de confiance.
- **Bundle** : 126.66 kB gzip main mesuré, audit dit 127 kB — arrondi correct.
- **Quick wins (§4 de l'audit)** : `ARCH-04`, `ARCH-05`, `SEC-02`, `CSS-01`, `TEST-01` sont effectivement S/15 min et sans risque. `TS-01` (juste le flag, sans la cascade) est trompeur : activer `noUncheckedIndexedAccess` casse `stack[0]`, `photos[0]`, `superPool.slice(0, n)[i]`, `additions[i]` etc. — pas réellement un quick-win.
