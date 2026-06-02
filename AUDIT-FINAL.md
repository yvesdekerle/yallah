# Audit technique consolidé — yallah

Version finale daté de 2026-06-02. Issue de la fusion de `AUDIT.md` (audit initial) et `AUDIT-REVIEW.md` (contre-expertise). Lecture seule : aucun fichier de code modifié. **Ce document remplace `AUDIT.md` comme unique source de vérité pour l'implémentation.**

Les ID sont stables et ne sont jamais recyclés. Une entrée retirée laisse son ID vacant (voir Journal des décisions, §6). La colonne **Origine** trace la provenance de chaque entrée (`audit` / `review` / `arbitrage`).

---

## 0. Synthèse exécutive

| Axe              | Note | Verdict 1-phrase                                                                                                                              |
| ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Architecture  | 🟡   | Découpage par dossier correct, mais 3 god-components (App 648 l., DetailModal 918 l., AddActivityScreen 837 l.) concentrent l'orchestration. |
| B. TypeScript    | 🟢   | `strict: true`, **zéro** `any`/`@ts-ignore` dans `src`, types centralisés. 3 flags TS à activer + 3 casts JSON non vérifiés à resserrer.     |
| C. Performance   | 🟡   | Memoization correcte ; main **126,66 kB gzip**. Les gains lazy-load sont marginaux en bêta fermé (PERF-01/02 abaissés) — voir §6.            |
| D. Sécurité      | 🔴   | `npm audit` propre, headers OK, `rel="noopener"` présent. **Mais injection HTML concrète et exploitable (NEW-03, P0)** → 🔴 jusqu'à correctif. Revient 🟡 une fois NEW-03 fermé. |
| E. CSS / Tailwind| 🟡   | Palette `yallah-*` complète. Beaucoup de styles inline (DetailModal 58, AddActivityScreen 45, Card 25). Aucun `prefers-reduced-motion`.       |
| G. Tests         | 🟡   | 233 tests unit. (31 fichiers) + 8 specs e2e ✓. **`@vitest/coverage-v8` absent** ⇒ aucune couverture mesurable, pas de cliquet CI.            |

**Chiffres clés** (vérifiés par la contre-expertise sur le commit `48b8dab`) : bundle main **126,66 kB gzip** · **233** tests unit. / **31** fichiers · **8** specs e2e Playwright · `npm audit` = **0** vulnérabilité prod.

**Top-3 problèmes critiques** :
1. **NEW-03** (P0) — injection HTML directe via URL photo user-collée dans `mapMarkers.ts:36` (`background-image:url('${photo}')` → `L.divIcon({html})`). Unique vecteur XSS concret du projet.
2. **TEST-01** (P0) — couverture non mesurée (`@vitest/coverage-v8` absent) ⇒ impossible de détecter une régression entre deux features.
3. **ARCH-01** (P1) — `App.tsx` (648 l.) orchestre tout (modals, onglets, deck, map, identité, random-fill, ajout d'activités) : principale source de risque de régression.

**Ce qui a changé depuis l'audit initial** :
- **3 entrées retirées** : 2 faux positifs factuels (`PERF-04`, `PERF-07`) + 1 sur arbitrage (`TS-03`). IDs vacants, non recyclés.
- **4 angles morts ajoutés** (`NEW-01` à `NEW-04`), dont **1 P0 critique** (`NEW-03`, injection HTML) que la section sécurité initiale avait manquée.
- **5 priorités revues** : `SEC-01` P1→P3, `PERF-01` P1→P2, `PERF-02` P1→P3, `CSS-02` P2→P3, `PERF-05` conditionné à un profilage. Toutes justifiées par le contexte bêta fermé (9 users, pas de backend, pas de rendu HTML user).
- **2 entrées réécrites / réduites** (`TEST-04` ramené à 2 cas réels, `TEST-10` réduit à 1 spec) + **1 sous-cas retiré** (`TEST-06b`, déjà testé).
- **Références de lignes corrigées** sur `TS-01`, `TS-02`, `SEC-01`.

---

## 1. TODO list consolidée

Triée par priorité (P0 → P3), `NEW-03` en tête. Chaque ligne est un commit atomique potentiel ; l'ID est la clé de référence pour l'implémentation.

| ID | Prio | Axe | Tâche | Fichier(s) clés | Effort | Impact | Origine | Conventional commit suggéré |
|----|------|-----|-------|-----------------|--------|--------|---------|-----------------------------|
| **NEW-03** | **P0** | Sécurité | **Fermer l'injection HTML.** `mapMarkers.ts:36` concatène `url('${photo}')` dans le `html` d'un `L.divIcon`. Pour les activités user-added, `heroPhotoUrl` (`photos.ts:42`) renvoie `activity.photoUrls[0]`, alimenté sans validation par `urlInput` (`AddActivityScreen.tsx:94`). Une URL contenant `'` injecte du HTML arbitraire dans la popup map. Valider l'URL au paste (whitelist `https://`/`blob:`, refus de `'`, `<`, `>`) **et** échapper/`encodeURI` dans `photoPinIcon`. Ajouter le test de non-régression. | `src/utils/mapMarkers.ts`, `src/components/AddActivityScreen.tsx` | S | Ferme l'unique vecteur XSS concret du projet. | `fix(security): validate & escape user photo URL before divIcon HTML` |
| TEST-01 | P0 | Tests | Installer `@vitest/coverage-v8` et configurer `coverage` (provider v8, reporters text/html/json-summary, `include`/`exclude` — voir §3.1). | `package.json`, `vite.config.ts` | S | Débloque toute mesure de couverture. | `chore(test): install vitest coverage and configure exclusions` |
| TEST-02 | P0 | Tests | **Cliquet de couverture** : poser `coverage.thresholds` sur la valeur mesurée après TEST-01 (en plancher) + check CI qui échoue si la couverture baisse. **Requiert TEST-01 d'abord.** | `vite.config.ts`, CI (`.github/` à créer si absent) | M | Garantie anti-régression entre features. | `chore(ci): add coverage ratchet on PR` |
| SEC-02 | P1 | Sécurité | Ajouter dans `vercel.json` : `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`, `Cross-Origin-Opener-Policy: same-origin`. | `vercel.json` | S | Durcit la posture sécurité sans changement applicatif. | `fix(security): add HSTS, Permissions-Policy and COOP headers` |
| **NEW-02** | **P1** | Tests | **Tester `migrateHistory`** (`App.tsx:54`, utilisé `:77`) : aucun test ne couvre la migration `neutre→whynot` aujourd'hui. Seed `localStorage` avec une entrée `neutre` + rendu `<App/>` → vérifier la réécriture en `whynot` ; vérifier le passthrough des entrées déjà migrées. **À faire avant ARCH-01 / ARCH-05** (relocation de la fonction). | `src/App.test.tsx` | S | Anti-régression sur la migration verdict actuelle ET les futures. | `test(app): cover migrateHistory neutre→whynot migration` |
| ARCH-01 | P1 | Architecture | Extraire la mécanique d'`App.tsx` en hooks : `useVoteHistory` (history + migration + reset + random-fill + super quota), `useTabNavigation`, `useModalOrchestrator` (detail + map + confirms + identityPicker + z-index). Cible : `App.tsx` ~250 l. **Requiert NEW-02 d'abord.** | `src/App.tsx`, créer `src/hooks/useVoteHistory.ts`, `useModalOrchestrator.ts` | L | Réduit le risque de régression à chaque feature ; simplifie les tests d'orchestration. | `refactor(app): extract useVoteHistory + useModalOrchestrator hooks` |
| ARCH-02 | P1 | Architecture | Découper `DetailModal.tsx` (918 l.) : `DetailHero`, `DetailMetaTiles`, `DetailBody`, `DetailMap`, `DetailGroupVotes`. Le `MetaTile` interne est déjà extrait. | `src/components/DetailModal.tsx` | L | Chaque sous-composant testable isolément. | `refactor(detail): split DetailModal into Hero/Meta/Body/Map/Group` |
| ARCH-03 | P1 | Architecture | Découper `AddActivityScreen.tsx` (837 l.) : `useAddActivityForm` (state + validation + submit) + `PhotoPickerPanel`, `TagPickerPanel`, `CategoryPicker`. Encapsuler la gestion `URL.createObjectURL` (createdUrlsRef) dans `usePhotoPicker`. | `src/components/AddActivityScreen.tsx`, créer `src/hooks/useAddActivityForm.ts` | L | Hook réutilisable pour une future édition rapide. | `refactor(add-activity): extract form state into useAddActivityForm` |
| PERF-03 | P1 | Performance | Définir un **budget bundle** en CI (~120 kB gzip main, ~50 kB par lazy chunk hors Leaflet) via `rollup-plugin-analyzer` + check d'échec CI. Prérequis pour justifier tout lazy-load (PERF-01). | `package.json`, `vite.config.ts`, CI | M | Empêche la dégradation silencieuse du temps de chargement. | `chore(perf): add bundle-size budget check in CI` |
| CSS-01 | P1 | CSS | Ajouter `@media (prefers-reduced-motion: reduce)` global dans `index.css` qui neutralise les 6 keyframes custom (`yallahDeckExit`, `yallahSparkleFly`, `yallahHaloPulse`, `yallahBadgePop`, `yallahFlash`, `yallahToast`). | `src/index.css`, `tailwind.config.js` | S | Accessibilité WCAG 2.3.3. | `fix(a11y): respect prefers-reduced-motion on swipe keyframes` |
| TEST-04 | P1 | Tests | Compléter `useLocalStorage` sur les **2 cas réellement manquants** : `setItem` qui throw (QuotaExceeded en navigation privée Safari) + `storage` event avec `newValue` non parsable. *(Le parse-fail en lecture et le clear cross-tab sont déjà couverts — voir §6.)* | `src/hooks/useLocalStorage.test.ts` | S | Empêche un crash silencieux en navigation privée. | `test(hooks): cover useLocalStorage quota + corrupted storage event` |
| TEST-05 | P1 | Tests | Tester `useUserActivities` (217 l., sans test direct) : add / update / remove + cycle IndexedDB (photoStore). Utiliser `fake-indexeddb` (déjà en devDep). | créer `src/hooks/useUserActivities.test.ts` | M | Couvre le pipeline d'ajout d'activité (données utilisateur). | `test(hooks): add useUserActivities test suite` |
| TEST-06 | P1 | Tests | Orchestration `App.tsx` — parcours manquants : random-fill (super-likes biaisés coords), switch reviewMode → re-walk, ouverture map depuis détail puis fermeture (z-stacking), eye en review-mode. *(Le reset depuis Résultats est déjà couvert — sous-cas retiré, voir §6.)* | `src/App.test.tsx` | M | Couvre les bugs récents (super-likes random, retour map↔détail). | `test(app): cover random-fill super-likes and modal stacking` |
| SEC-03 | P2 | Sécurité | Documenter dans `CLAUDE.md` l'interdiction de `dangerouslySetInnerHTML` (aujourd'hui 0 occurrence) pour figer la pratique. *(Complémentaire de NEW-03 : NEW-03 ferme le sink existant, SEC-03 prévient les futurs.)* | `CLAUDE.md` | S | Anti-régression future. | `docs: forbid dangerouslySetInnerHTML in CLAUDE.md` |
| ARCH-04 | P2 | Architecture | Extraire `MetaPill` réutilisable utilisé 3× dans `Card.tsx:218-298` (rating, durée, prix — paddings/bordures/backgrounds identiques). **Prérequis de CSS-03.** | `src/components/Card.tsx` | S | Réduit la surface de divergence visuelle. | `refactor(card): extract MetaPill component` |
| ARCH-05 | P2 | Architecture | Déplacer `migrateHistory` (`App.tsx:54-58`) dans `src/data/history.ts` (à créer). **Requiert NEW-02 d'abord** (le test doit exister avant la relocation). | `src/App.tsx`, créer `src/data/history.ts` | S | Isole l'évolution de schéma `VoteEntry`. | `refactor(data): move migrateHistory to data/history.ts` |
| ARCH-06 | P2 | Architecture | Trancher le sort du path alias `@/*` (configuré `vite.config.ts:11` + tsconfig, mais 0 import l'utilise) : migrer vers `@/...` (cohérent une fois App.tsx splité) ou le retirer. | `vite.config.ts`, `tsconfig.app.json`, imports `src/` | M | Évite une dette de configuration silencieuse. | `chore: drop unused @/* path alias` *(ou switch)* |
| TS-01 | P2 | TypeScript | Activer `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`. **Cascade non triviale** : casse `stack[0]` (`SwipeDeck.tsx:123`), `photos[0]`, `superPool.slice(0,n)[i]`, `additions[i]`… ~10-20 corrections. Le flag + la cascade vont ensemble (pas un quick-win, voir §6). | `tsconfig.app.json` + corrections en cascade | M | Force la prise en compte de `undefined` aux accès indexés. | `chore(ts): enable noUncheckedIndexedAccess + exactOptionalPropertyTypes` |
| TS-02 | P2 | TypeScript | Remplacer les **3** `as` casts sur imports JSON (`activities.ts:9`, `photos.ts:9`, `links.ts:13`) par une validation runtime au build (Zod/`satisfies`) ou un import JSON typé. | `src/data/activities.ts:9`, `src/utils/photos.ts:9`, `src/utils/links.ts:13` | M | Élimine 3 casts non vérifiés sur la couche données. | `refactor(data): drop as casts on JSON imports` |
| PERF-01 | P2 | Performance | Lazy-charger `activities.json` (134 kB raw) via `import()` dynamique (`activities.ts`). Gain ~35 kB gzip mais ajoute un état de chargement avant la 1ʳᵉ carte. **À lier à PERF-03** (pas de lazy-load sans budget pour le justifier). | `src/data/activities.ts`, `src/App.tsx` | M | -25 % bundle initial, au prix d'un splash. | `perf(data): code-split activities.json` |
| PERF-05 | P2 | Performance | **Conditionné à un profilage préalable.** Si une mesure réelle prouve un bottleneck : driver la transform de drag via CSS variable + `ref.setProperty` hors React (`SwipeDeck.tsx`, comme `--fx/--fy` sur la carte sortante). Ne pas implémenter sans la mesure. | `src/components/SwipeDeck.tsx` | M | ~60 fps sur appareils anciens **si** le coût React du drag est avéré. | `perf(swipe): drive drag transform via CSS variable to skip re-render` |
| PERF-06 | P2 | Performance | Vérifier que Leaflet (~45 kB gzip, déjà en chunk lazy) n'est pas importé indirectement par un module non-lazy. Si oui, isoler dans `FullscreenMap`/`ActivityMiniMap`. | `src/components/FullscreenMap.tsx`, `ActivityMiniMap.tsx` | S | Maintien du budget map au minimum. | `chore(map): audit Leaflet import tree, keep it lazy-only` |
| CSS-03 | P2 | CSS | Migrer les styles statiques inline répétés (les pills Card identiques après ARCH-04) vers Tailwind / `@apply`. **Requiert ARCH-04 d'abord** (sinon fait deux fois). Prérequis de SEC-01. | `src/components/Card.tsx`, `DetailModal.tsx`, `ActionRow.tsx` | L | Réduit la surface d'`'unsafe-inline'`. | `refactor(css): replace static inline styles with Tailwind utilities` |
| CSS-04 | P2 | CSS | Consolider les couleurs hex en dur (`Card.tsx` 25 `rgba(...)`, `ActionRow.tsx` 11 hex) dans la palette `yallah-*` quand elles ont une sémantique (verdict, état). | `tailwind.config.js`, composants concernés | M | Palette unique = thèmes futurs triviaux. | `refactor(theme): consolidate hard-coded colors into yallah palette` |
| **NEW-01** | P2 | Arch / Cleanup | **Supprimer le code mort `MetaChip.tsx`** : composant exporté mais **aucun import** dans `src/` (seules occurrences = sa propre définition). Le DetailModal a son propre chip interne. | `src/components/MetaChip.tsx` | S | -30 l. mortes ; évite un test inutile (retire MetaChip de TEST-07). | `refactor: remove dead MetaChip component` |
| **NEW-04** | P2 | Accessibilité | **Pour mémoire avant ouverture publique.** `Card.tsx:34-42` rend la photo en `background: url(...)` sans alternative texte (seul le `<h2>` est annoncé). Ajouter `role="img"` + `aria-label={\`Photo : ${activity.title}\`}` sur le wrapper. *(A11y hors scope du bêta fermé — on trace le défaut.)* | `src/components/Card.tsx` | S | WCAG 1.1.1 ; couplé à CSS-01 pour une passe a11y. | `fix(a11y): add role=img + aria-label to Card hero photo` |
| TEST-07 | P2 | Tests | Composants sans test : prioriser `Toast`, `BottomNav`, `ReviewPrompt`, `TopBar`, `VerdictBadge` (interactifs). `HeartStamp`/`LocationPicker`/`SectionHeading`/`StatusBar` = visuels. *(`MetaChip` retiré : supprimé par NEW-01.)* | composants concernés | M | Augmente la couverture du module `components`. | `test(components): add tests for Toast, BottomNav, ReviewPrompt, TopBar, VerdictBadge` |
| TEST-08 | P2 | Tests | Tester `src/utils/tags.ts` (`labelForTag` + `TAG_LABELS`) et `src/utils/mapMarkers.ts` — **inclure un cas d'URL malveillante** (`'`, `<`) prouvant l'échappement (anti-régression de NEW-03). | créer `src/utils/tags.test.ts`, `mapMarkers.test.ts` | S | Légende cohérente + verrou sur l'échappement HTML. | `test(utils): cover tags and mapMarkers (incl. HTML escaping)` |
| TEST-09 | P2 | Tests | Intégration `App + DetailModal + FullscreenMap` : ouvre carte → mini-map → fullscreen → fermeture → retour DetailModal. Le bug `mapAboveDetail` n'est pas couvert. | créer `src/integration/map-stacking.test.tsx` | M | Anti-régression sur la pile détail/map. | `test(integration): cover DetailModal → FullscreenMap stacking` |
| TEST-10 | P2 | Tests | **Spec Playwright manquant unique : `tag-legend.spec.ts`** (tap chip sur Card → panel « Légende des tags » avec libellés FR). *(random-fill, add-activity et bascule d'identité sont déjà couverts — voir §6.)* | `e2e/tag-legend.spec.ts` | S | Couvre le seul parcours e2e réellement absent. | `test(e2e): add tag-legend scenario` |
| TEST-11 | P2 | Tests | Auditer le couplage à l'implémentation des tests existants (`SwipeDeck.test.tsx`, `ResultsScreen.test.tsx` qui assertent sur `data-testid`) → réorienter vers `getByRole`/`getByText` quand c'est du comportement. | `src/components/*.test.tsx` | M | Les refactos futurs cassent moins de tests. | `refactor(test): replace test-id queries with role/text where possible` |
| SEC-01 | P3 | Sécurité | Préparer la CSP sans `'unsafe-inline'` sur `style-src` : séparer les `style={{}}` JS-computed (ex. drag transform `SwipeDeck.tsx:229`) des thèmes statiques migrables en classes. Cible `style-src 'self'`. **Effort L, gain nul tant que le bêta reste fermé** (pas de rendu HTML user). À conditionner à une décision « v1 fermé / v2 ouvre ». **À faire après NEW-03 et la chaîne ARCH-04 → CSS-03.** | `vercel.json:13`, `DetailModal`, `AddActivityScreen`, `Card` | L | Rapproche la CSP d'OWASP — pertinent surtout en cas d'ouverture publique. | `refactor(security): replace inline styles with Tailwind classes` puis `fix(security): tighten CSP style-src` |
| PERF-02 | P3 | Performance | Lazy-charger `photos.json` (66 kB raw), n'inliner que les URLs hero. **Gain réel ~8 kB gzip** pour une complexification notable du pipeline photos (`heroPhotoUrl` appelé dès la 1ʳᵉ carte). Faible ratio. | `src/utils/photos.ts`, `src/data/photos.json` | M | -8 kB gzip initial seulement. | `perf(photos): inline hero URLs only, lazy-load carousel set` |
| CSS-02 | P3 | CSS | Adopter `clsx` pour les classNames conditionnels. **Confort DX, aucune douleur mesurée** ; ajout d'une dépendance optionnel. | `package.json`, composants concernés | S | Lisibilité ; support `tailwind-merge` plus tard. | `chore(deps): add clsx for conditional classNames` |
| TEST-03 | — | Tests | *Fusionné dans TEST-01* (exclusion des fichiers triviaux du coverage). ID conservé pour traçabilité ; aucune action séparée. | (voir TEST-01) | — | (couvert par TEST-01) | — |

---

## 2. Ordre d'implémentation & dépendances

Contraintes d'ordre à respecter (flèche = « doit précéder ») :

```
Sécurité      NEW-03  ──▶  SEC-01            (fermer l'injection avant de durcir la CSP ;
                                              style-src ne protège pas du divIcon html)

Tests         TEST-01 ──▶  TEST-02           (instrumenter le coverage avant de poser le
                                              cliquet — sinon plancher arbitraire)

Migration     NEW-02  ──▶  ARCH-01           (le test migration doit exister avant de
                      └──▶  ARCH-05            déplacer/splitter migrateHistory)

Chaîne CSP    ARCH-04 ──▶  CSS-03  ──▶  SEC-01   (extraire MetaPill, puis déstyler inline,
                                                  puis CSP nonce — sinon CSS-03 fait 2×)

Perf          PERF-03 ◀──▶ PERF-01          (pas de lazy-load activities.json sans budget
                                              bundle pour le justifier)
              [profilage] ──▶ PERF-05         (mesurer le bottleneck avant d'optimiser le drag)
```

**Lecture recommandée des chantiers** :
- **Sécurité immédiate** : `NEW-03` (P0) seul et en premier. `SEC-02` (headers) sans dépendance. `SEC-01` (P3) + sa chaîne CSP (`ARCH-04 → CSS-03 → SEC-01`) est entièrement différable tant que le bêta reste fermé.
- **Tests** : `TEST-01` d'abord seul, mesurer la couverture réelle, **puis** `TEST-02` (cliquet) avec le plancher mesuré.
- **Architecture** : `NEW-02` avant tout déplacement de `migrateHistory` (`ARCH-01`, `ARCH-05`).

---

## 3. Plan de test & anti-régression

### 3.1 Configuration de coverage (TEST-01)

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
      'src/data/activities.ts',
      'src/data/participants.ts',
      'src/data/*.json',
      'src/icons/index.tsx',
      'src/constants/**',
      'src/utils/theme.ts',
    ],
    thresholds: {
      // Plancher à fixer sur la valeur MESURÉE après TEST-01 (cliquet, voir 3.3)
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
  },
},
```

### 3.2 Cas/branches à couvrir (corrigés des faux positifs)

**Module `src/hooks/`**

| ID       | Module             | Branche / cas non couvert                                                 | Type        |
| -------- | ------------------ | ------------------------------------------------------------------------- | ----------- |
| TEST-04b | useLocalStorage    | `localStorage.setItem` lève (quota) → state mémoire seul, pas de crash    | unitaire    |
| TEST-04d | useLocalStorage    | `storage` event avec `newValue` non parsable                              | unitaire    |
| TEST-05a | useUserActivities  | add → resize+put IDB, record localStorage, hook expose la liste           | intégration |
| TEST-05b | useUserActivities  | update → remplace l'entrée par id                                         | intégration |
| TEST-05c | useUserActivities  | remove → delete photos IDB + retire du localStorage                       | intégration |
| TEST-05d | useUserActivities  | `loadUserActivities` retourne `[]` si JSON corrompu                       | unitaire    |

> `TEST-04a` (parse-fail en lecture) et `TEST-04c` (clear cross-tab, `newValue=null`) sont **déjà couverts** (`useLocalStorage.test.ts:42-48` et `:65-76`) — retirés du plan.

**Module `src/App.tsx`**

| ID       | Cas non couvert                                                                                           | Type        |
| -------- | --------------------------------------------------------------------------------------------------------- | ----------- |
| NEW-02   | `migrateHistory` : entrée `neutre` seedée → réécrite `whynot` ; entrées déjà migrées inchangées            | unitaire    |
| TEST-06a | random-fill génère 2-3 super-likes, tous parmi les activités à coords                                      | intégration |
| TEST-06c | switchReviewMode → `topIdx` revient à 0, banner « Mode révision » visible                                  | intégration |
| TEST-06d | DetailModal ouvert depuis map → close map → DetailModal toujours visible (z-stacking)                      | intégration |
| TEST-06e | Eye en review-mode ouvre la carte courante via `getCurrent()` et non `allActivities[history.length]`       | intégration |

> `TEST-06b` (reset depuis Résultats) est **déjà couvert** (`App.test.tsx:125-139`) — retiré du plan.

**Module `src/utils/`**

| ID       | Module     | Branche / cas non couvert                                                      | Type     |
| -------- | ---------- | ------------------------------------------------------------------------------ | -------- |
| TEST-08a | tags       | `labelForTag` retourne le tag brut si inconnu                                  | unitaire |
| TEST-08b | mapMarkers | `photoPinIcon` génère un HTML valide **et échappe** une URL contenant `'`/`<` (anti-régression NEW-03) | unitaire |

**Composants sans test (TEST-07)** — `Toast`, `BottomNav`, `ReviewPrompt`, `TopBar`, `VerdictBadge` (prioritaires) ; `HeartStamp`, `LocationPicker`, `SectionHeading`, `StatusBar` (visuels). *(`MetaChip` supprimé par NEW-01.)*

**Intégration (TEST-09)** — DetailModal → mini-map → FullscreenMap → close (mapAboveDetail, panel intact) ; FullscreenMap → tap pin → DetailModal → close.

**Playwright (TEST-10)** — `tag-legend.spec.ts` uniquement (tap chip → panel « Légende des tags » avec libellés FR).

### 3.3 Cliquet CI (TEST-02)

1. **Seuil dans la config** : `coverage.thresholds` figé sur la valeur **mesurée** après TEST-01 — Vitest échoue si ça baisse.
2. **Workflow CI** (créer `.github/workflows/` si absent) : compare `coverage-summary.json` à `main`, bloque la PR si la couverture des branches du module modifié baisse de > 0,5 pt.
3. **Politique** : chaque PR maintient ou monte le seuil ; le cliquet ne descend jamais.

---

## 4. Quick wins (< 15 min, fort ratio impact/effort)

Sous-ensemble filtré par ID (aucune nouvelle entrée) :

- **NEW-03** — *(S, mais P0)* fermer l'injection HTML : whitelist + échappement. À traiter en premier malgré tout.
- **SEC-02** — HSTS + Permissions-Policy + COOP dans `vercel.json`. 5 min, zéro impact applicatif.
- **CSS-01** — bloc `@media (prefers-reduced-motion: reduce)` dans `index.css`. 5 min.
- **TEST-01** — installer `@vitest/coverage-v8` + exclusions. 10 min, débloque tout le reste.
- **NEW-01** — supprimer `MetaChip.tsx` (code mort). 5 min.
- **NEW-02** — test de `migrateHistory`. 10 min, verrouille la migration verdict.
- **ARCH-04** — extraire `MetaPill` dans `Card.tsx`. 10 min, -50 l. de duplication.
- **ARCH-05** — sortir `migrateHistory` vers `data/history.ts` (après NEW-02). 10 min.

> **Retiré des quick-wins** : `TS-01`. Activer `noUncheckedIndexedAccess` casse immédiatement `stack[0]`, `photos[0]`, `superPool.slice(...)[i]`, `additions[i]`… — le flag est inséparable de sa cascade (effort M). Ce n'est pas un < 15 min. `PERF-07` (ancien quick-win) est supprimé (faux positif, §6).

---

## 5. Journal des décisions

### 5.1 Arbitrages rendus (désaccords d'opinion)

| ID | Décision | Justification |
|----|----------|---------------|
| **TS-03** | **Supprimé** | L'exemple moteur de l'audit (« rendre invalide `source:'swipe' && reviewMode` ») est factuellement faux : `DetailModalProps` (`DetailModal.tsx:101-118`) n'a **aucun** prop `reviewMode` — c'est un état parent jamais passé au composant. L'idée résiduelle (union sur l'état `detail` d'App) a une valeur type-safety marginale pour 9 users. ID vacant, non recyclé. |
| **PERF-05** | **Maintenu P2, conditionné à un profilage** | Le `setState` par `pointermove` re-render bien `SwipeDeck`, mais l'impact « appareils anciens » n'est pas mesuré. Optimisation réelle mais à prouver : la tâche est gardée, avec une étape de profilage obligatoire avant implémentation. |
| **CSS-02** | **Reclassé P3** | Pur confort DX ; aucune douleur `clsx` mesurée dans le code. Ajout d'une dépendance optionnel pour le contexte actuel. |

### 5.2 Intégrations factuelles directes (sans arbitrage)

**Suppressions (faux positifs prouvés)** — IDs vacants, non recyclés :

| ID | Preuve `fichier:ligne` |
|----|------------------------|
| **PERF-07** | `MAURITIUS_CENTER` (`FullscreenMap.tsx:34`), `verdictPinIcon` (`:38`), `BoundsFitter` (`:46`) sont **déjà top-level** — l'audit recommandait de faire ce qui est fait. *(Résidu mineur non retenu : `verdictPinIcon(p.activity, p.verdict)` est rappelé par pin dans `.map()` à `:121`, recréant un `DivIcon` par render — coût négligeable sur une map lazy rarement re-rendue.)* |
| **PERF-04** | `handleRandomFill` (`App.tsx:244-284`) fait **un seul** `setHistory((h) => [...h, ...additions])` (`:276`), pas une boucle de writes. La sérialisation de ~198 entrées `{id,verdict}` (~7 kB) est < 1 ms. Aucun jank à debouncer → bénéfice inexistant. *(Hors liste initiale ; supprimé par application de la méthode « faux positif confirmé ».)* |

**Reclassements de priorité** (justifiés par le contexte bêta fermé : 9 users nommés, pas de backend, pas de rendu HTML user) :

| ID | Avant → Après | Justification |
|----|---------------|---------------|
| SEC-01 | P1 → **P3** | Refactor CSP effort L, gain nul tant qu'aucun HTML user n'est rendu (`dangerouslySetInnerHTML` = 0). Conditionner à une ouverture publique. |
| PERF-01 | P1 → **P2** | Gain ~35 kB gzip au prix d'un splash avant la 1ʳᵉ carte ; imperceptible en 4G mobile. Lié à PERF-03 (budget). |
| PERF-02 | P1 → **P3** | Gain réel ~8 kB gzip pour une complexification notable du pipeline photos. Faible ratio. |

**Réécritures / réductions** :

| ID | Changement | Preuve |
|----|------------|--------|
| TEST-04 | Ramené aux **2** cas réellement manquants (`setItem` throw, `storage` event non-parsable). | Déjà couverts : parse-fail lecture `useLocalStorage.test.ts:42-48`, clear cross-tab `:65-76`. *(Le décompte « 3/4 couverts » était optimiste : 2 couverts / 2 manquants.)* |
| TEST-10 | Réduit à `tag-legend.spec.ts` seul. | random-fill couvert par `e2e/review-prompt.spec.ts`, add-activity par `e2e/add-activity.spec.ts`, bascule d'identité par `e2e/identity.spec.ts`. |
| TEST-06 | Sous-cas **TEST-06b** retiré (reset depuis Résultats). | Déjà couvert par `App.test.tsx:125-139` (`reset from résultats clears history`). |

**Angles morts ajoutés** :

| ID | Preuve |
|----|--------|
| NEW-03 (P0) | `mapMarkers.ts:36` interpole `url('${photo}')` dans le `html` d'un `L.divIcon` (`:42`). `photo` ← `heroPhotoUrl` (`photos.ts:42`, renvoie `activity.photoUrls[0]`) ← `urlInput` (`AddActivityScreen.tsx:94`), sans validation. Vecteur XSS concret. |
| NEW-02 (P1) | `migrateHistory` (`App.tsx:54`, utilisé `:77`) : aucun test ne référence `neutre` ni `migrateHistory`. |
| NEW-01 (P2) | `MetaChip` : seules occurrences dans `src/` = sa propre définition (`MetaChip.tsx:4,13`), 0 import. Code mort. |
| NEW-04 (P2) | `Card.tsx:34-42` : photo en `background: url(...)` sans `role`/`aria-label`. Conservé « pour mémoire avant ouverture publique » (a11y hors scope bêta fermé). |
| NEW-05 | Recommandation méta « ordre d'implémentation dans la TODO » → **absorbée dans la §2** (pas une entrée TODO). |

**Corrections de références** :

- `TS-01` : `stack[0]` à `SwipeDeck.tsx:119` → **`:123`**.
- `SEC-01` : drag transform à `SwipeDeck.tsx:243` → **`:229`**.
- `TS-02` : casts à `activities.ts:8` → **`:9`**, `photos.ts:7` → **`:9`**, `links.ts:9` → **`:13`** ; « 4 casts » → **3** (il n'y en a que 3).
- **Quick wins** : `TS-01` retiré (le flag est inséparable de sa cascade M-effort).

### 5.3 Points non retenus / confirmés

- **Volume des tests** : `CLAUDE.md` indique « 134 unit tests across 19 files » — **obsolète** (réel : 233 tests / 31 fichiers). À rafraîchir hors de ce livrable (non modifié ici).
- **`npm audit`** : 0 vulnérabilité (présomption de confiance, non re-vérifié dans la contre-expertise).
- Aucun item ne touche au backend (inexistant en v1) ; les items « versioning » et « mode hors ligne » du backlog restent hors scope tant qu'ils ne sont pas activés.

---

*IDs vacants (retirés, non recyclés) : `PERF-04`, `PERF-07`, `TS-03`.*
