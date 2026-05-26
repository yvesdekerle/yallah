import { useCallback, useMemo, useRef, useState } from 'react'
import type { Activity } from './types/activity.ts'
import type { Verdict, VoteEntry } from './types/verdict.ts'
import { ACTIVITIES } from './data/activities.ts'
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

interface ToastState {
  id: number
  text: string
  emoji?: string
}

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
  // useMemo so callers don't see a fresh array on every render unless the
  // underlying storage changed.
  const history = useMemo(() => migrateHistory(rawHistory), [rawHistory])
  const [toast, setToast] = useState<ToastState | null>(null)
  const [done, setDone] = useState(false)
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

  const handleVerdict = useCallback(
    (activity: Activity, verdict: Verdict, meta?: { quotaHit?: boolean }) => {
      setHistory((h) => [
        ...h,
        { id: activity.id, verdict, ...(meta?.quotaHit ? { quotaHit: true } : {}) },
      ])
      if (meta?.quotaHit) {
        setToast({
          id: Date.now(),
          text: 'Plus de super-likes — converti en oui',
          emoji: '⭐',
        })
      }
    },
    [setHistory],
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
    setHistory([])
    setDone(false)
    setToast({ id: Date.now(), text: 'Votes réinitialisés', emoji: '↺' })
  }, [setHistory])

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

        {onSwipeTab && (
          <>
            <UndoButton
              enabled={history.length > 0 && !done}
              onClick={handleUndo}
            />
            {!done ? (
              <div
                className="phone-card-area absolute"
                style={{
                  top: 94,
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
              <DeckDone history={history} bg={YB.bgSun} onReset={handleReset} />
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
          </>
        )}

        {activeTab === 1 && (
          <ResultsScreen
            history={history}
            activities={ACTIVITIES}
            onReset={handleReset}
            onSelectActivity={(a) =>
              setDetail({ activity: a, source: 'review' })
            }
          />
        )}

        {activeTab === 2 && (
          <GroupScreen
            currentUserProgress={history.length}
            total={ACTIVITIES.length}
          />
        )}

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
          />
        )}
      </div>
    </Phone>
  )
}
