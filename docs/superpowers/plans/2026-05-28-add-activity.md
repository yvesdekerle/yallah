# Add-Activity Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let the user add their own activities locally (localStorage + IndexedDB photos), surfaced through a 4th "Ajouter" tab, merged into the existing deck/résultats/carte.

**Architecture:** State lives in `App.tsx` (no global store). A `useUserActivities` hook owns the persisted list and hydrates IndexedDB photo blobs into object URLs. `allActivities = [...ACTIVITIES, ...userActivities]` replaces `ACTIVITIES` everywhere. Photo/coords resolution rides on the activity object (runtime fields `photoUrls`/`coords`), so util signatures stay sync.

**Tech Stack:** React 19, TS, Vite, Leaflet/react-leaflet (existing), IndexedDB, `<canvas>` resize, Nominatim (runtime search), Vitest + `fake-indexeddb`, Playwright.

Spec: `docs/superpowers/specs/2026-05-28-add-activity-design.md`.

---

## File structure

**Create:**
- `src/types/userActivity.ts` — `PhotoRef`, `StoredUserActivity`.
- `src/data/photoStore.ts` — IndexedDB wrapper (`putPhoto/getPhoto/deletePhoto`) + `resizeImage`.
- `src/data/photoStore.test.ts`
- `src/data/userActivities.ts` — localStorage load/persist + `makeUserId`.
- `src/data/userActivities.test.ts`
- `src/hooks/useUserActivities.ts` — state + object-URL hydration + add/update/remove.
- `src/components/AddActivityScreen.tsx` — 4th-tab screen (form + list).
- `src/components/AddActivityScreen.test.tsx`
- `src/components/LocationPicker.tsx` — Leaflet pin + Nominatim search (lazy-loaded).
- `e2e/add-activity.spec.ts`

**Modify:**
- `src/types/activity.ts` — runtime fields `userAdded?`, `photoUrls?`, `coords?`.
- `src/utils/coords.ts` — add `coordsFor(activity)`.
- `src/utils/photos.ts` — `heroPhotoUrl`/`detailPhotos` honor `activity.photoUrls`.
- `src/icons/index.tsx` — `Plus` icon.
- `src/components/BottomNav.tsx` — 4th tab, `TabIndex = 0|1|2|3`.
- `src/App.tsx` — merge, hook, tab block, `coordsFor` swap, delete-cleans-vote, `done` reset.
- `package.json` — `fake-indexeddb` devDep.

---

## Task 1: Types + dep

**Files:** modify `src/types/activity.ts`, create `src/types/userActivity.ts`, modify `package.json`.

- [ ] Add to `Activity` (all optional, documented as runtime/user-added):
  `userAdded?: boolean`, `photoUrls?: string[]`, `coords?: { lat: number; lng: number }`.
- [ ] `src/types/userActivity.ts`:
  ```ts
  import type { Activity } from './activity.ts'
  export type PhotoRef = { kind: 'url'; url: string } | { kind: 'upload'; id: string }
  export interface StoredUserActivity extends Activity {
    userAdded: true
    photoRefs: PhotoRef[]
    coords?: { lat: number; lng: number }
    createdAt: number
  }
  ```
- [ ] `npm i -D fake-indexeddb`.

## Task 2: photoStore.ts

IndexedDB db `yallah`, store `photos` (key = ref id → Blob). `resizeImage(blob, maxW, maxH, q)` via `createImageBitmap` + `<canvas>` + `toBlob`. Tests import `fake-indexeddb/auto`; cover put→get round-trip and delete. `resizeImage` not unit-tested (no canvas in jsdom).

## Task 3: userActivities.ts

`loadUserActivities(): StoredUserActivity[]` (parse `yallah.userActivities.v1`, `[]` on miss/bad JSON), `persistUserActivities(list)`, `makeUserId()` → `u-${crypto.randomUUID()}`. Tests in jsdom localStorage: round-trip, bad-JSON fallback, id prefix.

## Task 4: coordsFor + photos branch

- `coordsFor(activity)` = `activity.coords ?? getCoords(activity.id)`.
- `heroPhotoUrl`: if `activity.photoUrls?.length` → `activity.photoUrls[0]`; else current logic.
- `detailPhotos`: if `activity.photoUrls?.length` → `activity.photoUrls`; else current. Tests cover both branches.

## Task 5: useUserActivities hook

State seeded from `loadUserActivities()`. Effect resolves `photoRefs` → URLs (upload → `getPhoto` + `createObjectURL`, url → passthrough), stores in a map, revokes old URLs on change/unmount. Returns `userActivities: Activity[]` (`{...stored, userAdded:true, photoUrls, coords}`) + async `add(input)`, `update(id,input)`, `remove(id)` (deletes blobs). `add`/`update` resize pending files → `putPhoto`.

## Task 6: BottomNav + Plus icon

`Plus` icon (two strokes). `TABS` gains `{ icon: Plus, label: 'ajouter' }`. `TabIndex = 0|1|2|3`.

## Task 7: AddActivityScreen + LocationPicker

Form: title (required) + all Activity fields; category select (11 + "Autre…" free text); difficulty 4 levels; rating 0–5; tags emoji chips; pépite/secret toggles; insolite. Photo block: file input (`accept=image/*` multiple) + URL field; ordered thumbnails (1st = hero) with delete; no reorder. `LocationPicker`: Leaflet map (Mauritius center), tap to set pin (`useMapEvents`), search field → Nominatim (`countrycodes=mu`, on submit), clear button. Submit disabled until title non-empty. Below: "Mes activités ajoutées" list with Éditer (reloads form) / Supprimer (App-level ConfirmModal).

## Task 8: App.tsx integration

`const { userActivities, add, update, remove } = useUserActivities()`. `allActivities = useMemo(() => [...ACTIVITIES, ...userActivities], [userActivities])`. Replace `ACTIVITIES` → `allActivities` (SwipeDeck, ResultsScreen, GroupScreen total, likedPins, singleMapPin, randomFill, ActionRow fallback, message lengths). Swap `getCoords(id)` → `coordsFor(activity)` (likedPins/singleMapPin/ResultsScreen/DetailModal; map initialCenter via `allActivities.find`). 4th-tab block (`display: contents/none`) rendering `AddActivityScreen`. On add: if `history.length < allActivities.length` set `done=false`. Delete handler: `remove(id)` + strip the matching `VoteEntry`. `confirmingDeleteActivity` state + ConfirmModal at App level.

## Task 9: e2e + verify + ship

`e2e/add-activity.spec.ts`: go to Ajouter tab, fill title + URL photo, submit, see it in the list + Résultats; edit title; delete. Run `npm test`, `npm run lint`, `npm run build`; fix; commit; push.

---

## Self-review notes

- Spec coverage: form (T7), both photo sources (T2/T5/T7), map pin + Nominatim (T7), 4th tab (T6/T8), editable list + delete cleans vote+blobs (T7/T8/T5), append-at-end + done reset (T8), BDD isolation = photoStore/userActivities only (T2/T3).
- Type consistency: `photoUrls`/`coords` defined in T1, consumed T4/T5; `PhotoRef` T1 used T2/T5/T7; `coordsFor` T4 used T8.
- Known limits: `resizeImage` (canvas) + Leaflet picker covered by manual QA, not jsdom unit tests.
