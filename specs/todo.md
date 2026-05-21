# Yallah — Todo

> **Contexte** : application mobile-first de swipe (Tinder-like) pour décider d'activités entre amis. Premier cas d'usage : voyage à l'île Maurice — novembre 2026, groupe de 9 personnes.
>
> **Stack** : React 19 + TypeScript 5.9 + Vite 8 + Tailwind 3.4 + Vitest + Playwright + ESLint. Déploiement Vercel. Pas de BDD, pas d'auth, pas de partage réseau dans le v1 — tout en localStorage.
>
> **Périmètre v1** :
> - Swipe horizontal/vertical avec rotation, tampons, undo
> - Quota super-like (5 max)
> - Modal détail avec carousel + lightbox photos
> - Écran "deck terminé" avec récap des votes
> - 201 activités parsées depuis `activites-maurice.md`
> - Photos via LoremFlickr (avec fallback)
> - Persistence locale (localStorage) — chaque personne swipe sur son téléphone, on compare visuellement.
>
> **Conventions** : voir gymtracker (PascalCase pour composants, camelCase pour fonctions, types stricts, Tailwind inline). Commit Conventional Commits.

---

## Phase 0 — Bootstrap projet

- [x] ✅ **0.1** Initialiser package.json (name `yallah`, version 0.1.0, scripts dev/build/test/lint/e2e) — 2026-05-21
- [x] ✅ **0.2** Ajouter dépendances : `react`, `react-dom` (v19), et dev deps : `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `postcss`, `autoprefixer` — 2026-05-21
- [x] ✅ **0.3** Ajouter dev deps tests : `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@playwright/test` — 2026-05-21
- [x] ✅ **0.4** Ajouter dev deps lint/types : `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `@types/react`, `@types/react-dom`, `@types/node` — 2026-05-21
- [x] ✅ **0.5** Créer `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` (calqués gymtracker, strict) — 2026-05-21
- [x] ✅ **0.6** Créer `vite.config.ts` (plugin react, alias `@/` → `./src`) — 2026-05-21
- [x] ✅ **0.7** Créer `tailwind.config.js` avec theme custom (couleurs yallah : `bgSun`, `coral`, `ink`, etc.) + fonts (Sora, Instrument Serif, JetBrains Mono) — 2026-05-21
- [x] ✅ **0.8** Créer `postcss.config.js` — 2026-05-21
- [x] ✅ **0.9** Créer `eslint.config.js` (flat config calquée gymtracker) — 2026-05-21
- [x] ✅ **0.10** Créer `playwright.config.ts` (mobile viewport iPhone 13, baseURL localhost:5173) — 2026-05-21
- [x] ✅ **0.11** Créer `vercel.json` (SPA rewrites + security headers) — 2026-05-21
- [x] ✅ **0.12** Créer `.gitignore` (node_modules, dist, .env, test-results, etc.) — 2026-05-21
- [x] ✅ **0.13** Créer `index.html` (viewport mobile, lien Google Fonts, root div) — 2026-05-21
- [x] ✅ **0.14** Créer `src/main.tsx`, `src/App.tsx` minimal, `src/index.css` (directives Tailwind + reset) — 2026-05-21
- [x] ✅ **0.15** Créer `src/test/setup.ts` (import jest-dom, cleanup) — 2026-05-21
- [x] ✅ **0.16** Vérifier que `npm run dev` démarre, `npm run build` passe, `npm test` passe (test vide), `npm run lint` passe — 2026-05-21

---

## Phase 1 — Parsing des activités

- [x] ✅ **1.1** Écrire `src/types/activity.ts` : interface `Activity` (id, number, title, tags[], location, transit, description, duration?, difficulty?, price, rating, pepite, secret, insolite?), `Difficulty` — 2026-05-21
- [x] ✅ **1.2** Écrire `scripts/parse-activities.ts` : lit `activites-maurice.md`, extrait chaque bloc `#### n°N`, parse les champs, écrit `src/data/activities.json` — 2026-05-21
- [x] ✅ **1.3** Mapper les difficultés markdown (🟢/🟡/🟠/🔴) vers `{dot, label, detail?}` — 2026-05-21
- [x] ✅ **1.4** Détecter pépite 💎 + secret 🗝️ via les tags + heading (booléens dédiés sur Activity) — 2026-05-21
- [x] ✅ **1.5** Ajouter le script au `package.json` : `"parse:activities": "tsx scripts/parse-activities.ts"` — 2026-05-21
- [x] ✅ **1.6** Lancer le parser, vérifier les 201 activités extraites — 2026-05-21
- [x] ✅ **1.7** Écrire tests `scripts/parse-activities.test.ts` (19 tests : titres avec emojis/anciens, difficultés, ratings, intégration) — 2026-05-21
- [x] ✅ **1.8** Créer `src/data/activities.ts` qui importe le JSON et expose `ACTIVITIES: Activity[]` — 2026-05-21
- [x] ✅ **1.9** Utilitaire `src/utils/photos.ts` : hero + 12 photos detail par activité, biais paradise-beach + override par catégorie — 2026-05-21

---

## Phase 2 — Foundation UI

- [x] ✅ **2.1** `src/utils/theme.ts` : palette `YB` typée `as const` — 2026-05-21
- [x] ✅ **2.2** `src/constants/swipe.ts` : thresholds, durées, `SUPER_MAX`, `VERDICT_META`, `STORAGE_KEYS` — 2026-05-21
- [x] ✅ **2.3** `src/types/verdict.ts` : `Verdict`, `VoteEntry` — 2026-05-21
- [x] ✅ **2.4** `src/utils/swipe.ts` : `clamp`, `dragVerdict`, `exitOffset`, `dragRotation`, `dragIntensity` — fonctions pures — 2026-05-21
- [x] ✅ **2.5** Tests `src/utils/swipe.test.ts` : 19 tests couvrant dragVerdict (chaque direction, zones limites, dominance), exitOffset, clamp, rotation, intensity — 2026-05-21
- [x] ✅ **2.6** `src/icons/index.tsx` : composants SVG typés `IconProps` (X, Heart, Star, StarFilled, Undo, Pin, Clock, Wallet, Cards, Results, People, Eye, EyeOff, WhyNotChevron) — 2026-05-21
- [x] ✅ **2.7** Hook `src/hooks/useLocalStorage.ts` : générique, sync inter-onglets via `storage` event — 2026-05-21
- [x] ✅ **2.8** Tests `src/hooks/useLocalStorage.test.ts` : 7 tests (read/write/updater/fallback/cross-tab) — 2026-05-21

---

## Phase 3 — Chrome de l'app

- [x] ✅ **3.1** `src/components/Phone.tsx` : wrapper téléphone avec bezel + notch + media query mobile — 2026-05-21
- [x] ✅ **3.2** `src/components/StatusBar.tsx` : 9:41 + signal + batterie — 2026-05-21
- [x] ✅ **3.3** `src/components/TopBar.tsx` : wordmark `yallah` centré + point corail — 2026-05-21
- [x] ✅ **3.4** `src/components/BottomNav.tsx` : 3 onglets (boutons accessibles aria-pressed) — 2026-05-21
- [x] ✅ **3.5** Tests Phone/TopBar/BottomNav — 2026-05-21

---

## Phase 4 — Carte d'activité (swipe card)

- [x] ✅ **4.1** `src/components/Card.tsx` : photo XL via heroPhotoUrl, n° padding 2, tags top-right, gradient bas avec titre/lieu/transit/desc/note/durée/prix — 2026-05-21
- [x] ✅ **4.2** Fallback bg `#F4EFE5` (sable) si la photo ne charge pas — 2026-05-21
- [x] ✅ **4.3** Tests Card (4 tests : titre/lieu/transit/prix/rating/n°/tags/duration optionnelle) — 2026-05-21

---

## Phase 5 — Tampons (stamps)

- [x] ✅ **5.1** `src/components/StampOverlay.tsx` : NON / WHY NOT centré, rotation par verdict, opacité d'intensity — 2026-05-21
- [x] ✅ **5.2** `src/components/HeartStamp.tsx` : coeur SVG rose, "OUI" baked in — 2026-05-21
- [x] ✅ **5.3** Tests stamps (opacité aux extrêmes d'intensity, labels) — 2026-05-21

---

## Phase 6 — Action Row

- [x] ✅ **6.1** `src/components/ActionRow.tsx` : 5 boutons (non, why-not, oui, super-like avec badge, eye toggle) — 2026-05-21
- [x] ✅ **6.2** Super-like disabled visuellement (gris) et fonctionnellement quand quota = 0 — 2026-05-21
- [x] ✅ **6.3** Bouton eye avec 2 états (icône + couleur inversée) — 2026-05-21
- [x] ✅ **6.4** Tests ActionRow (5 tests : présence boutons, callbacks, quota, disabled) — 2026-05-21

---

## Phase 7 — Undo + Toast

- [x] ✅ **7.1** `src/components/UndoButton.tsx` : flottant top-left, disabled state — 2026-05-21
- [x] ✅ **7.2** `src/components/Toast.tsx` : auto-dismiss configurable, animation slide-in — 2026-05-21
- [x] ✅ **7.3** Tests UndoButton (3 tests) — 2026-05-21
- [x] ✅ **7.4** Tests Toast (rendering + fakeTimers pour le timeout) — 2026-05-21

---

## Phase 8 — Super-like FX

- [x] ✅ **8.1** Étoile SVG 10 points avec gradient or, "SUPER LIKE" sur 2 lignes (inline dans SuperLikeFX.tsx) — 2026-05-21
- [x] ✅ **8.2** `src/components/SuperLikeFX.tsx` : flash radial + halo pulsant + 14 sparkles + étoile centrale — 2026-05-21
- [x] ✅ **8.3** Keyframes définis dans `tailwind.config.js` (theme.extend.keyframes) : yallahSparkleFly, yallahHaloPulse, yallahBadgePop, yallahFlash, yallahDeckExit, yallahToast — 2026-05-21
- [x] ✅ **8.4** Tests SuperLikeFX (render + nb SVG sparkles) — 2026-05-21

---

## Phase 9 — Deck de swipe (gestes)

- [x] ✅ **9.1** `src/components/SwipeDeck.tsx` : pile + pointer handlers + tap detection — 2026-05-21
- [x] ✅ **9.2** Animation de sortie via CSS keyframes `yallahDeckExit` avec vars CSS (--fx/--fy/--fr/--tx/--ty/--tr), durée variable — 2026-05-21
- [x] ✅ **9.3** Peek card animée via CSS transition (key stable par id) — 2026-05-21
- [x] ✅ **9.4** Tampons drag = centrés / exit = embarqués dans le wrapper sortant — 2026-05-21
- [x] ✅ **9.5** Tint coloré full-frame avec opacity scale d'intensity — 2026-05-21
- [x] ✅ **9.6** Conversion super-like → oui + flag `quotaHit` quand quota épuisé — 2026-05-21
- [x] ✅ **9.7** API impérative via `forwardRef` + `useImperativeHandle` → `SwipeDeckHandle.commit(verdict)` — 2026-05-21
- [x] ✅ **9.8** Tests SwipeDeck (6 tests : render, commit, quota, history sync, complete, intended-verdict) — 2026-05-21

---

## Phase 10 — Détail (modal) + Lightbox

- [x] ✅ **10.1** `src/components/DetailModal.tsx` : modal slide-up complet (hero, pagination dots, meta chips, description, photos 12, groupe, sticky action bar) + Anecdote (insolite) optionnel — 2026-05-21
- [x] ✅ **10.2** Bouton close (X) + close au tap sur fond — 2026-05-21
- [x] ✅ **10.3** Sticky action row réutilise `ActionRow` (eye → close) — 2026-05-21
- [x] ✅ **10.4** `src/components/PhotoLightbox.tsx` : fond noir, flèches, pointer drag horizontal, clavier Esc/←/→ — 2026-05-21
- [x] ✅ **10.5** `src/components/MetaChip.tsx` : pill sand + icône / dot — 2026-05-21
- [x] ✅ **10.6** `src/components/SectionHeading.tsx` : h3 + compteur — 2026-05-21
- [x] ✅ **10.7** Tests DetailModal (6 tests : présence, anecdote conditionnelle, close X, pagination, vote-then-close) — 2026-05-21
- [x] ✅ **10.8** Tests PhotoLightbox (6 tests : counter, Esc, flèches clavier, flèche bouton, conditional arrows, close) — 2026-05-21

---

## Phase 11 — Écran "deck terminé"

- [x] ✅ **11.1** `src/components/DeckDone.tsx` : 🎉, headline, grille 2x2 (oui/super-like/why-not/non), bouton "Recommencer" — 2026-05-21
- [x] ✅ **11.2** Tests DeckDone (3 tests : headline, compteurs, reset) — 2026-05-21

---

## Phase 12 — App orchestrator (state global)

- [x] ✅ **12.1** `src/App.tsx` : compose tous les composants — 2026-05-21
- [x] ✅ **12.2** State `history` persisté en localStorage via `useLocalStorage`, + `toast/done/detail` en mémoire — 2026-05-21
- [x] ✅ **12.3** `superRemaining` dérivé via `useMemo` — 2026-05-21
- [x] ✅ **12.4** Handlers : `handleVerdict`, `handleUndo`, `handleAction` (commit via ref), `handleReset`, `onOpenDetail` — 2026-05-21
- [x] ✅ **12.5** Animation Toast via classe `animate-yallahToast` — 2026-05-21
- [x] ✅ **12.6** Background `YB.bgSun` par défaut — 2026-05-21
- [x] ✅ **12.7** Tests d'intégration App (7 tests : wordmark, undo state, vote, persistence localStorage, undo flow, quota épuisé, ouverture détail) — 2026-05-21

---

## Phase 13 — e2e Playwright

- [x] ✅ **13.1** `e2e/swipe.spec.ts` : 4 tests (wordmark, oui→carte change, undo→carte revient, undo désactivé sans vote) — 2026-05-21
- [x] ✅ **13.2** `e2e/detail.spec.ts` : 4 tests (ouvrir, contenu, fermer X, vote→close) — 2026-05-21
- [x] ✅ **13.3** `e2e/super-like.spec.ts` : 1 test couvrant le décompte de 5→0 + disabled à 0 — 2026-05-21
- [x] ✅ **13.4** `e2e/persistence.spec.ts` : 1 test (3 votes → reload → état restauré + storage validé) — 2026-05-21

---

## Phase 14 — Docs et déploiement

- [ ] **14.1** `README.md` : description, dev/build/test commands, structure, deployment
- [ ] **14.2** `CLAUDE.md` : conventions pour Claude (style gymtracker)
- [ ] **14.3** `SETUP.md` : étapes pour démarrer en local (clone, npm install, npm run parse:activities, npm run dev)
- [ ] **14.4** Vérifier `npm run build` produit un bundle correct dans `dist/`
- [ ] **14.5** Vérifier que les routes Vercel sont OK (`vercel.json` rewrites → index.html)
- [ ] **14.6** Lancer toute la suite : `npm run lint && npm test && npm run build && npm run test:e2e` → tout vert
- [ ] **14.7** Init git, premier commit, push vers GitHub (nouveau repo `yallah`)
- [ ] **14.8** Lien le repo à Vercel (manuel via dashboard — instructions dans README)

---

## Notes techniques

### Conventions de code

- Composants en `PascalCase.tsx` avec export nommé + default si point d'entrée principal
- Hooks en `useXxx.ts`
- Types stricts, pas de `any` (sauf cas justifiés avec comment)
- Pas de classes CSS modulaires : Tailwind inline. Pour les styles dynamiques complexes (drag transform, animations), utiliser style inline ou template Tailwind avec `arbitrary values` quand pertinent.
- Pour les animations qui ne se font pas via Tailwind (keyframes complexes), définir dans `index.css`
- Les SVG icons : composants React, taille `s` et couleur `c` en props
- Pas de mock de l'API (pas d'API)
- localStorage avec namespace `yallah.` pour éviter collisions

### Tests

- Vitest pour unit + composants (jsdom env)
- Playwright pour e2e (iPhone 13 viewport)
- Test files colocalisés `Foo.tsx` + `Foo.test.tsx`
- Tests purement utils dans `__tests__/` séparé
- Targets : >80% coverage des utils et hooks ; composants couvrent les chemins critiques (gestes, callbacks, accessibility), pas du pixel-perfect

### Décisions de design

- **Pas de routing** (single screen + modal overlay)
- **Pas de state manager** (Redux/Zustand) — useState + useLocalStorage suffisent en v1
- **Pas de i18n** en v1 — FR uniquement
- **Pas de skeleton/loader** des photos en v1 (LoremFlickr renvoie de toute façon une image)
- **Order des activités** : ordre du markdown (déjà trié par catégorie puis note décroissante)

### Hors v1 (v2+)

- Lobby multi-utilisateurs
- Écran résultats avec onglets (tous ensemble / sous-groupes / à débattre)
- Backend ou import/export des votes pour agrégation
- Auth Google
- Service worker / PWA / offline first
- i18n EN
