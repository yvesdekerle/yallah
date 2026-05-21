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
import { BottomNav } from './components/BottomNav.tsx'
import { UndoButton } from './components/UndoButton.tsx'
import { ActionRow } from './components/ActionRow.tsx'
import { Toast } from './components/Toast.tsx'
import { DetailModal } from './components/DetailModal.tsx'
import { DeckDone } from './components/DeckDone.tsx'
import { SwipeDeck, type SwipeDeckHandle } from './components/SwipeDeck.tsx'

interface ToastState {
  id: number
  text: string
  emoji?: string
}

export default function App() {
  const [history, setHistory] = useLocalStorage<VoteEntry[]>(
    STORAGE_KEYS.history,
    [],
  )
  const [toast, setToast] = useState<ToastState | null>(null)
  const [done, setDone] = useState(false)
  const [detail, setDetail] = useState<Activity | null>(null)
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
    setToast(null)
  }, [setHistory])

  return (
    <Phone bg={YB.bgSun}>
      <div
        className="relative h-full w-full overflow-hidden font-sans"
        style={{ background: YB.bgSun }}
      >
        <StatusBar />
        <TopBar />
        <UndoButton enabled={history.length > 0 && !done} onClick={handleUndo} />

        {!done ? (
          <div
            className="absolute"
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
              onOpenDetail={(a) => setDetail(a)}
            />
          </div>
        ) : (
          <DeckDone history={history} bg={YB.bgSun} onReset={handleReset} />
        )}

        {toast && (
          <Toast
            key={toast.id}
            text={toast.text}
            emoji={toast.emoji}
            onDone={() => setToast(null)}
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
                if (current) setDetail(current)
              }
            }}
            detailOpen={detail !== null}
          />
        )}

        <BottomNav active={0} />

        {detail && (
          <DetailModal
            activity={detail}
            onClose={() => setDetail(null)}
            superRemaining={superRemaining}
            onVerdict={(v) => deckRef.current?.commit(v)}
          />
        )}
      </div>
    </Phone>
  )
}
