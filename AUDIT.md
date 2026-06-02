# Audit technique — yallah

Audit lecture seule daté de 2026-06-02. Méthode Explore → Plan → Audit. Aucun fichier de code modifié hors ce livrable. La TODO ci-dessous est à valider avant toute implémentation.

---

## 0. Synthèse exécutive

| Axe                            | Note  | Verdict 1-phrase                                                                                                                       |
| ------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A. Architecture                | 🟡    | Découpage par dossier correct, mais 3 god-components (App 648 l., DetailModal 918 l., AddActivityScreen 837 l.) et une logique d'orchestration concentrée dans `App.tsx`. |
| B. TypeScript                  | 🟢    | `strict: true`, **zéro** `any`/`as any`/`@ts-ignore`/`@ts-expect-error` dans `src`, types partagés centralisés dans `src/types/`. Manque 3 flags TS pour serrer encore. |
| C. Performance                 | 🟡    | Memoization correctement appliquée ; chunk principal **126 kB gzip** (455 kB raw) dominé par activities.json (134 kB) + photos.json (66 kB) qui sont bundlés. `useLocalStorage` sans debounce. |
| D. Sécurité                    | 🟡    | `npm audit` propre, headers HTTP corrects, `target="_blank"` accompagné de `rel="noopener noreferrer"`. Mais CSP contient `'unsafe-inline'` dans `style-src` (nécessaire pour les `style={{}}` inline omniprésents). HSTS et Permissions-Policy absents. |
| E. CSS / Tailwind              | 🟡    | Palette `yallah-*` complète. Beaucoup de styles inline (DetailModal: 58 `style={{}}`, AddActivityScreen: 45, Card: 25) — pas d'`@apply`, pas de `clsx`/`tailwind-merge`. Aucun `prefers-reduced-motion` malgré 6 keyframes custom. |
| G. Tests & anti-régression     | 🟡    | 233 tests unitaires + 8 specs e2e Playwright, mais **`@vitest/coverage-v8` n'est pas installé** donc aucun pourcentage mesurable. Pas de seuil CI, pas de cliquet. Estimation ~75% des fichiers source ont un test au moins. |

**Top-3 problèmes critiques** :
1. **SEC-01** — CSP `style-src 'unsafe-inline'` rend la politique permissive ; à terme passer en CSP nonce-based, exige de réduire les inline styles (corrélé à CSS-01).
2. **TEST-01** — couverture non mesurée (`@vitest/coverage-v8` absent) ⇒ impossible de détecter une régression entre deux features.
3. **ARCH-01** — `App.tsx` (648 l., 20 hooks de mémo, 12 `useState`, 13 `useCallback`) orchestre tout : modals, onglets, deck, map, identité, random fill, ajout d'activités. C'est la principale source de risque de régression à chaque évolution.

---

## 1. Synthèse d'exploration (chiffres bruts)

### 1.1 Build & bundle (`vite build`)

| Chunk                                      | Raw     | Gzip    | Note                                                       |
| ------------------------------------------ | ------- | ------- | ---------------------------------------------------------- |
| `dist/assets/index-*.js`                   | 455 kB  | 127 kB  | Bundle principal — React 19 + react-dom + données JSON     |
| `dist/assets/TileLayer-*.js` (lazy)        | 153 kB  | 45 kB   | Leaflet, lazy via `FullscreenMap`                          |
| `dist/assets/FullscreenMap-*.js` (lazy)    | 3 kB    | 1.5 kB  |                                                            |
| `dist/assets/LocationPicker-*.js` (lazy)   | 3.3 kB  | 1.7 kB  |                                                            |
| `dist/assets/ActivityMiniMap-*.js` (lazy)  | 1.5 kB  | 0.9 kB  |                                                            |
| `dist/assets/index-*.css`                  | 24 kB   | 9 kB    | Tailwind purgé + Leaflet CSS                               |
| **Initial gzip total**                     | —       | **136 kB** | (HTML + CSS + main JS, hors lazy)                       |

Détail des données statiques bundlées dans `index-*.js` :

| Fichier                          | Raw     | Bundlé via              |
| -------------------------------- | ------- | ----------------------- |
| `src/data/activities.json`       | 134 kB  | `src/data/activities.ts` |
| `src/data/photos.json`           | 66 kB   | `src/utils/photos.ts`    |
| `src/data/coords.json`           | 12 kB   | `src/utils/coords.ts`    |
| `src/data/links.json`            | 3.5 kB  | `src/utils/links.ts`     |
| `src/data/reviewSummaries.json`  | 2.6 kB  | `src/utils/reviewSummary.ts` |
| `src/data/coords-overrides.json` | 50 B    | `src/utils/coords.ts`    |
| **Total raw bundlé**             | **219 kB** | (≈ 48-55 kB gzip)    |

### 1.2 Tests & lint

- **Tests unitaires** : 233 tests, 31 fichiers, `npm test` passe en ~5 s.
- **Tests e2e** : 8 specs (`add-activity`, `detail`, `identity`, `map`, `persistence`, `review-prompt`, `super-like`, `swipe`).
- **Lint** : `npm run lint` retourne `0 errors`. ESLint flat config + `typescript-eslint`, `react-hooks`, `react-refresh`.
- **Coverage** : `npx vitest run --coverage` échoue avec `MISSING DEPENDENCY: Cannot find dependency '@vitest/coverage-v8'`. Aucun pourcentage de couverture disponible aujourd'hui.

### 1.3 npm audit

```
found 0 vulnerabilities
```

(`--omit=dev`, prod deps uniquement)

### 1.4 TypeScript & qualité

- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports` activés.
- `grep "any\|as any\|@ts-ignore\|@ts-expect-error" src/` → **0 résultat** (hors `src/data/activities.ts` qui cast `raw as Activity[]` sur un import JSON).
- Path alias `@/*` configuré côté Vite + tsconfig mais inutilisé dans `src/` (tous les imports sont relatifs `../...`).

### 1.5 Inventaire `src/` (51 fichiers .ts/.tsx hors tests, types, setup)

10 plus gros fichiers :

| Fichier                                          | Lignes |
| ------------------------------------------------ | ------ |
| `src/components/DetailModal.tsx`                 | 918    |
| `src/components/AddActivityScreen.tsx`           | 837    |
| `src/App.tsx`                                    | 648    |
| `src/components/ResultsScreen.tsx`               | 402    |
| `src/components/SwipeDeck.tsx`                   | 372    |
| `src/icons/index.tsx`                            | 318    |
| `src/components/Card.tsx`                        | 304    |
| `src/components/PhotoLightbox.tsx`               | 250    |
| `src/components/GroupScreen.tsx`                 | 230    |
| `src/hooks/useUserActivities.ts`                 | 217    |

**Inline styles** (`style={{}}`) : DetailModal 58 occurrences, AddActivityScreen 45, Card 25, ResultsScreen 18, GroupScreen 17 — c'est la signature d'une approche "styles dynamiques inline" assumée, mais qui s'oppose à une CSP stricte.

### 1.6 Composants sans test

10 composants source sans `.test.tsx` colocalisé :
`BottomNav`, `HeartStamp`, `LocationPicker`, `MetaChip`, `ReviewPrompt`, `SectionHeading`, `StatusBar`, `Toast`, `TopBar`, `VerdictBadge`.

2 utils sans test : `src/utils/tags.ts`, `src/utils/mapMarkers.ts`.

1 hook sans test direct : `src/hooks/useUserActivities.ts` (la couche `data/userActivities.ts` qu'il enveloppe l'est).

---

## 2. TODO priorisée

Chaque ligne est conçue pour devenir un commit atomique. L'ID est stable : c'est la clé à utiliser pour me demander d'implémenter la tâche dans une session ultérieure.

| ID        | P  | Axe      | Tâche                                                                                                       | Fichier(s) clés                                                                              | Effort | Impact | Conventional commit suggéré |
| --------- | -- | -------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------ | ------ | --------------------------- |
| SEC-01    | P1 | Sécurité | Préparer le passage en CSP sans `'unsafe-inline'` sur `style-src` : auditer tous les `style={{}}` dynamiques, séparer ceux qui dépendent de JS-computed values (ex. `transform: translate(${drag.x}px...)` dans `SwipeDeck.tsx:243`) des "thèmes statiques" qui peuvent passer dans des classes Tailwind. Cible : CSP `style-src 'self'` une fois Card/DetailModal/Action désinlinifiés. | `vercel.json:13` + composants à inline style élevé (`DetailModal`, `AddActivityScreen`, `Card`) | L      | Réduit la surface XSS si une regex de description fait fuiter du HTML un jour ; rapproche la CSP des recommandations OWASP. | `refactor(security): replace inline styles with Tailwind classes (step 1)` puis `fix(security): tighten CSP style-src` |
| SEC-02    | P1 | Sécurité | Ajouter les headers manquants dans `vercel.json` : `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`, `Cross-Origin-Opener-Policy: same-origin`. | `vercel.json`                                                                                | S      | Durcit la posture sécurité sans changement applicatif. | `fix(security): add HSTS, Permissions-Policy and COOP headers` |
| SEC-03    | P2 | Sécurité | Vérifier que toutes les URLs externes affichées (`activity.transit`, descriptions, `links.json`) n'arrivent jamais comme HTML brut. Aujourd'hui aucun `dangerouslySetInnerHTML`, mais documenter la règle dans `CLAUDE.md` pour figer la pratique. | `CLAUDE.md`                                                                                  | S      | Anti-régression future si un dev ajoute une description riche. | `docs: forbid dangerouslySetInnerHTML in CLAUDE.md` |
| TS-01     | P2 | TypeScript | Activer `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns` dans `tsconfig.app.json`. Estimation : ~10-20 emplacements à corriger (notamment `stack[0]` dans `SwipeDeck.tsx:119`, accès photos[0] dans `DetailModal.tsx`). | `tsconfig.app.json` + corrections en cascade                                                 | M      | Force la prise en compte de `undefined` aux accès indexés ⇒ moins de bugs de bord de deck. | `chore(ts): enable noUncheckedIndexedAccess + exactOptionalPropertyTypes` |
| TS-02     | P2 | TypeScript | Remplacer le `as Activity[]` dans `src/data/activities.ts` par une validation runtime au build (script `parse-activities.ts` peut émettre un schéma Zod / un `satisfies`) ou au moins typer via `import` JSON avec `assert { type: "json" }`. | `src/data/activities.ts:8`, `src/utils/photos.ts:7`, `src/utils/links.ts:9` (mêmes casts)    | M      | Élimine 4 casts non vérifiés sur la couche données. | `refactor(data): drop `as` casts on JSON imports` |
| TS-03     | P2 | TypeScript | Modéliser le source du DetailModal en discriminated union typée : aujourd'hui `{ activity: Activity; source: 'swipe' \| 'review' }` (App.tsx:96) suffit ; `meDone`/`userId`/`myVerdict` (DetailModal.tsx:122-130) restent optionnels par défaut. Convertir en union pour rendre invalides les combinaisons interdites (`source: 'swipe' && reviewMode`). | `src/App.tsx:96-99`, `src/components/DetailModal.tsx`                                       | M      | Bug attrapé au compile : empêche d'ouvrir le DetailModal en review-mode sans le verdict utilisateur. | `refactor(types): discriminated union for DetailModal source` |
| ARCH-01   | P1 | Architecture | Extraire la mécanique métier d'`App.tsx` en hooks dédiés : `useVoteHistory` (history + migration + reset + random fill + super quota), `useTabNavigation` (activeTab + done + reviewMode + handlers), `useModalOrchestrator` (detail + map + confirms + identityPicker + z-index stacking). Objectif : `App.tsx` passe de 648 à ~250 lignes, devient un orchestrateur de JSX. | `src/App.tsx`, à créer `src/hooks/useVoteHistory.ts`, `src/hooks/useModalOrchestrator.ts`    | L      | Réduit le risque de régression à chaque nouvelle feature, simplifie les tests d'orchestration. | `refactor(app): extract useVoteHistory + useModalOrchestrator hooks` |
| ARCH-02   | P1 | Architecture | Découper `DetailModal.tsx` (918 l.) en sous-composants : `DetailHero` (hero + title + tag chips + legend), `DetailMetaTiles` (4 tuiles + Trajet block + ratingComment), `DetailBody` (description + anecdote + links), `DetailMap` (mini-map block), `DetailGroupVotes` (panel `Le groupe`). Le `MetaTile` interne est déjà extrait. | `src/components/DetailModal.tsx`                                                             | L      | Chaque sous-composant devient testable isolément ; simplifie les futurs ajustements design. | `refactor(detail): split DetailModal into Hero/Meta/Body/Map/Group` |
| ARCH-03   | P1 | Architecture | Découper `AddActivityScreen.tsx` (837 l.) en `useAddActivityForm` (state + validation + submit) + sous-composants `PhotoPickerPanel`, `TagPickerPanel`, `CategoryPicker`. La logique de gestion des `URL.createObjectURL` (createdUrlsRef) gagnerait à être encapsulée dans `usePhotoPicker`. | `src/components/AddActivityScreen.tsx`, créer `src/hooks/useAddActivityForm.ts`              | L      | Hook réutilisable si on ouvre l'édition rapide depuis un autre écran un jour. | `refactor(add-activity): extract form state into useAddActivityForm` |
| ARCH-04   | P2 | Architecture | Extraire le composant `MetaPill` réutilisable utilisé 3× dans `Card.tsx:218-298` (rating, durée, prix — mêmes paddings, mêmes bordures, mêmes backgrounds). Aujourd'hui c'est du copier-collé à 3 fois 25 lignes. | `src/components/Card.tsx`                                                                   | S      | Réduit la surface de divergence visuelle au prochain redesign. | `refactor(card): extract MetaPill component` |
| ARCH-05   | P2 | Architecture | Renommer / déplacer le hook ad-hoc `migrateHistory` (App.tsx:39-57) dans `src/data/history.ts` (à créer) avec un test dédié. Aujourd'hui c'est une closure isolée dans App.tsx qui survivra mal aux prochaines migrations. | `src/App.tsx`, créer `src/data/history.ts`                                                  | S      | Isole l'évolution de schéma `VoteEntry` (déjà 1 migration `neutre → whynot`). | `refactor(data): move migrateHistory to data/history.ts` |
| ARCH-06   | P2 | Architecture | Le path alias `@/*` est configuré (`vite.config.ts:11`, `tsconfig.app.json`) mais aucun import ne l'utilise. Soit on migre vers `@/components/...` (cohérent une fois App.tsx splité), soit on le retire pour éviter la dette. | `vite.config.ts`, `tsconfig.app.json` + imports `src/`                                       | M      | Décision à prendre ; sinon dette de configuration silencieuse. | `chore: drop unused @/* path alias` ou `refactor: switch to @/ imports` |
| PERF-01   | P1 | Performance | Lazy-charger `activities.json` (134 kB raw) via un `import('../data/activities.json')` dynamique au lieu du `import raw from './activities.json'` statique (`src/data/activities.ts:2`). Le bundle initial passe de ~127 kB gzip à ~90 kB gzip. À faire avec un loader splash (déjà présent via la TopBar jaune). | `src/data/activities.ts`, `src/App.tsx` (chargement)                                          | M      | -25% du bundle initial gzip. | `perf(data): code-split activities.json` |
| PERF-02   | P1 | Performance | Lazy-charger `photos.json` (66 kB raw) idem : 198 activités × ~12 URLs Pexels = JSON volumineux qui n'est utilisé que par `heroPhotoUrl` (Card) et `detailPhotos` (DetailModal). On peut inliner uniquement les URLs hero dans le bundle et lazy-charger le reste à l'ouverture du DetailModal. | `src/utils/photos.ts`, `src/data/photos.json`                                                | M      | -15-20 kB gzip initial. | `perf(photos): inline hero URLs only, lazy-load carousel set` |
| PERF-03   | P1 | Performance | Définir un **budget bundle** en CI (~120 kB gzip pour le main, ~50 kB gzip pour chaque lazy chunk hors Leaflet). À implémenter avec `vite-bundle-visualizer` ou `rollup-plugin-analyzer` + un script de check qui fait échouer le CI au-delà. | `package.json`, `vite.config.ts`, CI                                                          | M      | Empêche la dégradation silencieuse du temps de chargement. | `chore(perf): add bundle-size budget check in CI` |
| PERF-04   | P2 | Performance | `useLocalStorage` (`src/hooks/useLocalStorage.ts:34-52`) sérialise et écrit en synchrone à chaque setState. Pour les listes longues (history sur 198 votes), un debounce de ~80 ms supprime les jank lors d'un random-fill rapide. À implémenter via `requestIdleCallback` ou `setTimeout`. | `src/hooks/useLocalStorage.ts`                                                               | S      | Évite un jank potentiel sur les actions batchées. | `perf(useLocalStorage): debounce writes` |
| PERF-05   | P2 | Performance | `SwipeDeck.tsx:228-230` recalcule `cardTransform` à chaque `pointermove` et déclenche un re-render React. Pour les animations ultra-fluides, passer le transform en CSS variables sur le wrapper (comme l'exiting card le fait déjà via `--fx`/`--fy`) et muter via `ref.current.style.setProperty` hors React. | `src/components/SwipeDeck.tsx`                                                                | M      | Élimine le coût React pendant le drag, ~60 fps sur appareils anciens. | `perf(swipe): drive drag transform via CSS variable to skip re-render` |
| PERF-06   | P2 | Performance | `<TileLayer>` Leaflet est dans son propre chunk (~45 kB gzip) ✓ — vérifier que Leaflet n'est pas indirectement importé par un module non-lazy. Si oui, isoler l'import dans `FullscreenMap` et `ActivityMiniMap` uniquement. | `src/components/FullscreenMap.tsx`, `src/components/ActivityMiniMap.tsx`                     | S      | Maintien du budget map au strict minimum. | `chore(map): audit Leaflet import tree, keep it lazy-only` |
| PERF-07   | P2 | Performance | Le `MAURITIUS_CENTER` constant et `BoundsFitter` dans `FullscreenMap.tsx:31-63` sont recréés à chaque render. Préfixer par `useMemo` ou les sortir au top-level. Idem `verdictPinIcon` ligne 35 (DivIcon Leaflet recréé à chaque render de pin). | `src/components/FullscreenMap.tsx`                                                            | S      | Réduit le travail React/Leaflet sur les redraws de pins. | `perf(map): memoize pin icons and bounds fitter` |
| CSS-01    | P1 | CSS      | Ajouter un fallback `prefers-reduced-motion: reduce` qui désactive ou réduit les 6 keyframes custom (`yallahDeckExit`, `yallahSparkleFly`, `yallahHaloPulse`, `yallahBadgePop`, `yallahFlash`, `yallahToast`). Idéalement via un `@media (prefers-reduced-motion: reduce)` global dans `index.css` qui force `animation: none !important`. | `src/index.css`, `tailwind.config.js`                                                         | S      | Accessibilité WCAG 2.3.3 ; évite des malaises aux personnes sensibles aux animations. | `fix(a11y): respect prefers-reduced-motion on swipe keyframes` |
| CSS-02    | P2 | CSS      | Adopter `clsx` (ou `tailwind-merge` si on rencontre des conflits Tailwind) pour les classNames conditionnels. Aujourd'hui les conditionals sont du `${a} ${b ? 'classe' : ''}` peu lisibles dans `Card.tsx`/`ActionRow.tsx`. | `package.json`, composants concernés                                                          | S      | Améliore la lisibilité ; supporte `tailwind-merge` plus tard. | `chore(deps): add clsx for conditional classNames` |
| CSS-03    | P2 | CSS      | Migrer les styles statiques inline répétés (les 3 pills Card identiques après ARCH-04) vers des classes Tailwind ou `@apply` dans une couche Components. Préreq d'une CSP plus stricte (SEC-01). | `src/components/Card.tsx`, `src/components/DetailModal.tsx`, `src/components/ActionRow.tsx` | L      | Réduit drastiquement la surface d'`'unsafe-inline'`. | `refactor(css): replace static inline styles with Tailwind utilities` |
| CSS-04    | P2 | CSS      | Auditer les couleurs hex en dur dans les composants (`Card.tsx`: 25 occurrences `'rgba(...)'`, `ActionRow.tsx`: 11 hex). Les déplacer dans la palette `yallah-*` du `tailwind.config.js` quand elles correspondent à un sémantique (verdict, état). | `tailwind.config.js`, composants avec hex en dur                                              | M      | Palette unique = changements de thème futurs triviaux. | `refactor(theme): consolidate hard-coded colors into yallah palette` |
| TEST-01   | P0 | Tests    | Installer `@vitest/coverage-v8` et configurer `coverage` dans `vite.config.ts` avec `provider: 'v8'`, `reporter: ['text', 'html', 'json-summary']`, `include: ['src/**/*.{ts,tsx}']`, `exclude: ['src/main.tsx', 'src/test/**', 'src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/types/**', 'src/icons/index.tsx', 'src/data/*.json', 'src/data/activities.ts', 'src/data/participants.ts']`. | `package.json`, `vite.config.ts`                                                              | S      | Débloque toute mesure de couverture. | `chore(test): install vitest coverage and configure exclusions` |
| TEST-02   | P0 | Tests    | Mettre en place un **cliquet de couverture** : ajouter `coverage.thresholds.branches: 70` (ou la valeur courante mesurée après TEST-01, en plancher) dans `vite.config.ts` + un check CI qui fait échouer une PR si la couverture baisse. | `vite.config.ts`, workflow CI (à créer si absent dans `.github/`)                            | M      | Garantie anti-régression entre features — c'est le point clé. | `chore(ci): add coverage ratchet on PR` |
| TEST-03   | P2 | Tests    | Configurer Vitest pour exclure les fichiers triviaux des tests : aujourd'hui rien n'est exclu. Sans exclusion les chiffres globaux sont pollués par `icons/index.tsx`, JSON et data exports. | `vite.config.ts` (idem TEST-01)                                                                | S      | (couvert par TEST-01) | (fusionné dans TEST-01) |
| TEST-04   | P1 | Tests    | Tester `useLocalStorage` aux cas limites : localStorage indisponible (mode privé Safari → `setItem` lève `QuotaExceededError`), JSON corrompu (`{` brut), `null` réinjecté via storage event d'un autre onglet. Aujourd'hui les tests existants ne couvrent que le happy path. | `src/hooks/useLocalStorage.test.ts`                                                            | M      | Empêche un crash silencieux en navigation privée. | `test(hooks): cover useLocalStorage edge cases (storage unavailable, corrupted JSON)` |
| TEST-05   | P1 | Tests    | Tester `useUserActivities` (`src/hooks/useUserActivities.ts`, 217 l. sans test direct) : ajout, mise à jour, suppression + cycle IndexedDB (photoStore). Utiliser `fake-indexeddb` (déjà en devDep). | créer `src/hooks/useUserActivities.test.ts`                                                   | M      | Couvre le pipeline d'ajout d'activité, partie critique pour la pérennité des données utilisateur. | `test(hooks): add useUserActivities test suite` |
| TEST-06   | P1 | Tests    | Tester l'orchestration `App.tsx` sur les parcours critiques manquants : random-fill (vérifier 2-3 super-likes générés sur activités avec coords), reset depuis Résultats, switch reviewMode → re-walk, ouverture map depuis détail puis fermeture. | `src/App.test.tsx`                                                                            | M      | Couvre les bugs récents (super-likes random, retour map↔détail). | `test(app): cover random-fill super-likes and modal stacking` |
| TEST-07   | P2 | Tests    | Composants sans test (10 fichiers) : prioriser `Toast`, `BottomNav`, `ReviewPrompt`, `TopBar`, `MetaChip`, `VerdictBadge` (interactifs/visibles). Les 4 autres (`HeartStamp`, `LocationPicker`, `SectionHeading`, `StatusBar`) sont visuels/utilitaires. | composants concernés                                                                          | M      | Augmente la couverture globale du module `components`. | `test(components): add tests for Toast, BottomNav, ReviewPrompt, TopBar, MetaChip, VerdictBadge` |
| TEST-08   | P2 | Tests    | Tests pour `src/utils/tags.ts` (`labelForTag` + `TAG_LABELS`) et `src/utils/mapMarkers.ts`. | créer `src/utils/tags.test.ts`, `src/utils/mapMarkers.test.ts`                                | S      | Util de présentation : assure que la légende reste cohérente avec les tags utilisés en data. | `test(utils): cover tags and mapMarkers utilities` |
| TEST-09   | P2 | Tests    | Tests d'intégration manquants : `App + DetailModal + FullscreenMap` (flow ouvre carte → mini-map → fullscreen → fermeture → retour DetailModal). Le bug existant `mapAboveDetail` n'est pas couvert par un test. | nouveau fichier `src/integration/map-stacking.test.tsx`                                       | M      | Anti-régression sur la pile détail/map. | `test(integration): cover DetailModal → FullscreenMap stacking` |
| TEST-10   | P2 | Tests    | Tests Playwright manquants : (a) parcours "remplir aléatoirement", (b) ajout d'une activité user-added (déjà existant ?), (c) bascule d'identité depuis Groupe. Vérifier d'abord ce qui existe déjà dans `e2e/`. | `e2e/`                                                                                         | M      | Couvre les parcours utilisateurs touchés par les derniers commits. | `test(e2e): add random-fill and identity-change scenarios` |
| TEST-11   | P2 | Tests    | Auditer les tests existants pour couplage à l'implémentation. Suspects : tests qui assertent sur `data-testid` internes (`SwipeDeck.test.tsx`, `ResultsScreen.test.tsx`) → vérifier qu'ils testent un comportement utilisateur, sinon les réorienter vers `getByRole`/`getByText`. | `src/components/*.test.tsx`                                                                    | M      | Refactos futurs cassent moins de tests. | `refactor(test): replace test-id queries with role/text where possible` |

---

## 3. Plan de tests & anti-régression

### 3.1 Configuration de coverage (à mettre en place via TEST-01)

```ts
// vite.config.ts — section test à compléter
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.ts',
  exclude: ['node_modules', 'e2e', 'dist'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'json-summary'],
    include: ['src/**/*.{ts,tsx}'],
    exclude: [
      'src/main.tsx',
      'src/vite-env.d.ts',
      'src/test/**',
      'src/**/*.test.{ts,tsx}',
      'src/**/*.d.ts',
      'src/types/**',
      // Static data + barrels sans logique
      'src/data/activities.ts',
      'src/data/participants.ts',
      'src/data/*.json',
      'src/icons/index.tsx',
      // Constantes pures
      'src/constants/**',
      'src/utils/theme.ts',
    ],
    thresholds: {
      // Plancher initial — relever après chaque PR qui améliore (cliquet)
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
},
```

### 3.2 Tableau des cas/branches à couvrir, par module

**Module `src/hooks/`**

| ID       | Module             | Branche / cas non couvert                                                  | Type        |
| -------- | ------------------ | -------------------------------------------------------------------------- | ----------- |
| TEST-04a | useLocalStorage    | `JSON.parse` lève → `defaultValue` retourné                                 | unitaire    |
| TEST-04b | useLocalStorage    | `localStorage.setItem` lève (quota) → state mémoire seul                    | unitaire    |
| TEST-04c | useLocalStorage    | `storage` event avec `newValue=null` (clear d'un autre onglet)              | unitaire    |
| TEST-04d | useLocalStorage    | `storage` event avec `newValue` non parsable                                | unitaire    |
| TEST-05a | useUserActivities  | add → photos resize+put en IDB, record en localStorage, hook expose la liste | intégration |
| TEST-05b | useUserActivities  | update → remplace l'entrée par id                                           | intégration |
| TEST-05c | useUserActivities  | remove → delete photos IDB + retire du localStorage                          | intégration |
| TEST-05d | useUserActivities  | `loadUserActivities` retourne `[]` si JSON corrompu                          | unitaire    |

**Module `src/utils/`**

| ID       | Module             | Branche / cas non couvert                                                  | Type     |
| -------- | ------------------ | -------------------------------------------------------------------------- | -------- |
| TEST-08a | tags               | `labelForTag` retourne le tag brut si inconnu                               | unitaire |
| TEST-08b | mapMarkers         | `photoPinIcon` génère un HTML valide pour les options principales           | unitaire |

**Module `src/App.tsx`**

| ID       | Cas non couvert                                                                                              | Type        |
| -------- | ------------------------------------------------------------------------------------------------------------ | ----------- |
| TEST-06a | random-fill génère 2-3 super-likes, tous parmi les activités à coords                                         | intégration |
| TEST-06b | reset depuis Résultats vide history ET userId (vérifié visuellement aujourd'hui mais sans test)               | intégration |
| TEST-06c | switchReviewMode → topIdx revient à 0, banner "Mode révision" visible                                         | intégration |
| TEST-06d | DetailModal ouvert depuis map → close map → DetailModal toujours visible (z-stacking)                         | intégration |
| TEST-06e | Eye button en review-mode ouvre la carte courante via `getCurrent()` et non `allActivities[history.length]`   | intégration |

**Module `src/components/` (sans test aujourd'hui — voir TEST-07)**

| Composant       | Cas minimum à couvrir                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| `Toast`         | Texte + emoji affichés, disparait après `n` ms, `key` change ⇒ reset animation     |
| `BottomNav`     | Tab actif souligné en coral, `onChange(i)` au clic, `dark` swap des couleurs       |
| `ReviewPrompt`  | Render "Revoir les votes ?", `onConfirm` au clic                                   |
| `TopBar`        | Wordmark "yallah" + dot coral présents, respecte `safe-area-inset-top`              |
| `MetaChip`      | Variante `icon` vs `dot` ; valeur affichée correctement                            |
| `VerdictBadge`  | Heart / star / circle selon verdict ; couleur du verdict                            |

**Tests d'intégration manquants** (TEST-09)

| Flux                                                | Assertion clé                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| DetailModal → mini-map → FullscreenMap → close      | mapAboveDetail = true, fermeture map → DetailModal redevient visible (panel intact)         |
| FullscreenMap → tap pin → DetailModal → close       | mapView reste set, DetailModal close → map redevient l'écran actif                          |
| Random-fill → tap Résultats → tap "Voir sur la carte"| Les pins ★ super-likes sont présents sur la map (preuve du biais coords-first)              |

**Tests Playwright à ajouter** (TEST-10)

| Spec                       | Parcours                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `random-fill.spec.ts`      | Onboard → tab Résultats → "Remplir aléatoirement" → confirme → vérifier 2+ super-likes ★ visibles    |
| `identity-change.spec.ts`  | Onboard yves → tab Groupe → "Changer d'identité" → pick chloé → tab Vote affiche progress chloé      |
| `tag-legend.spec.ts`       | Tap chip sur Card → panel "Légende des tags" apparait avec libellés français                          |

### 3.3 Cliquet CI (TEST-02)

Stratégie recommandée pour empêcher la couverture de baisser :

1. **Seuil dans la config** : `coverage.thresholds.branches` défini sur la valeur actuelle au moment où on installe le coverage (TEST-01) — Vitest fait échouer le test s'il baisse.
2. **Workflow CI** (si `.github/workflows/` n'existe pas encore, le créer) : un job qui compare `coverage/coverage-summary.json` à la version `main` et bloque la PR si la couverture des branches du module modifié baisse de plus de 0.5 point.
3. **Politique** : chaque PR doit soit maintenir, soit augmenter le seuil dans `vite.config.ts`. Le seuil monte par cliquet, ne descend jamais.

---

## 4. Quick wins (< 15 min, à fort ratio impact/effort)

Référencés par leur ID :

- **SEC-02** — Ajouter HSTS + Permissions-Policy + COOP dans `vercel.json`. 5 min, zéro impact applicatif.
- **CSS-01** — Ajouter le bloc `@media (prefers-reduced-motion: reduce)` dans `index.css`. 5 min, accessibilité immédiate.
- **TEST-01** — Installer `@vitest/coverage-v8` et configurer `coverage.exclude`. 10 min, débloque tout le reste.
- **ARCH-04** — Extraire `MetaPill` réutilisable dans `Card.tsx`. 10 min, supprime 50 lignes de duplication.
- **ARCH-05** — Sortir `migrateHistory` de `App.tsx` vers `src/data/history.ts` + test. 10 min, isole la migration.
- **PERF-07** — Memoize `verdictPinIcon` + `BoundsFitter` dans `FullscreenMap.tsx`. 10 min, micro-optim visible sur la map.
- **TS-01** — Activer `noUncheckedIndexedAccess` (faire d'abord, corrections en commits séparés). 5 min pour le flag, M-effort pour la cascade.
- **ARCH-06** — Décider du sort de `@/*` alias (utiliser ou retirer). 5 min de décision, S à L selon le choix.

---

## Notes de fin

- Plusieurs items du tableau sont **co-dépendants** :
  - SEC-01 (CSP nonce-based) dépend de CSS-03 (sortir les inline styles statiques) et indirectement de ARCH-02/03/04 (extraire les composants permet de mutualiser les classes).
  - TEST-02 (cliquet) dépend de TEST-01 (installer coverage).
  - PERF-01 + PERF-02 + PERF-03 peuvent être traités séparément mais PERF-03 (budget) doit venir en dernier pour entériner les gains.
- L'inventaire des fichiers à 0 test (10 composants + 2 utils + 1 hook) sert de checklist directe pour TEST-07/08/05.
- Aucun élément de la TODO ne touche au backend (qui n'existe pas en v1) : les items "versioning" et "mode hors ligne" du backlog persistant restent hors scope tant que l'utilisateur ne les active pas (cf. mémoire `yallah_deferred_work.md` + `feedback_ask_before_deferred_work.md`).
- Cet audit est **lecture seule** : aucun fichier de code n'a été modifié. La prochaine étape t'appartient — choisis un ID, je l'implémente dans une session dédiée.
