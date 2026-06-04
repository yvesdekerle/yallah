# Réévaluation technique post-travaux — yallah

Revue datée du **2026-06-03**. Lecture neuve du code dans son état actuel (`HEAD 8781fce`) par un staff engineer, après implémentation des tâches d'`AUDIT-FINAL.md`. Chaque constat est vérifié sur pièce (`fichier:ligne`). Aucun fichier de code modifié dans cette session (seul ce livrable est écrit).

Contexte assumé : bêta fermé, 9 utilisateurs nommés, SPA sans backend ni auth, local-only. Les attentes sont calibrées en conséquence (un choix différable et tracé n'est pas pénalisé comme un défaut).

Mesures relancées localement le 2026-06-03 : `vitest run --coverage` (363 tests ✓), `vite build` (gzip), `npm audit --omit=dev` (0 vuln.).

> Une revue antérieure (`REVIEW-POST-DEV` au commit `f9cc298`) notait **15,5/20**. Depuis, l'essentiel de son backlog P1/P2 a été livré (cliquet resserré, flags TS, casts JSON, MetaPill, CSP, code-split activities, e2e tag-legend, tests composants). Cette revue neuve, plus haute, mesure ce delta réel.

---

## 1. Note globale : **16,8 / 20**

| Axe | Note | Poids | Ce qui sépare de la note supérieure |
|---|---|---|---|
| **Sécurité** | **18**/20 | ×2,0 | Vecteur XSS fermé *structurellement* (DOM API + CSSOM) avec défense en profondeur et tests ; en-têtes complets + CSP durcie sans `unsafe-inline`. Reliquats mineurs : réponse Nominatim non validée, pas de SRI/scan de deps automatisé. |
| **Tests & anti-régression** | **16**/20 | ×2,0 | Couverture instrumentée + cliquet CI calé au plancher mesuré, 363 tests comportementaux ; mais `tags.ts` sans test et `App.tsx` à **55,8 %** de branches (fichier le plus à risque). |
| **TypeScript & qualité** | **18**/20 | ×1,0 | `strict` + 3 flags avancés activés, **0** `any`/`@ts-ignore`, imports JSON validés à l'exécution ; reste un cast réseau non validé (`LocationPicker:85`). |
| **Performance** | **17**/20 | ×1,0 | Bundle initial **−20 %**, `activities` + Leaflet en lazy chunks, `Card` mémoïsé, budget bundle en CI ; le `pointermove` re-render subsiste (mais blindé par `memo`). |
| **Architecture & réutilisabilité** | **16**/20 | ×1,5 | Vraie décomposition des 3 god-components, hooks cohésifs ; reste un prop-drilling massif vers `AppOverlays` (~40 props) et un `useAddActivityForm` de 306 l. |
| **CSS / Tailwind** | **16**/20 | ×0,75 | `prefers-reduced-motion` soigné, `@apply` + palette consolidés ; mais beaucoup de styles **statiques** encore inline et ombres `rgba` dupliquées. |

> Moyenne pondérée = (18×2 + 16×2 + 18 + 17 + 16×1,5 + 16×0,75) / 8,25 = **139 / 8,25 = 16,85**.
> Pondération : Sécurité et Tests à 2,0 (exposition + anti-régression), Architecture à 1,5, CSS à 0,75 (cosmétique/maintenabilité).

---

## 2. Verdict en 3 phrases

Le cycle de corrections a réellement transformé le code : la base passe d'un état **🔴 sécurité (injection HTML exploitable) + couverture non mesurée** à un code **solidement ingénié pour une bêta fermée** — XSS fermé en profondeur, en-têtes et CSP durcis, couverture 85,8 % lignes / 82,2 % branches sous cliquet CI, et une décomposition architecturale authentique (App 648→454, DetailModal 918→165, AddActivityScreen 837→399). L'évolution est nette et de qualité, pas cosmétique : les flags TypeScript les plus durs sont activés, le bundle initial recule de 126,7 à 101,8 kB gzip, et plusieurs corrections **dépassent** ce que l'audit demandait (a11y, CSP, sécurité du marqueur). Le principal point de vigilance restant est la **couche d'orchestration** : `App.tsx` câble ~40 props vers `AppOverlays` (prop-drilling déplacé, pas éliminé) et n'est couverte qu'à 55,8 % de branches alors qu'elle reste le fichier le plus à risque de régression.

---

## 3. Évolution chiffrée (AUDIT-FINAL → maintenant)

| Métrique | État initial (AUDIT-FINAL, `48b8dab`) | Maintenant (`8781fce`) | Δ |
|---|---|---|---|
| **Bundle main (gzip)** | 126,66 kB | **101,80 kB** | **−24,9 kB (−20 %)** |
| Chunk `activities` (gzip) | inliné dans main | 29,11 kB (lazy, derrière Splash) | code-split |
| Chunk Leaflet `TileLayer` (gzip) | déjà lazy | 44,73 kB (lazy, ouverture carte) | maintenu lazy |
| CSS (gzip) | n/c | 9,46 kB | — |
| **Couverture** | **non mesurable** (`coverage-v8` absent) | **L 85,8 % · S 83,6 % · F 79,9 % · B 82,2 %** + cliquet CI | débloqué |
| **Tests unitaires** | 233 tests / 31 fichiers | **363 tests / ≈51 fichiers** | +130 tests |
| **Specs e2e** | 8 | **11** (`reduced-motion`, `tag-legend`, `filter`…) | +3 |
| **Vulnérabilités prod** | 0 | **0** (`found 0 vulnerabilities`) | stable |
| `any` / `@ts-ignore` dans `src` | 0 / 0 | **0 / 0** | stable |
| Flags TS avancés | aucun des 3 | **3/3** (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`) | +3 |
| Casts `as` sur imports JSON | 3 | **0** (validation runtime) | −3 |
| CSP `style-src` | `'unsafe-inline'` | **`'self'`** (durcie) | renforcée |

---

## 4. Vérification des corrections

| ID (AUDIT-FINAL) | Censé corriger | État réel constaté (`fichier:ligne`) | Effective ? |
|---|---|---|---|
| **NEW-03** (P0) | Injection HTML `mapMarkers` | Marqueur reconstruit via **DOM API** (`mapMarkers.ts:37-52` : `createElement` + `style.backgroundImage` CSSOM + `textContent`), `Element` passé à `divIcon` (`:54`). + `isSafePhotoUrl`/`cssUrlValue` (`photoUrl.ts:21,39`) + tests de charge malveillante (`mapMarkers.test.ts:18-35`). | **Oui (dépasse l'ask)** |
| TEST-01 (P0) | Instrumenter la couverture | `@vitest/coverage-v8 ^4.1.8` (`package.json:38`), bloc `coverage` provider v8 + reporters (`vite.config.ts:23-46`). | **Oui** |
| TEST-02 (P0) | Cliquet de couverture CI | `thresholds {L84,F77,B80,S82}` calés ~1-2 pts sous la mesure (`vite.config.ts:31`) ; `.github/workflows/ci.yml:26` exécute `check:bundle`. Plancher resserré (vs ~15 pts de jeu à `f9cc298`). | **Oui** |
| ARCH-01 (P1) | Extraire la mécanique d'`App` en hooks | `useVoteHistory`, `useModalOverlays`, `useToast`, `useAppVersionCheck`, `useUserActivities` ; `App.tsx` 648→**454**. | **Oui** |
| SEC-02 (P1) | HSTS + Permissions-Policy + COOP | Les 3 présents (`vercel.json:16-18`) + `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`. | **Oui** |
| NEW-02 (P1) | Tester `migrateHistory` | `history.test.ts:5-38` : neutre→whynot, passthrough, quotaHit, drop skip. | **Oui** |
| ARCH-02 (P1) | Découper `DetailModal` (918 l.) | `DetailHero/Body/Map/MetaTiles/GroupVotes` ; `DetailModal.tsx` = **165 l.** | **Oui** |
| ARCH-03 (P1) | Découper `AddActivityScreen` (837 l.) | Split en `AddActivityFields/PhotoPickerPanel/TagPickerPanel/CategoryPicker` + `useAddActivityForm` ; écran 837→**399**. *Mais* le hook fait **306 l.** (cycle `createObjectURL` non isolé en `usePhotoPicker`). | **Partielle** |
| PERF-03 (P1) | Budget bundle en CI | `scripts/check-bundle-size.ts` + test ; `ci.yml:26` `npm run check:bundle` ; assert anti-fuite Leaflet (`180f114`). | **Oui** |
| CSS-01 (P1) | `prefers-reduced-motion` | `index.css:40-49`, near-zero duration (pas `none`) pour laisser finir les FX forwards. | **Oui (soigné)** |
| TEST-04 (P1) | `useLocalStorage` quota + event corrompu | `useLocalStorage.test.ts:78-108` (QuotaExceeded + `newValue` non parsable). | **Oui** |
| TEST-05 (P1) | Tester `useUserActivities` | `useUserActivities.test.ts:50-167`, `fake-indexeddb`, cycle blob réel. | **Oui** |
| TEST-06 (P1) | Orchestration `App` | `App.test.tsx:190-239` (random-fill supers, re-walk review, eye) + z-stacking (`MapOverlay.test.tsx:97-110`). | **Oui** |
| SEC-03 (P2) | Interdire `dangerouslySetInnerHTML` | Documenté dans `CLAUDE.md` (Conventions) ; 0 occurrence dans `src`. | **Oui** |
| ARCH-04 (P2) | Extraire `MetaPill` | `Card.tsx:275-311`, utilisé 3× (`:240-261`). | **Oui** |
| ARCH-05 (P2) | Déplacer `migrateHistory` | `src/data/history.ts` + test colocalisé. | **Oui** |
| ARCH-06 (P2) | Trancher l'alias `@/*` | Retiré (`c7c0791`). | **Oui** |
| TS-01 (P2) | 3 flags TS + cascade | Les 3 activés (`tsconfig.app.json:25-27`), build vert. | **Oui** |
| TS-02 (P2) | 3 casts JSON | Remplacés par validation runtime (`50ef691`). | **Oui** |
| PERF-01 (P2) | Code-split `activities.json` | `loadActivities()` dynamique + Splash/retry (`main.tsx:12-37`) ; chunk 29 kB gzip. | **Oui** |
| PERF-05 (P2) | Drag via CSS var (si profilage) | Conditionné à un profilage non démontré ; concern adressé via `memo(Card)` (`Card.tsx:40`, `be14c71`). | **N/A (adressé)** |
| PERF-06 (P2) | Leaflet reste lazy | `MapOverlay`/`DetailMap` en `React.lazy` ; assert CI anti-fuite. | **Oui** |
| NEW-01 (P2) | Supprimer `MetaChip` mort | Fichier supprimé (absent de l'arbre). | **Oui** |
| NEW-04 (P2) | A11y photo `Card` | `Card.tsx:55` `sr-only` "Photo : {title}" — **meilleur** que le `role=img` proposé (n'occulte pas les enfants). | **Oui (dépasse)** |
| TEST-07 (P2) | Tests composants interactifs | `Toast/BottomNav/ReviewPrompt/VerdictBadge` testés (`ddc2661`) + `TopBar`. | **Oui** |
| TEST-08 (P2) | Tests `tags.ts` **et** `mapMarkers` | `mapMarkers.test.ts` fort ; **`tags.test.ts` absent** (`labelForTag` non couvert). | **Partielle** |
| TEST-09 (P2) | Intégration empilement carte/détail | Couvert par `MapOverlay.test.tsx:97-110` (z-index 40→60) plutôt qu'un fichier d'intégration dédié. | **Oui (adressé)** |
| TEST-10 (P2) | e2e `tag-legend` | `e2e/tag-legend.spec.ts` (`63dd02b`). | **Oui** |
| TEST-11 (P2) | `data-testid` → role/text | `d56aa3c` ; unitaires dominés par role/text ; `data-testid` résiduel surtout en e2e (internes). | **Oui (partielle)** |
| SEC-01 (P3) | CSP sans `unsafe-inline` style-src | Fait **en avance** : `style-src 'self'` (`vercel.json:11`, `d22a90f`). Viable grâce à l'approche CSSOM de React. | **Oui** |
| PERF-02 (P3) | Lazy `photos.json` | Non fait (ratio faible, différé sciemment). | **Non (assumé)** |
| CSS-02 (P3) | Adopter `clsx` | Non fait (confort DX optionnel). | **Non (assumé)** |

**Bilan** : tous les P0 et P1 traités (2 partiels) ; P2 quasi-complets (2 partiels : `tags.test`, styles inline) ; les seuls « Non » sont des P3 explicitement différés. Aucune régression introduite. La majorité du backlog de la revue intermédiaire (`f9cc298`) a aussi été livrée.

---

## 5. Points forts (à préserver)

- **Fermeture XSS exemplaire** (`mapMarkers.ts:31-60` + `photoUrl.ts`). Plutôt qu'un simple échappement, le marqueur est reconstruit en DOM pur : l'URL non fiable n'atteint qu'`element.style.backgroundImage` (CSSOM, ne peut créer de DOM) et le glyphe que `textContent`. L'injection est **structurellement impossible**, et deux tests le prouvent avec des charges réelles (`mapMarkers.test.ts:18-35`). Défense en profondeur (whitelist au paste + échappement au sink + restructuration).
- **Posture en-têtes / CSP sérieuse** (`vercel.json`). CSP complète avec `style-src 'self'` **sans** `'unsafe-inline'` — durcissement réel rendu possible parce que React applique `style={{}}` via la CSSOM (pas d'attribut `style="…"` dans le HTML servi). `connect-src` verrouillé sur Nominatim, `frame-ancestors 'none'`, HSTS preload, COOP. Compris, pas copié-collé.
- **Hooks de données propres et cohésifs.** `useVoteHistory.ts` est une couche données autonome, **sans effet de bord UI** (`:9-13`), avec dérivations mémoïsées (`superRemaining:24`, `allVoted:32`) et mutations pures (commentaire éclairant sur l'`upsertVote` qui drop `quotaHit` à dessein, `:45-49`). `useMapPins`, `useToast` idem.
- **Décomposition `DetailModal` réussie** (918→165 l.) : sous-composants présentationnels sans prop-drilling interne, chacun testable isolément.
- **Rigueur TypeScript de haut niveau** : `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitReturns`, 0 `any`, 0 `@ts-ignore`, et la couche données ne caste plus le JSON à l'aveugle.
- **Code-split maîtrisé** (`main.tsx:12-37`) : Splash peinte immédiatement, activities chargé en différé, **avec gestion d'échec + retry** (offline/cache miss). Budget bundle verrouillé en CI.
- **Tests comportementaux** (role/text/`user-event`) avec intégrations réelles (`fake-indexeddb` pour `useUserActivities`, événements `storage` pour `useLocalStorage`) et cliquet de couverture qui interdit la régression silencieuse.
- **Détails d'accessibilité pensés** : `sr-only` sur la photo (`Card.tsx:55`), `aria-expanded`/`aria-label`/`role="dialog"` sur la légende des tags (`Card.tsx:94-119`), `prefers-reduced-motion` qui laisse les FX atterrir.

---

## 6. Axes d'amélioration restants (priorisés)

### P1 — à traiter au prochain cycle

- **IMP-01 — `tags.ts` sans test** (`src/utils/tags.ts:28`). Reliquat direct de TEST-08a. `labelForTag` (lookup `TAG_LABELS`) n'a aucune couverture. → Créer `src/utils/tags.test.ts` : un tag connu (`'🌊'` → libellé FR) + un tag inconnu (renvoyé brut). 10 min, ferme la dernière case TEST-08.
- **IMP-02 — `App.tsx` sous-couverte en branches (55,8 %)** alors que c'est le fichier le plus à risque. Gardes non exercées : `handleConfirmDeleteActivity` sans id (`App.tsx:228-229`), `handleComplete` quand `filterActive` (`:286`), `handleExitReview` avec `allVoted` (`:196`), toast d'upgrade de version (`:65-69`). → Ajouter ces parcours dans `App.test.tsx`, viser >70 % branches puis relever le cliquet.

### P2 — dette ciblée

- **IMP-03 — `useAddActivityForm.ts` god-hook (306 l.)** : mélange champs de formulaire, hydratation édition et cycle de vie des `createObjectURL`. → Extraire `usePhotoManager` (photos + `urlInput` + `urlError` + `createdUrlsRef`) ; garder `useAddActivityForm` en orchestrateur mince. Achève ARCH-03.
- **IMP-04 — prop-drilling vers `AppOverlays`** (`App.tsx:407-450`, ~40 props). Ajouter un overlay impose de toucher 3 fichiers. → Faire retourner à `useModalOverlays` un objet façade (`overlays.reset = {open, confirm, cancel}`, etc.) passé en un prop ; ~40 → ~15 props.
- **IMP-05 — prop morte `dragState`** (`Card.tsx:24`, déclarée + documentée mais jamais déstructurée `:40`). → La supprimer (et de l'appelant `SwipeDeck` si transmise). Clarifie le contrat de `memo`.
- **IMP-06 — styles statiques encore inline** (reliquat CSS-03/04). `Card.tsx` et `ResultsScreen.tsx` portent des `style={{}}` **non** JS-computed (borderRadius, paddings, fonds `#fff`, ombres `rgba(20,30,50,…)` répétées 5×+). La convention CLAUDE.md ne couvre que le *dynamique*. → Migrer les statiques répétés vers `@apply`/utilities (ex. `.yallah-card-shadow`), garder inline le drag/gradients calculés.
- **IMP-07 — duplication de la légende des tags** (`Card.tsx:77-160` ↔ `DetailHero.tsx`). ~50 l. dupliquées (chips + popup `role=dialog`). → Extraire `<TagLegend tags open onToggle/>` partagé (la frontière `memo` du Card reste respectée, `legendOpen` reste local).
- **IMP-08 — réponse Nominatim non validée** (`LocationPicker.tsx:85`, `(await res.json()) as Array<{lat,lon}>`). Cast d'un payload réseau sans contrôle. Risque faible (n'alimente que des nombres, `connect-src` verrouillé) mais à fermer pour la propreté. → Valider (`Number.isFinite` + bornes Maurice déjà utilisées dans `geocode-activities.ts`) avant usage.

### P3 — opportuniste

- **IMP-09 — e2e à attente fixe** : `map.spec.ts` utilise `waitForTimeout(700)`/`(450)`. Faible risque (valeurs alignées sur les durées source) mais fragile si une anim change. → Remplacer par une attente conditionnelle (`toBeVisible`/`toHaveText`).
- **IMP-10 — `ResultsScreen` mutation impérative** : `onMouseDown/Up` écrivent `style.transform = scale(...)`. → Remplacer par `active:scale-…` CSS (cosmétique, surtout desktop).

---

*Méthode : exploration directe de `src/` (lecture manuelle des fichiers critiques + 3 sous-agents read-only sur Architecture / Tests / Perf+CSS, recoupés), `AUDIT-FINAL.md` utilisé uniquement comme référence de l'état initial. Mesures relancées le 2026-06-03 (`8781fce`).*
