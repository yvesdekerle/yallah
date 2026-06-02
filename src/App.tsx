import { useCallback, useMemo, useRef, useState } from 'react'
import type { Activity } from './types/activity.ts'
import type { Verdict } from './types/verdict.ts'
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
import { Toast } from './components/Toast.tsx'
import { DetailModal } from './components/DetailModal.tsx'
import type { SwipeDeckHandle } from './components/SwipeDeck.tsx'
import { SwipeScreen } from './components/SwipeScreen.tsx'
import { ResultsScreen } from './components/ResultsScreen.tsx'
import { GroupScreen } from './components/GroupScreen.tsx'
import { AppConfirmModals } from './components/AppConfirmModals.tsx'
import { IdentityPicker } from './components/IdentityPicker.tsx'
import { AddActivityScreen } from './components/AddActivityScreen.tsx'
import { SettingsModal } from './components/SettingsModal.tsx'
import { TagFilterSheet } from './components/TagFilterSheet.tsx'
import { MapOverlay } from './components/MapOverlay.tsx'
import { TAG_LABELS } from './utils/tags.ts'
import { filteredDeck } from './utils/deck.ts'
import { APP_VERSION } from './constants/version.ts'
import {
  useUserActivities,
  type UserActivityInput,
} from './hooks/useUserActivities.ts'
interface AppProps {
  /** Curated activities, loaded + code-split in `main.tsx` and injected here so
      App stays a synchronous function of its data (and trivially testable). */
  activities: Activity[]
}

export default function App({ activities }: AppProps) {
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
    () => [...activities, ...userActivities],
    [activities, userActivities],
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

  // Deck exhausted. Exhausting a *filtered* subset doesn't mean every activity
  // is voted — don't trigger the global "Revoir les votes ?" in that case.
  const handleComplete = useCallback(() => {
    if (filterActive) return
    window.setTimeout(() => setDone(true), EXIT_MS)
  }, [filterActive])

  const handleOpenDetailFromSwipe = useCallback(
    (a: Activity) => setDetail({ activity: a, source: 'swipe' }),
    [setDetail],
  )

  // Eye-toggle: open the detail modal for the current card, or close it.
  const handleToggleDetail = useCallback(() => {
    if (detail) {
      setDetail(null)
      return
    }
    // Use the deck's notion of the current card so review mode (topIdx
    // independent of history.length) opens the right activity instead of the
    // next-to-vote one.
    const current =
      deckRef.current?.getCurrent() ?? deckActivities[history.length]
    if (current)
      setDetail({ activity: current, source: reviewMode ? 'review' : 'swipe' })
  }, [detail, setDetail, deckActivities, history.length, reviewMode])

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
          <SwipeScreen
            deckRef={deckRef}
            deckActivities={deckActivities}
            history={history}
            superRemaining={superRemaining}
            reviewMode={reviewMode}
            done={done}
            filteredEmpty={filteredEmpty}
            activeFilterCount={selectedTags.length}
            detailOpen={detail !== null}
            onVerdict={handleVerdict}
            onUndo={handleUndo}
            onExitReview={handleExitReview}
            onAction={handleAction}
            onReview={handleReview}
            onComplete={handleComplete}
            onOpenFilter={() => setFilterOpen(true)}
            onOpenDetail={handleOpenDetailFromSwipe}
            onToggleDetail={handleToggleDetail}
          />
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
            curatedActivities={activities}
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
          <MapOverlay
            view={mapView}
            history={history}
            activities={allActivities}
            aboveDetail={mapAboveDetail}
            onClose={closeMap}
            onSelectActivity={(a) => {
              // Keep the map mounted underneath so closing the DetailModal
              // returns the user to it instead of dumping them back to the
              // swipe deck. The map was opened from outside (Results or swipe),
              // so drop it below the modal we're about to open.
              setDetail({ activity: a, source: 'review' })
              setMapAboveDetail(false)
            }}
          />
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
