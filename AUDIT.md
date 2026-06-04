# Audit technique — Yallah

> Audit réalisé en lecture seule (aucun fichier de code modifié hors ce livrable).
> Méthode : Explore → Plan → Audit. Toutes les mesures ci‑dessous sont **réelles**
> (exécutées sur la branche `main`, toolchain Node v24.13.0).

---

## 0. Synthèse d'exploration (chiffres bruts)

### Mesures

| Mesure | Valeur réelle | Note de la doc (périmée) |
|---|---|---|
| Tests unit/composant | **363 tests** (126 suites), **100 % vert** | CLAUDE.md : 134 / brief : 101 |
| Tests e2e Playwright | **31 `test()`** dans **11 specs** | CLAUDE.md : 11 / brief : 10 |
| Couverture lignes | **85.77 %** | seuil CI : 84 |
| Couverture branches | **82.21 %** | seuil CI : 80 |
| Couverture fonctions | **79.87 %** | seuil CI : 77 |
| Couverture statements | **83.55 %** | seuil CI : 82 |
| `npm audit --omit=dev` | **0 vulnérabilité** | — |
| `npm audit` (incl. dev) | **0 vulnérabilité** | — |
| Build | **OK** (`vite v8.0.14`, 136 modules, 1.94 s) | — |

### Bundle (gzip, sortie Vite)

| Chunk | Brut | gzip | Statut |
|---|---|---|---|
| `index-*.js` (entrée eager) | 358.6 kB | **101.8 kB** | **au plafond** (budget 105 kB) |
| `activities-*.js` (données, code‑split) | 111.9 kB | 29.1 kB | budget data 40 kB ✓ |
| `TileLayer-*.js` (Leaflet, lazy) | 152.6 kB | 44.7 kB | exclu du budget (vendor) ✓ |
| `FullscreenMap` / `LocationPicker` / `ActivityMiniMap` (lazy) | — | 1.5 / 1.9 / 0.9 kB | ✓ |
| `index-*.css` | 26.2 kB | 9.5 kB | ✓ |

### Cartographie `src/` (≈ 16 200 LOC ts/tsx incl. tests/scripts/e2e)

- **~41 composants** `.tsx` (+ tests colocalisés), **8 hooks**, **14 utils**, **4 fichiers de types**, couche `data/` (json + adaptateurs).
- **Couche claire** : `App.tsx` (orchestrateur) → `SwipeScreen`/`ResultsScreen`/`GroupScreen`/`AddActivityScreen` + `AppOverlays` → composants ; **hooks = couche données** (`useVoteHistory`, `useUserActivities`, `useModalOverlays`, `useAddActivityForm`, `useMapPins`, `useToast`, `useAppVersionCheck`, `useLocalStorage`) ; **utils purs** (swipe, coords, distance, format, photoUrl, mapMarkers…).
- **Aucun fichier orphelin** (scan : chaque module non‑test est importé ailleurs).
- **Aucun barrel file** problématique (`icons/index.tsx` est un module de composants, pas un ré‑export tree‑shaking‑hostile).
- 10 plus gros fichiers source : `photo-query.ts` (488, script), `preview-photos.ts` (472, script), `App.tsx` (454), `AddActivityScreen.tsx` (399), `ResultsScreen.tsx` (398), `download-photos.ts` (377, script), `SwipeDeck.tsx` (372), `icons/index.tsx` (312), `Card.tsx` (311), `useAddActivityForm.ts` (306).

### Fichiers applicatifs les moins couverts (cibles tests)

| Fichier | Lignes | Fonctions | Branches |
|---|---|---|---|
| `LocationPicker.tsx` | 47.4 % | 60 % | 60.4 % |
| `AddActivityScreen.tsx` | 62.1 % | 42.9 % | 94.1 % |
| `App.tsx` | **63.1 %** | **45.2 %** | **55.8 %** |
| `Card.tsx` | 61.1 % | 50 % | 90 % |
| `photos.ts` | 62.5 % | 100 % | 95.5 % |
| `DetailBody.tsx` | 66.7 % | 75 % | 100 % |
| `SwipeDeck.tsx` | **68.8 %** | **52.9 %** | **71.2 %** |
| `useModalOverlays.ts` | 69.2 % | 33.3 % | — |

---

## 1. Synthèse exécutive

| Axe | Note | Indicateur |
|---|---|---|
| A. Architecture & réutilisabilité | **15 / 20** | 🟡 |
| B. TypeScript & qualité | **17 / 20** | 🟢 |
| C. Performance | **16 / 20** | 🟢 |
| D. Sécurité | **18 / 20** | 🟢 |
| E. CSS / Tailwind | **14 / 20** | 🟡 |
| F. Tests | **16 / 20** | 🟢 |
| **Global (pondéré)** | **16.3 / 20** | 🟢 |

> Pondération : Sécurité ×1.5, Tests ×1.5, Architecture/TS/Performance ×1, CSS ×0.5.
> `(15 + 17 + 16 + 18×1.5 + 14×0.5 + 16×1.5) / 6.5 = 106 / 6.5 = 16.3`

**Projet sain et soigné, sans dette structurelle.** Sécurité exemplaire (CSP sans `unsafe-*`, suite de headers complète, surface XSS unique — les marqueurs Leaflet — neutralisée structurellement et testée), TypeScript au maximum de la rigueur (tous les flags stricts, **zéro `any`/`@ts-ignore`**), tests nombreux avec cliquet CI. La dette est ciblée : quelques gros composants multi‑responsabilités, une explosion de props sur `AppOverlays`, des valeurs CSS répétées non tokenisées, et une couverture faible sur les deux fichiers les plus critiques (`App.tsx`, `SwipeDeck.tsx`).

### 3 problèmes les plus critiques

> **Aucun P0** : pas de vulnérabilité ni de bug bloquant détecté. Les priorités hautes sont des P1 (dette importante / fragilité).

1. **`TEST-01`** — `App.tsx` (orchestrateur, tout le câblage des handlers) n'est couvert qu'à **63 % L / 45 % F / 56 % B** ; c'est le fichier pivot et l'axe le plus pondéré.
2. **`PERF-01`** — l'entrée eager est à **101.8 kB gzip, au plafond du budget 105 kB**, alors que tout l'onglet « Ajouter » (≈ 700 LOC) y est chargé eager : une régression casse le CI et alourdit le first‑paint pour rien.
3. **`TS-01`** — pas de lint *type‑aware* : les promesses flottantes des handlers `async` ne sont pas détectées (le code les `void` à la main — `App.tsx:434`, `LocationPicker.tsx:122` — preuve que le risque est connu mais non outillé).

---

## 2. TODO list priorisée

> **ID stable** = clé d'implémentation (ne change jamais). P0 = sécu/bug bloquant · P1 = dette importante · P2 = amélioration. Effort : S ≤ ~1 h · M ≈ ½ j · L ≈ 1‑2 j.

| ID | Prio | Axe | Tâche | Fichier(s) | Effort | Impact | Commit suggéré |
|---|---|---|---|---|---|---|---|
| **TEST-01** | P1 | Tests | Couvrir les handlers de `App` (reset, randomFill, add/update/delete activity, pickIdentity, detailVerdict, exitReview, complete) + bascule onglets + gate onboarding. Cible ≥ 80 % branches | `App.tsx`, `App.test.tsx` | M | Élevé | `test(app): cover orchestration handlers and tab gating` |
| **TEST-02** | P1 | Tests | Couvrir les branches de geste de `SwipeDeck` (seuils verdict, tap‑vs‑drag, downgrade quota, `topIdx` review, timings d'exit). Cible ≥ 80 % branches | `SwipeDeck.tsx`, `SwipeDeck.test.tsx` | M | Élevé | `test(swipe-deck): cover gesture and commit branches` |
| **PERF-01** | P1 | Perf | Code‑splitter l'onglet « Ajouter » (`AddActivityScreen` + champs + pickers) via `React.lazy`/`Suspense` pour le sortir du chunk eager (récupère ~plafond budget) | `App.tsx`, `AddActivityScreen.tsx` | M | Élevé | `perf(bundle): code-split the add-activity tab` |
| **TS-01** | P1 | TS | Activer ESLint *type‑checked* (`typescript-eslint` `recommendedTypeChecked` ou a minima `no-floating-promises`, `no-misused-promises`, `no-unnecessary-condition`) avec `parserOptions.project` | `eslint.config.js`, `tsconfig.*` | M | Élevé | `chore(lint): enable type-aware eslint rules` |
| **ARCH-01** | P1 | Arch | Extraire un `<ModalShell>`/`<BottomSheet>` partagé (backdrop + `stopPropagation` + `role=dialog`/`aria-modal`/`aria-label` + **Esc‑to‑close** + **focus‑trap & retour focus** + bouton fermer). Adopter dans Confirm/Identity/TagFilter/Detail/Settings/Fullscreen. Supprime la duplication ET comble les manques a11y (Detail/Settings n'ont pas d'Esc, aucun modal n'a de focus‑trap) | `ConfirmModal.tsx`, `IdentityPicker.tsx`, `TagFilterSheet.tsx`, `DetailModal.tsx`, `SettingsModal.tsx`, `FullscreenMap.tsx`, *(nouveau)* `ModalShell.tsx` | L | Élevé | `refactor(components): extract ModalShell with esc + focus trap` |
| **PERF-02** | P2 | Perf | `useMemo` sur `tagPalette` (recréé à chaque render) + `memo()` `TagPickerPanel` → stoppe le re‑render du sélecteur de tags à chaque frappe | `useAddActivityForm.ts`, `TagPickerPanel.tsx` | S | Moyen | `perf(add-activity): memoize tag palette and picker` |
| **PERF-03** | P2 | Perf | Mémoïser `activity.tags.slice(0,3)` (calculé 2× par render) ; `memo()` `PhotoLightbox` et `DetailGroupVotes` (re‑render avec `DetailModal`) | `DetailHero.tsx`, `PhotoLightbox.tsx`, `DetailGroupVotes.tsx` | S | Faible | `perf(detail): memoize tag slice and heavy children` |
| **PERF-04** | P2 | Perf | Stabiliser les handlers `onMouseDown/Up/Leave` recréés par ligne dans la liste Résultats (extraire `VotedActivityRow` mémoïsé — voir `ARCH-02`) | `ResultsScreen.tsx` | S | Faible | `perf(results): stabilize per-row press handlers` |
| **PERF-05** | P2 | Perf | Self‑host / subset des 3 familles Google Fonts (lien render‑blocking ; `display=swap` & `preconnect` déjà OK) | `index.html` | M | Faible | `perf(fonts): self-host and subset webfonts` |
| **SEC-01** | P2 | Sécu | Appliquer `cssUrlValue()` aux `background: url(${preview})` inline (cohérence avec `mapMarkers`). **Pas une faille** (sink CSSOM + `isSafePhotoUrl` au paste), durcissement défense‑en‑profondeur | `PhotoPickerPanel.tsx`, `AddActivityScreen.tsx` | S | Faible | `refactor(security): escape css url() in inline backgrounds` |
| **SEC-02** | P2 | Sécu | Documenter / resserrer `img-src https:` (large — nécessaire pour les URLs photo collées ; vecteur fuite‑referrer). Décision à acter, pas un bug | `vercel.json` | S | Faible | `docs(security): justify or tighten img-src directive` |
| **ARCH-02** | P2 | Arch | Découper `ResultsScreen` (398 LOC) : `VerdictSummaryTiles` (tuiles stats) + `VotedActivityList`/`VotedActivityRow` | `ResultsScreen.tsx` | M | Moyen | `refactor(results): split into summary tiles and voted list` |
| **ARCH-03** | P2 | Arch | Découper `AddActivityScreen` (399 LOC) : extraire `StoredActivityList` (section « Mes activités ajoutées ») | `AddActivityScreen.tsx` | M | Moyen | `refactor(add-activity): extract StoredActivityList` |
| **ARCH-04** | P2 | Arch | Extraire `usePhotoLifecycle` de `useAddActivityForm` (306 LOC) : possession des object‑URLs + révocation + validation URL | `useAddActivityForm.ts` | M | Moyen | `refactor(add-activity): extract usePhotoLifecycle hook` |
| **ARCH-05** | P2 | Arch | Découper `DetailMetaTiles` (282 LOC) : `DifficultyWarning` + `DriveTimes` (garder `MetaTile` privé) | `DetailMetaTiles.tsx` | S | Faible | `refactor(detail): split DetailMetaTiles sections` |
| **ARCH-06** | P2 | Arch | Réduire l'explosion de props de `AppOverlays` (~45 props) : regrouper en objets cohérents ou exposer `useModalOverlays` via un contexte ponctuel consommé par `AppOverlays` | `App.tsx`, `AppOverlays.tsx`, `useModalOverlays.ts` | M | Moyen | `refactor(app): group overlay props / context` |
| **ARCH-07** | P2 | Arch | `<PillButton>` partagé (`Chip`/`Toggle` de `AddActivityFields`, `TagPickerPanel`, chips `TagFilterSheet`) + `<AvatarPill>` (`DetailGroupVotes`/`GroupScreen`) | `AddActivityFields.tsx`, `TagPickerPanel.tsx`, `TagFilterSheet.tsx`, `DetailGroupVotes.tsx`, `GroupScreen.tsx` | M | Moyen | `refactor(ui): extract shared PillButton and AvatarPill` |
| **ARCH-08** | P2 | Arch | (Optionnel) Extraire `useSwipeGesture` + `<TagButtons>` de `SwipeDeck`(372)/`Card`(311) | `SwipeDeck.tsx`, `Card.tsx` | M | Faible | `refactor(swipe): extract gesture hook and tag buttons` |
| **ARCH-09** | P2 | Arch | Modéliser le mode de l'écran swipe en union discriminée (`'swiping' \| 'review' \| 'done'`) au lieu des booléens `done`/`reviewMode` | `App.tsx` | S | Faible | `refactor(app): model swipe mode as discriminated union` |
| **TS-02** | P2 | TS | Passer `no-unused-vars` et `no-explicit-any` en `error` ; restreindre les globals Node aux scripts/config (actuellement `globals.node` appliqué à tout `src/`) | `eslint.config.js` | S | Faible | `chore(lint): error on unused vars and any, scope node globals` |
| **TS-03** | P2 | TS | Type `CSSVars = CSSProperties & Record<\`--${string}\`, string\|number>` pour remplacer `as React.CSSProperties` | `SwipeDeck.tsx:288`, `SuperLikeFX.tsx:148`, *(types)* | S | Faible | `refactor(types): typed CSS custom properties helper` |
| **CSS-01** | P2 | CSS | **(Phase 1 — tokens)** Tokeniser dans `theme.ts` les valeurs répétées : `YB.surface` (`#fff` ×~30), `YB.shadow.{sm,md,lg}` (`rgba(20,30,50,.06/.08/.15/.25)`), `YB.backdrop.{light,heavy}` (`rgba(20,25,40,.5/.55/.85)`), puis remplacer les littéraux. Corriger 2 cas concrets : `PhotoLightbox.tsx:143` `#181B1F`→`YB.ink`, `AddActivityScreen.tsx:180` `#C9C4BA` (gris hors palette) | `utils/theme.ts` + ~18 composants | M | Moyen | `refactor(css): tokenize surface/shadow/backdrop values` |
| **CSS-02** | P2 | CSS | **(Phase 2 — @apply)** Extraire les motifs récurrents en composants `@apply` (comme `.yallah-action-btn` déjà existant) : `.yallah-card` (arrondi+ombre+padding répété dans `ResultsScreen`/`GroupScreen`/`SettingsModal`/`DetailMetaTiles`/`DetailGroupVotes`), `.yallah-sheet` + `.yallah-backdrop` (modals). `style={{}}` ne porte alors plus que des valeurs calculées en JS (convention CLAUDE.md enfin tenue) | `index.css` + composants concernés | M | Moyen | `refactor(css): extract @apply card/sheet/backdrop components` |
| **CSS-03** | P2 | CSS | **(Phase 3 — enforcement)** Garde-fou CI qui échoue si un `#fff`/`rgba(`/hex brut réapparaît dans `src/components/**` (test ou grep, sur le modèle du cliquet bundle/couverture). C'est ce qui fait passer « bien fait » → « exemplaire » (18) | *(nouveau)* `scripts/check-css-tokens.ts` + `ci.yml` | S | Moyen | `test(css): guard against raw color literals in components` |
| **CSS-04** | P2 | CSS | Échelles de tokens `radius` (12/14/16/99) + `z-index` (`z-[9]/[40]/[50]/[80]` aujourd'hui magiques) ; enregistrer les 2 keyframes manquantes (`yallahDeckExit`, `yallahSparkleFly`) dans `animation` ou documenter le inline ; nommer les px magiques du `@media (max-width:460px)` | `tailwind.config.js`, `index.css` | S | Faible | `refactor(css): add radius/z-index scales, register keyframes` |
| **TEST-08** | P2 | Tests | Relever le cliquet de couverture après les gains (L 84→87, B 80→84, F 77→82, S 82→86) | `vite.config.ts` | S | Moyen | `chore(ci): raise coverage ratchet after gains` |

---

## 3. Plan de test & anti‑régression

> Objectif : seuil élevé sur le code applicatif (`components`, `hooks`, `utils`), priorité au **branch coverage** et aux **parcours critiques**, tests de comportement (Testing Library) plutôt que d'implémentation. Les exclusions de couverture (`vite.config.ts`) sont **bien choisies** (`main.tsx`, `*.d.ts`, `*.test.*`, `types/**`, json/data statiques, `constants/swipe.ts`, `theme.ts`, `icons/index.tsx`) — RAS, sauf `icons` (voir `TEST-07`).

### Module `App.tsx` — `TEST-01` (P1) · actuel 63 % L / 45 % F / 56 % B

| Branche / cas non couvert | Test à écrire | Type |
|---|---|---|
| `handleReset` (vide history + repasse en onboarding) | clic « Réinitialiser » → confirm → history vidé + IdentityPicker réapparaît | intégration |
| `handleRandomFill` (added.length 0 vs > 0 → toast + done) | déclencher avec deck partiel puis complet | intégration |
| `handleAddActivity` / `handleUpdateActivity` (async + `setDone(false)` + toast) | ajout via onglet, vérifier nouvelle carte joignable | intégration |
| `handleConfirmDeleteActivity` (`removeVotesFor`) | supprimer une activité votée → vote disparaît | intégration |
| `handlePickIdentity` (onboarding vs changement) | 1er pick (wipe) vs « changer d'identité » (garde history) | intégration |
| `handleDetailVerdict` source `swipe` vs `review` | voter depuis modal ouvert du swipe vs depuis Résultats | intégration |
| `handleComplete` early‑return si `filterActive` | finir un deck filtré → pas de prompt global | intégration |

### Module `SwipeDeck.tsx` — `TEST-02` (P1) · actuel 69 % L / 53 % F / 71 % B

| Branche / cas non couvert | Test à écrire | Type |
|---|---|---|
| Mapping geste → verdict (seuils H/V, intensité) | pointer down/move/up simulés franchissant chaque seuil | unitaire (déjà partiel) |
| Tap‑vs‑drag (ouverture détail vs swipe) | déplacement < seuil tap → `onOpenDetail` ; > seuil → commit | unitaire |
| `topIdx` en review mode (reset à 0 + banner « = ») | monter en review, vérifier re‑parcours + bouton `=` | composant |
| Timings d'exit (`EXIT_MS`/bouton/top) → `onComplete` | `vi.useFakeTimers`, vérifier l'avance après l'exit | composant |
| `commit` downgrade quota (6e super → `oui` + `quotaHit`) | épuiser le quota puis tenter un super | composant |

### Module `LocationPicker.tsx` — `TEST-03` (P2) · actuel 47 % L

| Branche / cas non couvert | Test à écrire | Type |
|---|---|---|
| `runSearch` succès (parse + `onChange` + `setSearched`) | `fetch` mocké renvoyant `[{lat,lon}]` | unitaire |
| Résultat vide → « Aucun résultat trouvé. » | `fetch` mocké → `[]` | unitaire |
| Erreur réseau → « Recherche indisponible (réseau). » | `fetch` mocké rejette | unitaire |
| Saisie manuelle lat/lng (`Number.isFinite`) | valeurs valides/invalides | unitaire |

### Modules `AddActivityScreen.tsx` (`TEST-04`, 62 % L / 43 % F) & `Card.tsx` (61 % L / 50 % F) — P2

| Cas non couvert | Test |
|---|---|
| Flux d'édition (`startEdit` → hydratation champs → update) | composant |
| Sélection de la photo hero + preview | composant |
| Preview / suppression depuis la liste « Mes activités » | composant |
| `Card` : pills métadonnées (lieu/durée/prix) + popup légende tags | composant |

### Hooks données — `TEST-05` (P2) · branches faibles

| Hook | Branche à couvrir | Test |
|---|---|---|
| `useVoteHistory` (67 % B) | `randomFillVotes` clamp quota (`actualSupers`) + `upsertVote` reset `quotaHit` | unitaire |
| `useUserActivities` (65 % B) | hydratation blob IndexedDB, révocation object‑URL, update/remove | unitaire |
| `useAddActivityForm` (72 % B) | validation URL (`urlError`), reset, cleanup à l'unmount | unitaire |

### Petits trous — `TEST-06` (P2)

`useModalOverlays` (33 % F : `openMapAboveDetail`/`closeMap`), `DetailBody` (67 %), `photos.ts` (62 %).

### `icons/index.tsx` — `TEST-07` (P2)

312 LOC **exclues de la couverture**. Ajouter un smoke‑test rendant chaque icône (boucle sur les exports) pour détecter un SVG cassé. Sinon une régression d'icône passe silencieusement.

### `TEST-08` (P2)

Relever le cliquet une fois les gains acquis (cf. tableau §2).

---

## 4. Quick wins (< 15 min, fort ratio impact/effort)

Sous‑ensemble du tableau §2 (mêmes IDs) :

- **`TS-02`** — passer `no-explicit-any`/`no-unused-vars` en `error` : one‑liner de config, gratuit (zéro `any` dans `src/` aujourd'hui).
- **`PERF-02`** — `useMemo(tagPalette)` + `memo(TagPickerPanel)` : supprime un re‑render par frappe.
- **`SEC-01`** — `cssUrlValue()` sur 2 sites d'appel : cohérence sécurité immédiate.
- **`PERF-03`** — `memo` sur `PhotoLightbox`/`DetailGroupVotes` + slice mémoïsé.
- **`TEST-03`** — mocker `fetch` de `LocationPicker` : 3 tests, gros bond de couverture (47 → ~90 %).
- **`CSS-01` (étape tokens)** — ajouter les tokens `YB.shadow*`/`YB.backdrop*`/`YB.surface` dans `theme.ts` (le remplacement progressif suit).

---

## 5. Notes /20 par axe (justifiées)

### A. Architecture & réutilisabilité — **15 / 20** 🟡
Couche nette (App orchestre, hooks = données, utils purs), **zéro orphelin**, décomposition active et récente (`AppOverlays`, `MapOverlay`, `SwipeScreen`, `AppConfirmModals` extraits), unions discriminées là où ça compte (`detail.source`, `mapView`), `forwardRef`/`useImperativeHandle` justifié, sync state‑pendant‑render React 19 correct.
**Ce qui sépare de 16‑17** : `AppOverlays` reçoit ~45 props (drilling), 5‑6 composants 280‑400 LOC multi‑responsabilités (`ResultsScreen`, `AddActivityScreen`, `SwipeDeck`, `Card`, `DetailMetaTiles`, `useAddActivityForm`), et scaffolding modal + pills dupliqué.

### B. TypeScript & qualité — **17 / 20** 🟢
**Tous** les flags stricts demandés sont activés : `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noUnusedLocals/Parameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `erasableSyntaxOnly`, `verbatimModuleSyntax`. **Zéro `any`, zéro `@ts-ignore/@ts-expect-error`, zéro `eslint-disable`** non justifié ; les `as`/`!` restants sont tous prouvablement sûrs.
**Ce qui sépare de 18‑20** : pas de lint *type‑aware* (`recommended` au lieu de `recommendedTypeChecked`) → promesses flottantes non détectées ; `no-explicit-any`/`no-unused-vars` en `warn`.

### C. Performance — **16 / 20** 🟢
Discipline rare : **budget bundle outillé** (`check-bundle-size.ts` avec fingerprint anti‑fuite Leaflet) **+ cliquet CI**, Leaflet & dataset déjà code‑splittés/lazy, maps en `React.lazy`/`Suspense`, onglets montés‑non‑remontés (documenté), mémoïsation correcte sur les chemins chauds (Card `memo`, `useVoteHistory`, `ResultsScreen`), `prefers-reduced-motion` honoré. `useLocalStorage` **ne sérialise pas à chaque render** (init lazy + write‑only) — la crainte du brief ne s'applique pas ici.
**Ce qui sépare de 17‑18** : entrée eager **au plafond** du budget (101.8/105 kB) avec l'onglet « Ajouter » chargé eager ; quelques re‑renders évitables (`TagPickerPanel` à chaque frappe, slice ×2 `DetailHero`).

### D. Sécurité — **18 / 20** 🟢
**CSP sans `unsafe-inline`/`unsafe-eval`** (`script-src 'self'`, `connect-src` scopé à nominatim — qui correspond bien à l'appel runtime de `LocationPicker`), suite complète (`X-Content-Type-Options`, `X-Frame-Options DENY`, `Referrer-Policy`, **HSTS preload**, `Permissions-Policy`, COOP). **Zéro `dangerouslySetInnerHTML`** ; l'unique surface d'injection (marqueurs Leaflet `divIcon`) est construite via DOM API + CSSOM + `textContent`, jamais `innerHTML`, avec double défense URL (`isSafePhotoUrl` au paste + `cssUrlValue` au rendu) **et tests dédiés**. `target="_blank"` avec `rel="noopener noreferrer"` partout. **0 vulnérabilité npm**, aucun secret dans le bundle (seul `VITE_E2E`), localStorage non sensible (votes + id participant).
**Ce qui sépare de 19‑20** : findings purement défense‑en‑profondeur (`cssUrlValue` non appliqué aux backgrounds inline, `img-src https:` large).

### E. CSS / Tailwind — **14 / 20** 🟡
Palette `yallah-*` cohérente via `YB`, `content` Tailwind correct (pas de sur‑purge), keyframes centralisées, `prefers-reduced-motion` traité finement, `@apply` déjà utilisé pour `action-btn`/`badge`, styles de pins Leaflet en classes (CSP‑friendly), safe‑area gérée.
**Ce qui sépare de 15‑17** : ~20 composants répètent en inline les mêmes `#fff`/ombres/backdrops (valeurs magiques non tokenisées) et beaucoup de style statique pourrait passer en Tailwind/`@apply`.
**Chemin vers 18** : `CSS-01` (tokens) → ~15.5, `CSS-02` (`@apply` card/sheet) → ~17, puis `CSS-03` (garde-fou anti‑régression) + `CSS-04` (échelles/keyframes) → 18. Effort M‑L, gain de **maintenabilité** (non user‑facing) ; axe pondéré ×0.5 → impact global ~+0.3 (16.3 → ~16.6).

### F. Tests — **16 / 20** 🟢
**363 tests verts + 31 e2e** sur les parcours critiques, couverture **85.8 % L / 82.2 % B** au‑dessus des seuils, **cliquet enforced en CI**, exclusions bien choisies, tests de comportement (Testing Library), logique du budget bundle **et** échappement sécurité testés.
**Ce qui sépare de 17‑18** : `App.tsx` (56 % B) et `SwipeDeck.tsx` (71 % B) — les deux fichiers les plus critiques — sont sous‑couverts ; `LocationPicker` (réseau non mocké) à 47 %.

---

## Annexe — Points notables vérifiés manuellement

- **`photoUrl.ts` + `mapMarkers.ts`** : échappement XSS lu ligne à ligne — `isSafePhotoUrl` rejette `['"<>]` + schémas hors http/https/blob ; `cssUrlValue` backslash‑hex‑escape ; le marqueur est un `Element` passé à `L.divIcon` (pas une string). Défense réellement solide.
- **`LocationPicker.tsx:86-90`** : `data[0]!` **est** gardé par `if (data.length === 0)` + try/catch — pas de bug (contrairement à une première hypothèse).
- **`useVoteHistory.ts:102`** : le `!` sur `passive[...]` est sûr (`passive` = tableau fixe de 3, index ∈ {0,1,2}) — nécessaire sous `noUncheckedIndexedAccess`.
- **`DetailModal.tsx`** : `role=dialog`/`aria-modal`/backdrop‑guard présents, mais **pas de handler Escape** ni focus‑trap (→ `ARCH-01`).
