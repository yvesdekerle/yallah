import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import type { Activity } from './types/activity.ts'
import type { Verdict } from './types/verdict.ts'
import { ACTIVITIES } from './data/activities.ts'
import { PARTICIPANTS } from './data/participants.ts'
import { useLocalStorage } from './hooks/useLocalStorage.ts'
import { useToast } from './hooks/useToast.ts'
import { useAppVersionCheck } from './hooks/useAppVersionCheck.ts'
import { useVoteHistory } from './hooks/useVoteHistory.ts'
import { useModalOverlays } from './hooks/useModalOverlays.ts'
import { EXIT_MS, STORAGE_KEYS } from './constants/swipe.ts'
import { YB } from './utils/theme.ts'
import { Phone } from './components/Phone.tsx'
import { StatusBar } from './components/StatusBar.tsx'
import { TopBar } from './components/TopBar.tsx'
import { BottomNav, type TabIndex } from './components/BottomNav.tsx'
import { UndoButton } from './components/UndoButton.tsx'
import { ActionRow } from './components/ActionRow.tsx'
import { Toast } from './components/Toast.tsx'
import { DetailModal } from './components/DetailModal.tsx'
import { ReviewPrompt } from './components/ReviewPrompt.tsx'
import { SwipeDeck, type SwipeDeckHandle } from './components/SwipeDeck.tsx'
import { ResultsScreen } from './components/ResultsScreen.tsx'
import { GroupScreen } from './components/GroupScreen.tsx'
import { AppConfirmModals } from './components/AppConfirmModals.tsx'
import { IdentityPicker } from './components/IdentityPicker.tsx'
import { AddActivityScreen } from './components/AddActivityScreen.tsx'
import { SettingsModal } from './components/SettingsModal.tsx'
import { TagFilterSheet } from './components/TagFilterSheet.tsx'
import { TAG_LABELS } from './utils/tags.ts'
import { filteredDeck } from './utils/deck.ts'
import { APP_VERSION } from './constants/version.ts'
import {
  useUserActivities,
  type UserActivityInput,
} from './hooks/useUserActivities.ts'
import { useMapPins } from './hooks/useMapPins.ts'

const FullscreenMap = lazy(() =>
  import('./components/FullscreenMap.tsx').then((m) => ({
    default: m.FullscreenMap,
  })),
)

export default function App() {
  const [userId, setUserId] = useLocalStorage<string | null>(
    STORAGE_KEYS.userId,
    null,
  )
  const [changingIdentity, setChangingIdentity] = useState(false)
  const [done, setDone] = useState(false)
  /**
   * Review-mode = "re-balayer le deck": after finishing the initial swipe
   * the user can re-walk the entire deck to either confirm previous votes
   * (with the "=" button on the card) or change them. In this mode the
   * verdict handler UPSERTS by activity id instead of appending.
   */
  const [reviewMode, setReviewMode] = useState(false)
  const [activeTab, setActiveTab] = useState<TabIndex>(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Tag-facet filter (persisted): when non-empty, the swipe deck only serves
  // not-yet-voted activities carrying at least one of the selected tags (OR).
  const [selectedTags, setSelectedTags] = useLocalStorage<string[]>(
    STORAGE_KEYS.tagFilter,
    [],
  )
  const [filterOpen, setFilterOpen] = useState(false)
  const deckRef = useRef<SwipeDeckHandle>(null)

  const { toast, showToast, dismissToast } = useToast()

  // Detect when this device has loaded a newer build than it last ran.
  const onVersionUpgrade = useCallback(
    (version: string) => showToast(`Mis à jour en v${version}`, '✨'),
    [showToast],
  )
  useAppVersionCheck(onVersionUpgrade)

  const {
    userActivities,
    stored: storedUserActivities,
    add: addUserActivity,
    update: updateUserActivity,
    remove: removeUserActivity,
  } = useUserActivities()

  // Curated activities + the user's own additions (appended at the end so a
  // freshly-added one surfaces at the tail of the deck — and immediately when
  // the curated deck was already finished).
  const allActivities = useMemo<Activity[]>(
    () => [...ACTIVITIES, ...userActivities],
    [userActivities],
  )

  // Distinct tags present in the deck (+ how many activities carry each),
  // ordered by the canonical TAG_LABELS order with any unknowns appended.
  const { availableTags, tagCounts } = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of allActivities)
      for (const t of a.tags) counts[t] = (counts[t] ?? 0) + 1
    const known = Object.keys(TAG_LABELS).filter((t) => counts[t])
    const extras = Object.keys(counts).filter((t) => !(t in TAG_LABELS))
    return { availableTags: [...known, ...extras], tagCounts: counts }
  }, [allActivities])

  const {
    history,
    superRemaining,
    allVoted,
    appendVote,
    upsertVote,
    undoVote,
    randomFillVotes,
    clearHistory,
    removeVotesFor,
  } = useVoteHistory(allActivities)

  const {
    detail,
    setDetail,
    mapView,
    setMapView,
    mapAboveDetail,
    setMapAboveDetail,
    openMapAboveDetail,
    closeMap,
    confirmingReset,
    setConfirmingReset,
    confirmingRandomFill,
    setConfirmingRandomFill,
    confirmingDeleteActivity,
    setConfirmingDeleteActivity,
  } = useModalOverlays()

  const { likedPins, singleMapPin } = useMapPins(history, allActivities)

  // Apply the tag filter to the forward-swipe deck only (never in review /
  // done passes — those re-walk the full history). To keep SwipeDeck's
  // positional model intact (it shows `activities[history.length]`), we serve
  // the voted activities first, then the not-yet-voted ones matching the
  // filter — so the next card up is always the first unvoted match.
  const filterActive = selectedTags.length > 0
  const { deckActivities, filteredEmpty } = useMemo(() => {
    // Review / done passes re-walk the full history — never filter there.
    if (reviewMode || done) {
      return { deckActivities: allActivities, filteredEmpty: false }
    }
    return filteredDeck(allActivities, history, selectedTags)
  }, [reviewMode, done, allActivities, history, selectedTags])

  const needsOnboarding = userId === null
  const showPicker = needsOnboarding || changingIdentity

  const handleVerdict = useCallback(
    (activity: Activity, verdict: Verdict, meta?: { quotaHit?: boolean }) => {
      if (reviewMode) {
        // Upsert by activity id — in review mode we never want duplicates,
        // the user is editing their vote.
        upsertVote(activity.id, verdict, meta)
      } else {
        appendVote({
          id: activity.id,
          verdict,
          ...(meta?.quotaHit ? { quotaHit: true } : {}),
        })
      }
      if (meta?.quotaHit) {
        showToast('Plus de super-likes — converti en like', '⭐')
      }
    },
    [reviewMode, upsertVote, appendVote, showToast],
  )

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    undoVote()
    setDone(false)
    showToast('Swipe annulé', '↩')
  }, [history.length, undoVote, showToast])

  const handleAction = useCallback((verdict: Verdict) => {
    deckRef.current?.commit(verdict)
  }, [])

  const handleReset = useCallback(() => {
    // userId is cleared too → the blocking IdentityPicker re-appears and
    // covers the toast (z-[40] > toast z-[9]), so no toast here.
    clearHistory()
    setUserId(null)
    setDone(false)
    setReviewMode(false)
    setChangingIdentity(false)
  }, [clearHistory, setUserId])

  const handleReview = useCallback(() => {
    setDone(false)
    setReviewMode(true)
    setActiveTab(0) // bring the user to the swipe screen
    showToast('Mode révision — utilise [=] pour garder', '↻')
  }, [showToast])

  const handleExitReview = useCallback(() => {
    setReviewMode(false)
    // If everything's still voted, fall back to the "Revoir les votes ?"
    // prompt rather than an empty deck.
    setDone(allVoted)
    showToast('Mode révision terminé', '✓')
  }, [allVoted, showToast])

  const handleRandomFill = useCallback(() => {
    const added = randomFillVotes()
    if (added.length === 0) return
    // Everything's now voted → land on the "Revoir les votes ?" prompt.
    setDone(true)
    showToast(`${added.length} votes générés aléatoirement`, '🎲')
  }, [randomFillVotes, showToast])

  const handleAddActivity = useCallback(
    async (input: UserActivityInput) => {
      await addUserActivity(input)
      // A new card now exists past the curated deck — make it reachable even
      // if the user had already finished swiping everything else.
      setDone(false)
      showToast('Activité ajoutée', '➕')
    },
    [addUserActivity, showToast],
  )

  const handleUpdateActivity = useCallback(
    async (id: string, input: UserActivityInput) => {
      await updateUserActivity(id, input)
      showToast('Activité mise à jour', '✏️')
    },
    [updateUserActivity, showToast],
  )

  const handleConfirmDeleteActivity = useCallback(async () => {
    const id = confirmingDeleteActivity
    if (!id) return
    await removeUserActivity(id)
    // Drop the vote that referenced this activity so it doesn't linger.
    removeVotesFor(id)
    setConfirmingDeleteActivity(null)
    showToast('Activité supprimée', '🗑')
  }, [
    confirmingDeleteActivity,
    removeUserActivity,
    removeVotesFor,
    setConfirmingDeleteActivity,
    showToast,
  ])

  const handlePickIdentity = useCallback(
    (id: string) => {
      const wasOnboarding = userId === null
      if (wasOnboarding) {
        // userId is null ⇒ user hasn't identified yet (first launch, or
        // post-reset). Start them fresh under their newly chosen name.
        clearHistory()
        setDone(false)
        setReviewMode(false)
      }
      setUserId(id)
      setChangingIdentity(false)
      const p = PARTICIPANTS.find((x) => x.id === id)
      const name = p?.name ?? id
      showToast(
        wasOnboarding ? `Salut ${name}` : `Tu es maintenant ${name}`,
        wasOnboarding ? '👋' : '✨',
      )
    },
    [userId, clearHistory, setUserId, showToast],
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
      upsertVote(detail.activity.id, verdict)
      showToast('Vote mis à jour', '✏️')
    },
    [detail, upsertVote, showToast],
  )

  const onSwipeTab = activeTab === 0

  return (
    <Phone bg={YB.bgSun}>
      <div
        className="relative h-full w-full overflow-hidden font-sans"
        style={{ background: YB.bgSun }}
      >
        <StatusBar />
        <TopBar onSecretOpen={() => setSettingsOpen(true)} />

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
          <div
            className="phone-card-area absolute"
            style={{
              top: 76,
              left: 10,
              right: 10,
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 70px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // Trap SwipeDeck's internal z-indices (exiting card z 10,
              // drag stamps z 9) inside this stacking context so they
              // can't paint over the ActionRow (z 7) sitting outside.
              isolation: 'isolate',
            }}
          >
            {/* When everything's voted we keep the cards on screen (in
                review layout) and gate them behind the "Revoir les votes ?"
                prompt instead of an empty screen. */}
            <SwipeDeck
              ref={deckRef}
              activities={deckActivities}
              history={history}
              superRemaining={superRemaining}
              reviewMode={reviewMode || done}
              onVerdict={handleVerdict}
              onComplete={() => {
                // Exhausting a *filtered* subset doesn't mean every activity
                // is voted — don't trigger the global "Revoir les votes ?".
                if (filterActive) return
                window.setTimeout(() => setDone(true), EXIT_MS)
              }}
              onOpenDetail={(a) => setDetail({ activity: a, source: 'swipe' })}
            />
            {filteredEmpty && (
              <div
                className="absolute inset-0 z-[5] flex flex-col items-center justify-center text-center font-sans"
                style={{ padding: '0 32px', gap: 14 }}
              >
                <span aria-hidden style={{ fontSize: 40 }}>
                  🔍
                </span>
                <p
                  className="m-0"
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: YB.ink,
                    lineHeight: 1.4,
                  }}
                >
                  Aucune activité à voter pour ces catégories.
                </p>
                <button
                  type="button"
                  onClick={() => setFilterOpen(true)}
                  className="font-sans cursor-pointer border-0"
                  style={{
                    padding: '10px 18px',
                    borderRadius: 99,
                    background: YB.coral,
                    color: '#fff',
                    fontSize: 13.5,
                    fontWeight: 700,
                  }}
                >
                  Modifier les filtres
                </button>
              </div>
            )}
          </div>
          {!done && (
            <ActionRow
              onAct={handleAction}
              superRemaining={superRemaining}
              onOpenFilter={() => setFilterOpen(true)}
              activeFilterCount={selectedTags.length}
              onToggleDetail={() => {
                if (detail) {
                  setDetail(null)
                } else {
                  // Use the deck's notion of the current card so review
                  // mode (topIdx independent of history.length) opens the
                  // right activity instead of the next-to-vote one.
                  const current =
                    deckRef.current?.getCurrent() ??
                    deckActivities[history.length]
                  if (current)
                    setDetail({
                      activity: current,
                      source: reviewMode ? 'review' : 'swipe',
                    })
                }
              }}
              detailOpen={detail !== null}
            />
          )}
          {done && <ReviewPrompt onConfirm={handleReview} />}
        </div>

        <div
          style={{ display: activeTab === 1 ? 'contents' : 'none' }}
          aria-hidden={activeTab !== 1}
        >
          <ResultsScreen
            history={history}
            activities={allActivities}
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
            total={allActivities.length}
            onChangeIdentity={() => setChangingIdentity(true)}
          />
        </div>

        <div
          style={{ display: activeTab === 3 ? 'contents' : 'none' }}
          aria-hidden={activeTab !== 3}
        >
          <AddActivityScreen
            userActivities={userActivities}
            stored={storedUserActivities}
            onAdd={handleAddActivity}
            onUpdate={handleUpdateActivity}
            onRequestDelete={(id) => setConfirmingDeleteActivity(id)}
            onPreview={(a) => setDetail({ activity: a, source: 'review' })}
            active={activeTab === 3}
          />
        </div>

        {toast && (
          <Toast
            key={toast.id}
            text={toast.text}
            emoji={toast.emoji}
            onDone={dismissToast}
          />
        )}

        <BottomNav active={activeTab} onChange={setActiveTab} />

        {detail && (
          <DetailModal
            activity={detail.activity}
            onClose={() => setDetail(null)}
            superRemaining={superRemaining}
            onVerdict={handleDetailVerdict}
            onOpenMap={openMapAboveDetail}
            meDone={history.length >= allActivities.length}
            userId={userId}
            myVerdict={
              history.find((h) => h.id === detail.activity.id)?.verdict ?? null
            }
          />
        )}

        <AppConfirmModals
          confirmingReset={confirmingReset}
          onConfirmReset={() => {
            handleReset()
            setConfirmingReset(false)
          }}
          onCancelReset={() => setConfirmingReset(false)}
          confirmingRandomFill={confirmingRandomFill}
          randomFillCount={allActivities.length - history.length}
          onConfirmRandomFill={() => {
            handleRandomFill()
            setConfirmingRandomFill(false)
          }}
          onCancelRandomFill={() => setConfirmingRandomFill(false)}
          confirmingDeleteActivity={confirmingDeleteActivity !== null}
          onConfirmDeleteActivity={() => {
            void handleConfirmDeleteActivity()
          }}
          onCancelDeleteActivity={() => setConfirmingDeleteActivity(null)}
        />

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
          <Suspense
            fallback={
              <div
                className="absolute inset-0 z-[40]"
                style={{ background: YB.bgSoft }}
              />
            }
          >
            <FullscreenMap
              pins={
                mapView.mode === 'single' ? singleMapPin(mapView.activityId) : likedPins
              }
              initialCenter={
                mapView.mode === 'single'
                  ? (singleMapPin(mapView.activityId)[0]?.coords ?? undefined)
                  : undefined
              }
              onClose={closeMap}
              onSelectActivity={(a) => {
                // Keep the map mounted underneath so closing the DetailModal
                // returns the user to it instead of dumping them back to the
                // swipe deck.
                setDetail({ activity: a, source: 'review' })
                // Map was opened from outside (Results or swipe), keep it
                // below the modal we're about to open.
                setMapAboveDetail(false)
              }}
              zIndex={mapAboveDetail ? 60 : 40}
            />
          </Suspense>
        )}

        {settingsOpen && (
          <SettingsModal
            version={APP_VERSION}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        {filterOpen && (
          <TagFilterSheet
            tags={availableTags}
            tagCounts={tagCounts}
            selected={selectedTags}
            onApply={setSelectedTags}
            onClose={() => setFilterOpen(false)}
          />
        )}
      </div>
    </Phone>
  )
}
