import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
import type { Activity } from './types/activity.ts'
import type { Verdict } from './types/verdict.ts'
import type { GoogleUser } from './types/user.ts'
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
import type { SwipeDeckHandle } from './components/SwipeDeck.tsx'
import { SwipeScreen } from './components/SwipeScreen.tsx'
import { ResultsScreen } from './components/ResultsScreen.tsx'
import { GroupScreen } from './components/GroupScreen.tsx'
import { WelcomeScreen } from './components/WelcomeScreen.tsx'
import { GoogleButton } from './components/GoogleButton.tsx'
import { GoogleSignInButton } from './components/GoogleSignInButton.tsx'
import {
  firebaseAvailable,
  saveVotes,
  removeVote,
  clearVotes,
  signOutFirebase,
  upsertActivity,
} from './services/firebase/api.ts'
import { useFirebaseAuthSync } from './hooks/useFirebaseAuthSync.ts'
import { useVersionGate } from './hooks/useVersionGate.ts'
import { useGroupData } from './hooks/useGroupData.ts'
import { useRemoteVoteHydration } from './hooks/useRemoteVoteHydration.ts'
import { userActivityToDoc } from './utils/activityDoc.ts'
import type { ActivityCreator } from './types/activity.ts'
import { AppOverlays } from './components/AppOverlays.tsx'
import { TAG_LABELS } from './utils/tags.ts'
import { filteredDeck } from './utils/deck.ts'
import { APP_VERSION } from './constants/version.ts'
import {
  useUserActivities,
  type UserActivityInput,
} from './hooks/useUserActivities.ts'

// The "Ajouter" tab (~700 LOC of form + pickers) is split into its own chunk
// and only fetched the first time the user opens that tab — keeping it out of
// the eager entry bundle (PERF-01). Once visited it stays mounted (see
// `addTabSeen`) so in-progress form state survives tab switches.
const AddActivityScreen = lazy(() =>
  import('./components/AddActivityScreen.tsx').then((m) => ({
    default: m.AddActivityScreen,
  })),
)

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
  // Google SSO profile (client-side, no backend). Takes precedence over `userId`
  // as the active identity; the two are never both non-null (picking one clears
  // the other). Null ⇒ not signed in via Google.
  const [googleUser, setGoogleUser] = useLocalStorage<GoogleUser | null>(
    STORAGE_KEYS.googleUser,
    null,
  )
  // True once the user taps "Mode démo" on the welcome screen — reveals the
  // IdentityPicker. Session-only (the welcome screen never returns mid-session
  // except via logout/reset, which reset this).
  const [demoStarted, setDemoStarted] = useState(false)
  const [changingIdentity, setChangingIdentity] = useState(false)
  // The swipe screen's mode is two *independent* flags, deliberately not a
  // `'swiping' | 'review' | 'done'` union (ARCH-09): `done` (the current pass
  // reached the end → show the ReviewPrompt) and `reviewMode` (re-walking to
  // edit votes) are orthogonal, and all four combinations are reachable. In
  // particular `reviewMode && done` is the end of a *review* pass: the prompt
  // sits over the now-empty re-walked deck while the "exit review" pill stays
  // available — a 3-state union can't express that without dropping the pill or
  // just renaming the two booleans, so they stay separate.
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

  // Firebase Auth is the source of truth for the Google identity: adopt the
  // signed-in profile on load / restore (and mirror it + the running version to
  // Firestore), clear it on sign-out. No-op when Firebase isn't configured.
  useFirebaseAuthSync(setGoogleUser)

  // Force-reload this tab when a newer build is published (Google mode only —
  // the version gate compares the running build against the global
  // config/app.version in Firestore). No-op in demo / without Firebase.
  useVersionGate(googleUser !== null)

  // Real signed-in members + their votes (Google mode) — drives the Groupe tab
  // and the detail "Le groupe" panel. Empty in demo mode / without Firebase.
  const { members: groupMembers } = useGroupData(googleUser !== null)

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
    replaceHistory,
    removeVotesFor,
  } = useVoteHistory(allActivities)

  // On Google sign-in / reload, restore this user's votes from Firestore so they
  // follow them across devices (the local-first write path keeps writing them).
  useRemoteVoteHydration(googleUser?.uid ?? null, replaceHistory)

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

  const signedIn = userId !== null || googleUser !== null
  // First screen on launch: logo + Google sign-in / demo. Shown until the user
  // signs in (Google) or starts the demo flow.
  const showWelcome = !signedIn && !demoStarted
  // Demo identity picker: during onboarding once "Mode démo" is tapped, or when
  // an already-identified demo user taps "Changer d'identité".
  const showPicker = (!signedIn && demoStarted) || changingIdentity

  // The identity shown in the TopBar profile avatar + menu — Google profile
  // (real picture) or, in demo mode, the chosen participant (coloured initial
  // disc stands in for the photo).
  const profile = useMemo(() => {
    if (googleUser) {
      return {
        name: googleUser.name,
        ...(googleUser.picture ? { picture: googleUser.picture } : {}),
        color: YB.coral,
      }
    }
    if (userId) {
      const p = PARTICIPANTS.find((x) => x.id === userId)
      if (p) return { name: p.name, color: p.color }
    }
    return null
  }, [googleUser, userId])

  // The active identity id (Google uid or demo participant id) — used to tag
  // "créé par" and to flag the user's own contributions as "toi".
  const currentUserId = googleUser?.uid ?? userId
  const creator = useMemo<ActivityCreator | undefined>(() => {
    if (googleUser) return { uid: googleUser.uid, name: googleUser.name }
    if (userId) {
      const p = PARTICIPANTS.find((x) => x.id === userId)
      return { uid: userId, name: p?.name ?? userId }
    }
    return undefined
  }, [googleUser, userId])

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
      // Mirror the verdict to Firestore when signed in via Google (no-op in
      // demo mode / when Firebase isn't configured). Fire-and-forget: the local
      // history stays the source of truth for the session.
      if (googleUser) {
        void saveVotes(googleUser.uid, googleUser.name, {
          [activity.id]: {
            verdict,
            ...(meta?.quotaHit ? { quotaHit: true } : {}),
          },
        })
      }
      if (meta?.quotaHit) {
        showToast('Plus de super-likes — converti en like', '⭐')
      }
    },
    [reviewMode, upsertVote, appendVote, showToast, googleUser],
  )

  const handleUndo = useCallback(() => {
    if (history.length === 0) return
    const undone = history[history.length - 1]
    undoVote()
    if (googleUser && undone) void removeVote(googleUser.uid, undone.id)
    setDone(false)
    showToast('Swipe annulé', '↩')
  }, [history, undoVote, showToast, googleUser])

  const handleAction = useCallback((verdict: Verdict) => {
    deckRef.current?.commit(verdict)
  }, [])

  const handleReset = useCallback(() => {
    // Wipe only the votes — the user stays signed in and on the Résultats tab.
    // Locally that's the history; remotely it drops the `activities` map from
    // votes/{uid} while keeping the profile fields (uid/name). Without the
    // remote wipe the votes rehydrate on the next sign-in.
    clearHistory()
    if (googleUser) void clearVotes(googleUser.uid)
    setDone(false)
    setReviewMode(false)
    showToast('Votes réinitialisés', '🗑')
  }, [googleUser, clearHistory, showToast])

  // Signed in via Google: adopt the profile as the active identity, start a
  // fresh session (history is per-device), and land on the swipe deck.
  const handleGoogleUser = useCallback(
    (user: GoogleUser) => {
      clearHistory()
      setUserId(null)
      setGoogleUser(user)
      setDone(false)
      setReviewMode(false)
      setActiveTab(0)
      showToast(`Salut ${user.name}`, '👋')
    },
    [clearHistory, setUserId, setGoogleUser, showToast],
  )

  // Sign out of Google → back to the welcome screen. History is left as-is (the
  // next sign-in / demo pick clears it); use "Réinitialiser" to wipe votes too.
  // Log out of whichever identity is active (Google OR demo) → back to the
  // welcome screen. History is left as-is (the next sign-in / demo pick clears
  // it); "Réinitialiser" wipes votes too.
  const handleLogout = useCallback(() => {
    void signOutFirebase()
    setGoogleUser(null)
    setUserId(null)
    setDemoStarted(false)
    setChangingIdentity(false)
    setDone(false)
    setReviewMode(false)
    setActiveTab(0)
  }, [setGoogleUser, setUserId])

  const handleGoogleError = useCallback(() => {
    showToast('Connexion Google échouée', '⚠️')
  }, [showToast])

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
    // Mirror the generated batch to Firestore in a single merge write.
    if (googleUser) {
      const values = Object.fromEntries(
        added.map((e) => [
          e.id,
          { verdict: e.verdict, ...(e.quotaHit ? { quotaHit: true } : {}) },
        ]),
      )
      void saveVotes(googleUser.uid, googleUser.name, values)
    }
    // Everything's now voted → land on the "Revoir les votes ?" prompt.
    setDone(true)
    showToast(`${added.length} votes générés aléatoirement`, '🎲')
  }, [randomFillVotes, showToast, googleUser])

  const handleAddActivity = useCallback(
    async (input: UserActivityInput) => {
      const record = await addUserActivity(input, creator)
      // Mirror the new activity (with its creator) to Firestore when signed in.
      if (googleUser) void upsertActivity(userActivityToDoc(record))
      // A new card now exists past the curated deck — make it reachable even
      // if the user had already finished swiping everything else.
      setDone(false)
      showToast('Activité ajoutée', '➕')
    },
    [addUserActivity, showToast, creator, googleUser],
  )

  const handleUpdateActivity = useCallback(
    async (id: string, input: UserActivityInput) => {
      const record = await updateUserActivity(id, input)
      if (record && googleUser) void upsertActivity(userActivityToDoc(record))
      showToast('Activité mise à jour', '✏️')
    },
    [updateUserActivity, showToast, googleUser],
  )

  const handleConfirmDeleteActivity = useCallback(async () => {
    const id = confirmingDeleteActivity
    if (!id) return
    await removeUserActivity(id)
    // Drop the vote that referenced this activity so it doesn't linger.
    removeVotesFor(id)
    if (googleUser) void removeVote(googleUser.uid, id)
    setConfirmingDeleteActivity(null)
    showToast('Activité supprimée', '🗑')
  }, [
    confirmingDeleteActivity,
    removeUserActivity,
    removeVotesFor,
    setConfirmingDeleteActivity,
    showToast,
    googleUser,
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
      setGoogleUser(null) // demo identity and Google profile are exclusive
      setUserId(id)
      setChangingIdentity(false)
      const p = PARTICIPANTS.find((x) => x.id === id)
      const name = p?.name ?? id
      showToast(
        wasOnboarding ? `Salut ${name}` : `Tu es maintenant ${name}`,
        wasOnboarding ? '👋' : '✨',
      )
    },
    [userId, clearHistory, setUserId, setGoogleUser, showToast],
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

  // Open the detail sheet in review mode (Résultats row / Ajouter preview).
  // Stable identity so the memoized VotedActivityRow can skip re-renders.
  const openReviewDetail = useCallback(
    (a: Activity) => setDetail({ activity: a, source: 'review' }),
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

  // Mount the lazily-loaded "Ajouter" tab on first visit, then keep it mounted.
  // (React 19 setState-during-render — runs once, then the guard short-circuits.)
  const [addTabSeen, setAddTabSeen] = useState(false)
  if (activeTab === 3 && !addTabSeen) setAddTabSeen(true)

  return (
    <Phone bg={YB.bgSun}>
      <div
        className="relative h-full w-full overflow-hidden font-sans"
        style={{ background: YB.bgSun }}
      >
        <StatusBar />
        <TopBar
          onSecretOpen={() => setSettingsOpen(true)}
          profile={profile}
          onLogout={handleLogout}
          onOpenSettings={() => setSettingsOpen(true)}
        />

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
            onSelectActivity={openReviewDetail}
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
            googleUser={googleUser}
            currentUserProgress={history.length}
            total={allActivities.length}
            onChangeIdentity={() => setChangingIdentity(true)}
            members={groupMembers}
          />
        </div>

        {addTabSeen && (
          <div
            style={{ display: activeTab === 3 ? 'contents' : 'none' }}
            aria-hidden={activeTab !== 3}
          >
            <Suspense fallback={null}>
              <AddActivityScreen
                curatedActivities={activities}
                userActivities={userActivities}
                stored={storedUserActivities}
                onAdd={handleAddActivity}
                onUpdate={handleUpdateActivity}
                onRequestDelete={(id) => setConfirmingDeleteActivity(id)}
                onPreview={openReviewDetail}
                active={activeTab === 3}
              />
            </Suspense>
          </div>
        )}

        {toast && (
          <Toast
            key={toast.id}
            text={toast.text}
            emoji={toast.emoji}
            onDone={dismissToast}
          />
        )}

        <BottomNav active={activeTab} onChange={setActiveTab} />

        {showWelcome && (
          <WelcomeScreen
            onDemo={() => setDemoStarted(true)}
            googleSlot={
              firebaseAvailable ? (
                <GoogleSignInButton
                  onUser={handleGoogleUser}
                  onError={handleGoogleError}
                />
              ) : (
                <GoogleButton disabled />
              )
            }
          />
        )}

        <AppOverlays
          history={history}
          activities={allActivities}
          userId={userId}
          currentUserId={currentUserId}
          members={googleUser ? groupMembers : null}
          superRemaining={superRemaining}
          detail={{
            state: detail,
            onClose: () => setDetail(null),
            onVerdict: handleDetailVerdict,
            onOpenMap: openMapAboveDetail,
          }}
          map={{
            view: mapView,
            aboveDetail: mapAboveDetail,
            onClose: closeMap,
            onSelectActivity: (a) => {
              // Keep the map mounted underneath so closing the DetailModal
              // returns the user to it instead of the swipe deck. Opened from
              // outside (Results/swipe) → drop it below the modal we're opening.
              setDetail({ activity: a, source: 'review' })
              setMapAboveDetail(false)
            },
          }}
          confirms={{
            reset: {
              open: confirmingReset,
              onConfirm: () => {
                handleReset()
                setConfirmingReset(false)
              },
              onClose: () => setConfirmingReset(false),
            },
            randomFill: {
              open: confirmingRandomFill,
              onConfirm: () => {
                handleRandomFill()
                setConfirmingRandomFill(false)
              },
              onClose: () => setConfirmingRandomFill(false),
            },
            deleteActivity: {
              open: confirmingDeleteActivity !== null,
              onConfirm: () => {
                void handleConfirmDeleteActivity()
              },
              onClose: () => setConfirmingDeleteActivity(null),
            },
          }}
          picker={{
            show: showPicker,
            changingIdentity,
            onPick: handlePickIdentity,
            onExit: () => setChangingIdentity(false),
          }}
          settings={{
            open: settingsOpen,
            version: APP_VERSION,
            onClose: () => setSettingsOpen(false),
          }}
          filter={{
            open: filterOpen,
            availableTags,
            tagCounts,
            selected: selectedTags,
            onApply: setSelectedTags,
            onClose: () => setFilterOpen(false),
          }}
        />
      </div>
    </Phone>
  )
}
