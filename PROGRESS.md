# PROGRESS — implémentation de AUDIT-FINAL.md

Mémoire d'avancement (source de vérité). Mise à jour à chaque transition d'état.

## Légende
- `[ ]` à faire
- `[x] ID — commit <sha>` fait
- `[~] ID — skipped: <raison>` non pertinent / déjà fait
- `[!] ID — blocked: <raison>` bloqué (tests/itérations épuisées)

## Contexte de reprise (à relire après compaction)
- **node** : non sur le PATH. Préfixer toute commande node/npm par `export PATH="$HOME/.nvm/versions/node/v24.13.0/bin:$PATH"`.
- **Branches** : **`feature/optims`** = branche d'intégration unique (off main), contient TOUT le travail, testable en local avant merge sur main. Chaque tâche = **1 commit atomique directement sur `feature/optims`** après APPROVED du reviewer (diff review sur `git diff --cached`). Ne **PAS** `git add -A` (exclut `AUDIT*.md`, `PROGRESS.md`) — stage les fichiers de la tâche uniquement. **Ne pas push, ne pas merger sur main** (l'utilisateur teste en local d'abord). *(Les 12 branches par-tâche initiales ont été consolidées sur `feature/optims` puis supprimées le 2026-06-02.)*
- **Reviewer** : sub-agent `general-purpose`, persona staff engineer senior sceptique. Gate sur le plan ET le diff. Max 2 itérations par gate.
- **`/compact`** : non auto-invocable (commande CLI built-in) ; on s'appuie sur ce fichier + compaction auto du harness.
- **Fin** : ne pas push. Récap final (faites / skippées / bloquées + SHA).
- **Ordre imposé** : NEW-03 < SEC-01 · TEST-01 < TEST-02 · NEW-02 < ARCH-01/ARCH-05 · ARCH-04 < CSS-03 < SEC-01 · PERF-03 < PERF-01.

## Tâches (ordre priorité + dépendances)

### P0
- [x] NEW-03 — commit 8f87a90 — fermer l'injection HTML (mapMarkers.ts) — `fix/new-03-html-injection`
- [x] TEST-01 — commit e4d3702 — installer @vitest/coverage-v8 + config — `chore/test-01-coverage`
- [x] TEST-02 — commit e25e57b — cliquet de couverture CI — `chore/test-02-ratchet`

### P1
- [x] SEC-02 — commit 5f88e92 — headers HSTS/Permissions-Policy/COOP — `fix/sec-02-headers`
- [x] NEW-02 — commit fcad11c — test migrateHistory neutre→whynot — `test/new-02-migrate-history`
<!-- Ordre P1 ajusté : TEST-04/05/06 AVANT ARCH-01/02/03 — couvrir le code avant de le refactorer (random-fill/reviewMode/stacking + useUserActivities sont des cibles des refactos non encore testées) + relève le plancher ratchet qui protège les refactos. -->
- [x] CSS-01 — commit f9d8c1b — prefers-reduced-motion (0.01ms idiom + e2e) — `fix/css-01-reduced-motion`
- [x] PERF-03 — commit 6692c11 — budget bundle CI (main≤135/lazy≤15 kB gzip, Leaflet exclu) — `chore/perf-03-bundle-budget`
- [x] TEST-04 — commit f07ac47 — useLocalStorage quota + storage non-parsable — `test/test-04-localstorage-edges`
- [x] TEST-05 — commit e3d8266 — useUserActivities suite — `test/test-05-user-activities`
- [x] TEST-06 — commit 130d0d6 — orchestration App.tsx (random-fill, review, eye) — `test/test-06-app-orchestration`
- [x] ARCH-01 — commit c9b6d58 — App 649→492 l. (+useToast/useVoteHistory/useModalOverlays/useMapPins/AppConfirmModals) — `refactor/arch-01-app-hooks`
- [x] ARCH-02 — commit abb2339 — DetailModal 918→158 l. (Hero/MetaTiles/Body/Map/GroupVotes) — feature/optims
- [x] ARCH-03 — commit 263a35d — AddActivityScreen 853→319 l. (useAddActivityForm + AddActivityFields + Category/Tag/Photo panels) — feature/optims

### P2
- [x] SEC-03 — commit 0414ad5 — doc interdiction dangerouslySetInnerHTML (CLAUDE.md)
- [ ] ARCH-04 — Architecture — extraire MetaPill (avant CSS-03) — `refactor/arch-04-metapill`
- [x] ARCH-05 — commit d4a07b3 — migrateHistory → data/history.ts + unit test
- [ ] ARCH-06 — Architecture — trancher alias @/* — `chore/arch-06-path-alias`
- [ ] TS-01 — TypeScript — flags stricts + cascade — `chore/ts-01-strict-flags`
- [ ] TS-02 — TypeScript — retirer 3 casts JSON — `refactor/ts-02-json-casts`
- [ ] PERF-01 — Performance — code-split activities.json (après PERF-03) — `perf/perf-01-split-activities`
- [ ] PERF-05 — Performance — drag transform CSS var (conditionné profilage) — `perf/perf-05-drag-transform`
- [ ] PERF-06 — Performance — audit import tree Leaflet — `chore/perf-06-leaflet-lazy`
- [ ] CSS-03 — CSS — inline statiques → Tailwind (après ARCH-04) — `refactor/css-03-inline-to-tailwind`
- [ ] CSS-04 — CSS — couleurs hex → palette — `refactor/css-04-palette`
- [x] NEW-01 — commit 10ed6f8 — supprimer MetaChip mort
- [x] NEW-04 — commit 29f8ac8 — Card hero sr-only alt (pas role=img : cacherait les enfants)
- [ ] TEST-07 — Tests — composants sans test — `test/test-07-components`
- [ ] TEST-08 — Tests — tags + mapMarkers (échappement) — `test/test-08-utils`
- [x] TEST-09 — commit 3a8bef4 — e2e stacking-return + jsdom détail-upsert (empty-fill déjà gardé par `remaining>0`) — `test/test-09-integration`
- [ ] TEST-10 — Tests — e2e tag-legend — `test/test-10-tag-legend`
- [ ] TEST-11 — Tests — découpler tests des data-testid — `refactor/test-11-behavior-queries`

### P3
- [ ] SEC-01 — Sécurité — CSP sans unsafe-inline (après NEW-03 + chaîne CSS-03) — `refactor/sec-01-csp`
- [ ] PERF-02 — Performance — lazy-load photos.json — `perf/perf-02-photos-lazy`
- [ ] CSS-02 — CSS — adopter clsx — `chore/css-02-clsx`

### Fusionné
- [~] TEST-03 — skipped: fusionné dans TEST-01 (exclusions coverage)

## Journal des reviews
(verdicts plan/diff par tâche, ajoutés au fil de l'eau)

### TEST-01
- Plan review #1: **CHANGES_REQUESTED**. Blocking: (1) `coverage/` absent de `.gitignore` → fuite du rapport ; (2) pas de `all:true` (retiré en vitest v4 ; `include` rapporte déjà à 0% — plan OK tel quel) ; (3) `src/constants/**` glob trop large → restreindre. Cosmetic: pin `@^4.1`, vérifier lockfile.
- Révisions: +`coverage/` dans `.gitignore` (et commit) ; exclude `src/constants/swipe.ts` au lieu du glob ; install `@vitest/coverage-v8@^4.1`. +`coverage` dans eslint globalIgnores (rapport généré linté → 3 warnings).
- Plan review #2: **APPROVED**.
- Diff review #1: **CHANGES_REQUESTED** (branch placement). Résolu: branche `chore/test-01-coverage` nommée, chaînée (stack assumé ; off-main décliné car casse test local global + deps). Re-review: **APPROVED**. Commit `e4d3702`.
- **Baseline mesurée** (→ plancher TEST-02): lines 66.63 / stmts 63.94 / funcs 59.09 / branches 67.61.

### TEST-02
- Plan review: **APPROVED** (cosmetic ; ratchet vérifié empiriquement exit0/exit1). Cosmetics intégrés: `npm test -- --coverage` (DRY), concurrency guard.
- Diff review: **APPROVED**. Commit `e25e57b`.

### SEC-02
- Vérifs sécurité: 0 usage `navigator.*`/geolocation/getUserMedia/window.open/iframe ; seul lien externe (DetailModal:635) a `rel="noopener noreferrer"`. → 3 headers sans risque.
- Plan + diff review: **APPROVED** (cosmetic: `interest-cohort` inerte, HSTS `preload` = engagement ; gardés par fidélité à l'audit). Commit `5f88e92`.

### NEW-02
- Test d'intégration via `<App/>` (migrateHistory module-local) : seed `neutre` → bucket `whynot` sur Résultats. Reviewer a confirmé empiriquement la non-tautologie (neutralise migrateHistory → test échoue). +case all-neutre (hardening).
- Plan + diff review: **APPROVED**. Commit `fcad11c`. CLAUDE.md « 134 tests » désormais 247.

### TEST-04
- Hook gère déjà les 2 cas (catch :39-47 setItem/removeItem, catch :62-66 parse storage-event) → test-only. 3 tests (setItem throw + storage non-parsable + removeItem throw sur reset null). Reviewer a tué les mutants (rethrow → tests échouent). Commit `f07ac47`. 250 tests.

### NEW-03
- Plan review #1: **CHANGES_REQUESTED**. Blocking: (1) `cssUrlValue`=`encodeURI` double-encode → legit pre-encoded URLs 404 ; (2) test manquant chemin localStorage-bypass au sink ; (3) `mapMarkers.test` doit asserter qu'une URL normale survit intacte (pas juste l'absence de payload). Cosmetic: Element+CSSOM préférable ; `data:` rejeté consciemment.
- Révisions: cssUrlValue → escape CSS-string (`\HEX `) laissant `%`/parens/espaces intacts ; +tests bypass & intact ; string-HTML conservé (Element+CSSOM = risque réutilisation node Leaflet) ; `data:` rejeté + test.
- Plan review #2: **APPROVED**.
- Diff review: **APPROVED** (2 cosmetic non bloquants). 245 tests ✓ / lint ✓ / build ✓. Commit `8f87a90`.

### TEST-05
- 6 tests via API publique du hook (add url+file, update preserve+orphan, remove+IDB delete, revoke unmount). fake-indexeddb réel, mock seulement `resizeImage`. Reviewer a corrigé 3 hypothèses + build a attrapé `?.photoUrls?.[0]`. Commit `e3d8266`. 256 tests, lines 71%.

### TEST-06
- 3 tests (random-fill 2-3 supers + done ; review re-walk topIdx0 + banner + affordance ; eye getCurrent vs allActivities[len]). Reviewer a corrigé 2 bloquants (getByRole heading vs span Résultats ; pas d'advance timer après eye). 06d (stacking) → TEST-09. Commit `130d0d6`. 259 tests, lines 74%.

**Couverture actuelle** : statements 71.67 / branches 72.15 / functions 67.67 / lines 74.27 (plancher ratchet reste 66/63/59/67 — relèvement différé pour ne pas polluer chaque tâche ; à reconsidérer avant/après ARCH).

### ARCH-01 (plan — différé)
- Plan review: **CHANGES_REQUESTED** (5 blocking). Split pragmatique (useToast + useVoteHistory sans effets + useModalOverlays + AppConfirmModals ; App garde tab/done/reviewMode/identité) validé > 3 hooks littéraux de l'audit (dissout cycle allVoted↔done). Blocking: (1) garde random-fill vide (returns []→App skip done+toast) ; (2) branche reviewMode reste dans App (appendVote/upsertVote ; upsertVote persiste quotaHit) ; (3) **e2e obligatoire** ; (4) 2 tests caractérisation avant useModalOverlays (stacking-return + détail-upsert) ; (5) useVoteHistory renvoie la réf `useMemo(migrate,[rawHistory])`. Cosmetic: showToast id frais ; cible ~340-370 l.
- **e2e baseline : 23/23 ✓ (10.2s)** — couvre identity/add/map/detail/persistence (chemins absents du suite unit). Browsers présents.
- Décision: **TEST-09 élargi d'abord** (stacking-return e2e + détail-upsert + empty-fill jsdom) pour fournir la couverture exigée, puis re-soumettre ARCH-01 révisé.

### TEST-09
- 1 e2e (map.spec stacking-return, mapAboveDetail) + 1 jsdom (App détail-row upsert via localStorage length 1). empty-fill: button déjà caché à remaining=0 → garde App conservée en plus dans ARCH-01. Reviewer a re-run les 2 suites. Commit `3a8bef4`. 260 unit + 24 e2e.

### ARCH-01 (exécution)
- Plan révisé: **APPROVED** (5 blocking résolus). 4 hooks (useToast/useVoteHistory/useModalOverlays/useMapPins) + AppConfirmModals. App 649→492 l. (cible ~370 optimiste ; plancher = JSX 275 + ~110 handlers orchestration).
- Diff review: **APPROVED** (audit ligne-à-ligne, deps OK, 1 divergence intentionnelle non-bloquante : upsertVote remplace l'entrée → drop quotaHit périmé, net improvement, dans le contrat). Vérif: 260 unit + **24 e2e** + build + lint. Commit `c9b6d58`.

### CSS-01
- Idiome `0.01ms` (pas `animation:none` qui figerait les FX forwards-fill). Reviewer a confirmé : `none` cacherait/figerait les overlays. +e2e reduced-motion (emulateMedia, body animationDuration ≠'0s' vs '0s'). Commit `f9d8c1b`. 25 e2e.

### PERF-03
- Plan review #1: **CHANGES_REQUESTED** (3 blocking : main-guard symlink no-op → realpathSync ; pas de garde dist-vide ; pin gzip level). Révisé → **APPROVED**. Script `evaluateBundle` pur + testé (5 cas dont exactly-at-budget). Budget main 135/lazy 15, Leaflet exclu, gzip level 9 (~4kB sous le log Vite). Commit `6692c11`. 265 unit.

### État (12 tâches faites)
**FAIT (18)** — tous P0 (3) + tous P1 (10) + 5 P2 (TEST-09, NEW-01, SEC-03, NEW-04, ARCH-05). **Reste P2 (13)**: ARCH-04, ARCH-06, TS-01, TS-02, PERF-01, PERF-05, PERF-06, CSS-03, CSS-04, TEST-07, TEST-08, TEST-10, TEST-11. **P3 (3)**: SEC-01, PERF-02, CSS-02. Suites: **276 unit / 25 e2e ✓** sur `feature/optims`.
- Dépendances restantes: ARCH-04 < CSS-03 ; NEW-03(✓) < SEC-01 ; PERF-03(✓) ↔ PERF-01 ; PERF-05 conditionné à un profilage. Puis P2 (SEC-03, ARCH-04/05/06, TS-01/02, PERF-01/05/06, CSS-03/04, NEW-01/04, TEST-07/08/10/11) + P3 (SEC-01, PERF-02, CSS-02). Suites: 265 unit / 25 e2e ✓.

**CHECKPOINT** (tip branch `chore/perf-03-bundle-budget` = 12 commits chaînés, testable en local). Reprise: relire ce fichier → 1ère case non cochée = **ARCH-02**.
- **ARCH-02 déjà exploré** (DetailModal.tsx, 918 l.) : split présentiel en `DetailHero` (photo+close+tag chips/legend+title), `DetailMetaTiles` (warning difficulté + grid 4 tuiles + ratingComment + bloc Trajets), `DetailBody` (description+anecdote+links+carousel photos), `DetailMap` (SectionHeading+ActivityMiniMap), `DetailGroupVotes` (panel meDone/placeholder). `MetaTile` (l.43-99) déjà extrait. État local (open/lightboxIdx/legendOpen/armed) + close/handleAction restent dans DetailModal. Risque faible (présentiel). Garde-fou: e2e detail.spec/map.spec + 16 tests App. → plan + reviewer puis implémenter.

---

## Hors-audit — Fix « Trajets » (juin 2026)

**Demande Yves** : bloc « Trajets » du DetailModal pas propre — sur certaines fiches (ex. n°5) la ligne Tamarin contenait une référence à Trou aux Biches. Cause : le champ curé `transit` est **composite** sur ~9/198 fiches (`"~5 min (Tamarin/Black River) ou ~55 min (Trou aux Biches)"`) et était affiché brut sur la ligne Tamarin. Exigence : 2 lignes séparées, chacune ne parlant que de son propre départ, + « avoir les 2 à chaque fois ».

**Décision Yves** : temps de trajet = **approximation calculée depuis les coords** (`estimateDriveTime` + `coordsFor`) pour les 2 bases ; **sans coords → masquer le bloc** (idem la ligne « depuis Tamarin » de la Card). Le `transit` curé n'est plus affiché (c'était la source de la contamination).

**Implémenté (TDD)** : `DetailMetaTiles.tsx` (bloc → 2 lignes calculées, `return null` sans coords) + `Card.tsx` (ligne « depuis Tamarin » calculée, masquée sans coords). 3 tests DetailModal + 2 tests Card (RED→GREEN). **279 unit / 25 e2e ✓**, build + lint OK.

**⚠️ BACKLOG (plus tard, avec le hors-ligne)** : **~78/198 activités sans coords** → leur bloc Trajets est masqué (temporaire). Récupérer les coords manquantes (`npm run geocode:activities` + `coords-overrides.json`) pour réafficher les trajets partout. Cf. mémoire deferred-work item 3.

---

## Hors-audit — Lot « Ajouter une activité » (juin 2026)

7 retours Yves sur le formulaire d'ajout, corrigés en 6 commits TDD sur `feature/optims` :

1. **Note ⭐ (#1)** — cibles 30→44 px + tap = fixe la note (plus de remise à 0 accidentelle au re-tap) + bouton « Effacer ». `AddActivityScreen.tsx`. `ed325cd`→`c25f8f1`.
2. **Tags #2/#5** — 💎/🗝️ retirés de la palette (les toggles Pépite/Secret sont la source unique, re-synchronisés dans `tags` à l'enregistrement, en tête pour l'anneau doré Card) ; bouton « Ajouter » des tags retiré (Entrée + blur suffisent). `useAddActivityForm.ts` + `TagPickerPanel.tsx`. `ed325cd`.
3. **Position #4** — CSP `connect-src` débloque `nominatim.openstreetmap.org` (la recherche d'adresse remarche en prod) + champs latitude/longitude manuels. `vercel.json` + `LocationPicker.tsx`. `53f68f7`.
4. **Activité ajoutée #6** — **pas de bug** : déjà appendue en fin de deck (choix Yves « à la fin », futur multi-user) → atteignable après le deck curé, dans Résultats une fois votée. Ajout : lignes « Mes activités ajoutées » cliquables → ouvrent le détail (source review) pour prévisualiser/voter tout de suite. `AddActivityScreen.tsx` + `App.tsx`. `ff82d85`.
5. **Photo #3** — `resizeImage` lève sur format non décodable (HEIC sur navigateurs sans support) ; `submit` avalait l'erreur → maintenant catch + message d'alerte, formulaire conservé. `useAddActivityForm.ts`. `57305b8`.

Suites : **288 unit / 25 e2e ✓**, build + lint + budget OK. **Mergé + poussé sur main** (`37e66c0`→ déployé). Puis 2 raffinements étoiles (contour → pastille blanche + N/5) `2788514`/`0c96c34`, mergés/poussés.

---

## Hors-audit — Versioning + Réglages cachés (juin 2026)

- **Versioning (moitié locale)** — `package.json` 1.0.0 → `__APP_VERSION__` (vite define) → `src/constants/version.ts`. `useAppVersionCheck` compare à `localStorage` (`yallah.appVersion.v1`) au chargement → toast « Mis à jour en vX » si changement. `4c69ed0`. **Reste backlog** : prompt « nouvelle version → recharger » en direct (version.json statique, sans backend) avant la v1.1.0. Cf. mémoire deferred-work item 1.
- **Page Réglages cachée** — `SettingsModal` (plein écran, fermable) ouverte UNIQUEMENT par **5 taps consécutifs** (≤800 ms entre chaque) sur le wordmark `TopBar`. Affiche la version (seul contenu pour l'instant ; futur home du mode tuto). Version retirée de l'onglet Groupe. `a8a9627`.
- **Étoiles** — agrandies (34 px / cibles 48 px) + `pointer-events:none` sur le glyphe → toute l'étoile cliquable. `428354c`.

Suites : **297 unit / 25 e2e ✓**, build + lint + budget OK. **3 commits sur `main` en local, non poussés** (en attente du test local + OK push).
