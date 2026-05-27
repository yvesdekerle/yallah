import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import type { Activity } from './types/activity.ts'
import type { Verdict, VoteEntry } from './types/verdict.ts'
import { ACTIVITIES } from './data/activities.ts'
import { PARTICIPANTS } from './data/participants.ts'
import { useLocalStorage } from './hooks/useLocalStorage.ts'
import {
  EXIT_MS,
  STORAGE_KEYS,
  SUPER_MAX,
} from './constants/swipe.ts'
import { YB } from './utils/theme.ts'
import { Phone } from './components/Phone.tsx'
import { StatusBar } from './components/StatusBar.tsx'
import { TopBar } from './components/TopBar.tsx'
import { BottomNav, type TabIndex } from './components/BottomNav.tsx'
import { UndoButton } from './components/UndoButton.tsx'
import { ActionRow } from './components/ActionRow.tsx'
import { Toast } from './components/Toast.tsx'
import { DetailModal } from './components/DetailModal.tsx'
import { DeckDone } from './components/DeckDone.tsx'
import { SwipeDeck, type SwipeDeckHandle } from './components/SwipeDeck.tsx'
import { ResultsScreen } from './components/ResultsScreen.tsx'
import { GroupScreen } from './components/GroupScreen.tsx'
import { ConfirmModal } from './components/ConfirmModal.tsx'
import { IdentityPicker } from './components/IdentityPicker.tsx'
import { getCoords } from './utils/coords.ts'
import type { MapPin } from './components/FullscreenMap.tsx'

const FullscreenMap = lazy(() =>
  import('./components/FullscreenMap.tsx').then((m) => ({
    default: m.FullscreenMap,
  })),
)

interface ToastState {
  id: number
  text: string
  emoji?: string
}

type MapView =
  | { mode: 'all' }
  | { mode: 'single'; activityId: string }

// Legacy verdict-id migration: the "neutre" id was renamed to "whynot".
// Anyone with an existing local history needs their entries rewritten so
// they keep counting against the right bucket.
interface LegacyVoteEntry extends Omit<VoteEntry, 'verdict'> {
  verdict: VoteEntry['verdict'] | 'neutre'
}
function migrateHistory(raw: VoteEntry[] | LegacyVoteEntry[]): VoteEntry[] {
  return (raw as LegacyVoteEntry[]).map((e) =>
    e.verdict === 'neutre' ? { ...e, verdict: 'whynot' } : (e as VoteEntry),
  )
}

export default function App() {
  const [rawHistory, setHistory] = useLocalStorage<VoteEntry[]>(
    STORAGE_KEYS.history,
    [],
  )
  const [userId, setUserId] = useLocalStorage<string | null>(
    STORAGE_KEYS.userId,
    null,
  )
  const [changingIdentity, setChangingIdentity] = useState(false)
  const [mapView, setMapView] = useState<MapView | null>(null)
  // useMemo so callers don't see a fresh array on every render unless the
  // underlying storage changed.
  const history = useMemo(() => migrateHistory(rawHistory), [rawHistory])
  const [toast, setToast] = useState<ToastState | null>(null)
  const [done, setDone] = useState(false)
  /**
   * Review-mode = "re-balayer le deck": after finishing the initial swipe
   * the user can re-walk the entire deck to either confirm previous votes
   * (with the "=" button on the card) or change them. In this mode the
   * verdict handler UPSERTS by activity id instead of appending.
   */
  const [reviewMode, setReviewMode] = useState(false)
  // Lifted up from ResultsScreen so the modal renders at App level
  // (positioned relative to the Phone frame, not the scrollable list).
  // Avoids the "modal stuck at the top of the scroll content" bug.
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [confirmingRandomFill, setConfirmingRandomFill] = useState(false)
  // `detail` carries both the activity AND how the modal was opened.
  // From the swipe screen, voting buttons trigger the deck commit (advance
  // to next card). From the results screen, voting buttons UPDATE the
  // previous vote in place — no deck navigation.
  const [detail, setDetail] = useState<
    | { activity: Activity; source: 'swipe' | 'review' }
    | null
  >(null)
  const [activeTab, setActiveTab] = useState<TabIndex>(0)
  const deckRef = useRef<SwipeDeckHandle>(null)

  const superRemaining = useMemo(() => {
    const used = history.filter((h) => h.verdict === 'top' && !h.quotaHit).length
    return Math.max(0, SUPER_MAX - used)
  }, [history])

  const likedPins = useMemo<MapPin[]>(() => {
    const out: MapPin[] = []
    const seen = new Set<string>()
    for (const h of history) {
      if (h.verdict !== 'oui' && h.verdict !== 'top') continue
      if (seen.has(h.id)) continue
      seen.add(h.id)
      const coords = getCoords(h.id)
      if (!coords) continue
      const activity = ACTIVITIES.find((a) => a.id === h.id)
      if (!activity) continue
      out.push({ activity, coords, verdict: h.verdict })
    }
    return out
  }, [history])

  const singleMapPin = useCallback(
    (activityId: string): MapPin[] => {
      const coords = getCoords(activityId)
      if (!coords) return []
      const activity = ACTIVITIES.find((a) => a.id === activityId)
      if (!activity) return []
      const existing = history.find((h) => h.id === activityId)
      const verdict =
        existing && (existing.verdict === 'oui' || existing.verdict === 'top')
          ? existing.verdict
          : 'oui'
      return [{ activity, coords, verdict }]
    },
    [history],
  )

  const needsOnboarding = userId === null
  const showPicker = needsOnboarding || changingIdentity

  const handleVerdict = useCallback(
    (activity: Activity, verdict: Verdict, meta?: { quotaHit?: boolean }) => {
      const entry: VoteEntry = {
        id: activity.id,
        verdict,
        ...(meta?.quotaHit ? { quotaHit: true } : {}),
      }
      setHistory((h) => {
        if (reviewMode) {
          // Upsert by activity id — in review mode we never want
          // duplicates, the user is editing their vote.
          const idx = h.findIndex((e) => e.id === activity.id)
          if (idx < 0) return [...h, entry]
          const next = [...h]
          next[idx] = entry
          return next
        }
        return [...h, entry]
      })
      if (meta?.quotaHit) {
        setToast({
          id: Date.now(),
          text: 'Plus de super-likes — converti en like',
          emoji: '⭐',
        })
      }
    },
    [reviewMode, setHistory],
  )

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    setHistory((h) => h.slice(0, -1))
    setDone(false)
    setToast({ id: Date.now(), text: 'Swipe annulé', emoji: '↩' })
  }, [history.length, setHistory])

  const handleAction = useCallback((verdict: Verdict) => {
    deckRef.current?.commit(verdict)
  }, [])

  const handleReset = useCallback(() => {
    // userId is cleared too → the blocking IdentityPicker re-appears and
    // covers the toast (z-[40] > toast z-[9]), so no toast here.
    setHistory([])
    setUserId(null)
    setDone(false)
    setReviewMode(false)
    setChangingIdentity(false)
  }, [setHistory, setUserId])

  const handleReview = useCallback(() => {
    setDone(false)
    setReviewMode(true)
    setActiveTab(0) // bring the user to the swipe screen
    setToast({ id: Date.now(), text: 'Mode révision — utilise [=] pour garder', emoji: '↻' })
  }, [])

  const handleExitReview = useCallback(() => {
    setReviewMode(false)
    setToast({ id: Date.now(), text: 'Mode révision terminé', emoji: '✓' })
  }, [])

  /**
   * Fill all activities that haven't been voted on yet with a random
   * verdict picked from the four "passive" verdicts (no super-likes —
   * keeps the 5-quota intact). Useful to seed a deck quickly for demo
   * purposes or when you want to focus on a smaller subset.
   */
  const handleRandomFill = useCallback(() => {
    const votedIds = new Set(history.map((h) => h.id))
    const missing = ACTIVITIES.filter((a) => !votedIds.has(a.id))
    if (missing.length === 0) return
    const verdicts: Verdict[] = ['oui', 'non', 'whynot', 'skip']
    const additions: VoteEntry[] = missing.map((a) => ({
      id: a.id,
      verdict: verdicts[Math.floor(Math.random() * verdicts.length)]!,
    }))
    setHistory((h) => [...h, ...additions])
    setDone(false)
    setToast({
      id: Date.now(),
      text: `${additions.length} votes générés aléatoirement`,
      emoji: '🎲',
    })
  }, [history, setHistory])

  const handlePickIdentity = useCallback(
    (id: string) => {
      const wasOnboarding = userId === null
      if (wasOnboarding) {
        // userId is null ⇒ user hasn't identified yet (first launch, or
        // post-reset). Start them fresh under their newly chosen name.
        setHistory([])
        setDone(false)
        setReviewMode(false)
      }
      setUserId(id)
      setChangingIdentity(false)
      const p = PARTICIPANTS.find((x) => x.id === id)
      const name = p?.name ?? id
      setToast({
        id: Date.now(),
        text: wasOnboarding
          ? `Salut ${name}`
          : `Tu es maintenant ${name}`,
        emoji: wasOnboarding ? '👋' : '✨',
      })
    },
    [userId, setHistory, setUserId],
  )

  // Vote handler that's wired into the detail modal. Behaviour depends on
  // where the modal was opened from:
  // - `swipe`  → forward to the deck so it advances to the next card
  // - `review` → patch the existing history entry for this activity (or
  //              append one if there isn't one yet)
  const handleDetailVerdict = useCallback(
    (verdict: Verdict) => {
      if (!detail) return
      if (detail.source === 'swipe') {
        deckRef.current?.commit(verdict)
        return
      }
      const id = detail.activity.id
      setHistory((h) => {
        const idx = h.findIndex((e) => e.id === id)
        if (idx < 0) {
          return [...h, { id, verdict }]
        }
        const next = [...h]
        next[idx] = { ...next[idx]!, verdict }
        return next
      })
      setToast({
        id: Date.now(),
        text: 'Vote mis à jour',
        emoji: '✏️',
      })
    },
    [detail, setHistory],
  )

  const onSwipeTab = activeTab === 0

  return (
    <Phone bg={YB.bgSun}>
      <div
        className="relative h-full w-full overflow-hidden font-sans"
        style={{ background: YB.bgSun }}
      >
        <StatusBar />
        <TopBar />

        {/* Tabs stay MOUNTED — switching just toggles visibility. Avoids
            the SwipeDeck remounting + photo reflashing every time the
            user pops over to Résultats or Groupe and back. */}
        <div
          style={{ display: onSwipeTab ? 'contents' : 'none' }}
          aria-hidden={!onSwipeTab}
        >
          <UndoButton
            enabled={history.length > 0 && !done}
            onClick={handleUndo}
          />
          {reviewMode && (
            <button
              type="button"
              onClick={handleExitReview}
              aria-label="quitter le mode révision"
              className="absolute z-[9] inline-flex items-center font-sans cursor-pointer border-0"
              style={{
                top: 46,
                right: 18,
                height: 36,
                padding: '0 12px 0 14px',
                borderRadius: 99,
                background: YB.coral,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.2,
                gap: 8,
                boxShadow: '0 4px 12px -2px rgba(255,107,71,0.35)',
              }}
            >
              <span>Mode révision</span>
              <span
                aria-hidden
                style={{ fontSize: 16, lineHeight: 1, opacity: 0.9 }}
              >
                ✕
              </span>
            </button>
          )}
          {!done ? (
            <div
              className="phone-card-area absolute"
              style={{
                top: 76,
                left: 10,
                right: 10,
                bottom: 79,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SwipeDeck
                ref={deckRef}
                activities={ACTIVITIES}
                history={history}
                superRemaining={superRemaining}
                reviewMode={reviewMode}
                onVerdict={handleVerdict}
                onComplete={() =>
                  window.setTimeout(() => setDone(true), EXIT_MS)
                }
                onOpenDetail={(a) =>
                  setDetail({ activity: a, source: 'swipe' })
                }
              />
            </div>
          ) : (
            <DeckDone
              history={history}
              bg={YB.bgSun}
              onReset={handleReset}
              onReview={history.length > 0 ? handleReview : undefined}
            />
          )}
          {!done && (
            <ActionRow
              onAct={handleAction}
              superRemaining={superRemaining}
              onToggleDetail={() => {
                if (detail) {
                  setDetail(null)
                } else {
                  const current = ACTIVITIES[history.length]
                  if (current) setDetail({ activity: current, source: 'swipe' })
                }
              }}
              detailOpen={detail !== null}
            />
          )}
        </div>

        <div
          style={{ display: activeTab === 1 ? 'contents' : 'none' }}
          aria-hidden={activeTab !== 1}
        >
          <ResultsScreen
            history={history}
            activities={ACTIVITIES}
            onRequestReset={() => setConfirmingReset(true)}
            onSelectActivity={(a) =>
              setDetail({ activity: a, source: 'review' })
            }
            onReview={handleReview}
            reviewing={reviewMode}
            onRequestRandomFill={() => setConfirmingRandomFill(true)}
            onOpenMap={() => setMapView({ mode: 'all' })}
          />
        </div>

        <div
          style={{ display: activeTab === 2 ? 'contents' : 'none' }}
          aria-hidden={activeTab !== 2}
        >
          <GroupScreen
            currentUserId={userId}
            currentUserProgress={history.length}
            total={ACTIVITIES.length}
            onChangeIdentity={() => setChangingIdentity(true)}
          />
        </div>

        {toast && (
          <Toast
            key={toast.id}
            text={toast.text}
            emoji={toast.emoji}
            onDone={() => setToast(null)}
          />
        )}

        <BottomNav active={activeTab} onChange={setActiveTab} />

        {detail && (
          <DetailModal
            activity={detail.activity}
            onClose={() => setDetail(null)}
            superRemaining={superRemaining}
            onVerdict={handleDetailVerdict}
            onOpenMap={(view) => setMapView(view)}
          />
        )}

        {confirmingReset && (
          <ConfirmModal
            title="Tout effacer ?"
            message="Tes votes en cours et ton prénom seront supprimés. Cette action est irréversible."
            confirmLabel="Tout effacer"
            cancelLabel="Annuler"
            variant="danger"
            onConfirm={() => {
              handleReset()
              setConfirmingReset(false)
            }}
            onCancel={() => setConfirmingReset(false)}
          />
        )}

        {confirmingRandomFill && (
          <ConfirmModal
            title="Remplir aléatoirement ?"
            message={`${ACTIVITIES.length - history.length} activités non votées vont recevoir un verdict tiré au sort parmi : oui, non, why not, plus tard. Tu pourras toujours changer chaque vote ensuite.`}
            confirmLabel="Remplir"
            cancelLabel="Annuler"
            variant="primary"
            onConfirm={() => {
              handleRandomFill()
              setConfirmingRandomFill(false)
            }}
            onCancel={() => setConfirmingRandomFill(false)}
          />
        )}

        {showPicker && (
          <IdentityPicker
            currentUserId={userId}
            onPick={handlePickIdentity}
            onClose={
              changingIdentity ? () => setChangingIdentity(false) : undefined
            }
          />
        )}

        {mapView && (
          <Suspense fallback={null}>
            <FullscreenMap
              pins={
                mapView.mode === 'single' ? singleMapPin(mapView.activityId) : likedPins
              }
              initialCenter={
                mapView.mode === 'single'
                  ? (getCoords(mapView.activityId) ?? undefined)
                  : undefined
              }
              onClose={() => setMapView(null)}
              onSelectActivity={(a) => {
                setMapView(null)
                setDetail({ activity: a, source: 'review' })
              }}
            />
          </Suspense>
        )}
      </div>
    </Phone>
  )
}
