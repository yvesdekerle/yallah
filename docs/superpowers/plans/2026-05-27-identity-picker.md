# Identity Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick their identity from the 9 hard-coded participants at first launch (and change it later from the Groupe page); the chosen participant's progress bar becomes the real one driven by localStorage history.

**Architecture:** New `yallah.userId.v1` localStorage key gates onboarding. A shared `IdentityPicker` bottom-sheet component handles both first-launch (blocking) and "Changer d'identité" (dismissable) flows. `GroupScreen` accepts `currentUserId` as a prop instead of reading the hard-coded `CURRENT_USER_ID` constant. The Réinitialiser button now clears identity too, sending the user back to onboarding.

**Tech Stack:** React 19, TypeScript 5.9 strict, Tailwind CSS 3.4, Vitest + @testing-library/react, Playwright.

**Spec:** [`docs/superpowers/specs/2026-05-27-identity-picker-design.md`](../specs/2026-05-27-identity-picker-design.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/constants/swipe.ts` | Modify | Add `STORAGE_KEYS.userId`. |
| `src/components/IdentityPicker.tsx` | Create | Bottom-sheet listing the 9 participants. Blocking when `onClose` is absent, dismissable otherwise. |
| `src/components/IdentityPicker.test.tsx` | Create | Unit tests for the picker. |
| `src/components/GroupScreen.tsx` | Modify | Replace `CURRENT_USER_ID` constant with `currentUserId` prop; add "Changer d'identité" button. |
| `src/components/GroupScreen.test.tsx` | Modify | Update tests to pass the new prop; cover the change-identity button. |
| `src/data/participants.ts` | Modify | Remove `CURRENT_USER_ID` constant (no longer hard-coded). |
| `src/App.tsx` | Modify | Add `userId` state via `useLocalStorage`; render `IdentityPicker` for onboarding + change flow; wire reset to clear identity. |
| `e2e/swipe.spec.ts` | Modify | Pre-seed `yallah.userId.v1` in `beforeEach` so the picker doesn't block. |
| `e2e/detail.spec.ts` | Modify | Same pre-seed. |
| `e2e/super-like.spec.ts` | Modify | Same pre-seed. |
| `e2e/persistence.spec.ts` | Modify | Same pre-seed. |
| `e2e/identity.spec.ts` | Create | E2E tests for onboarding + change identity + reset → onboarding. |
| `CLAUDE.md` | Modify | Document the new localStorage key in the Storage section. |

---

## Task 1: Add `STORAGE_KEYS.userId`

**Files:**
- Modify: `src/constants/swipe.ts:28-30`

- [ ] **Step 1: Add the key**

Edit `src/constants/swipe.ts`, replacing the `STORAGE_KEYS` block:

```ts
export const STORAGE_KEYS = {
  history: 'yallah.history.v1',
  userId: 'yallah.userId.v1',
} as const
```

- [ ] **Step 2: Confirm TypeScript is happy**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/constants/swipe.ts
git commit -m "chore: add STORAGE_KEYS.userId for identity picker"
```

---

## Task 2: Build `IdentityPicker` component (TDD)

**Files:**
- Create: `src/components/IdentityPicker.test.tsx`
- Create: `src/components/IdentityPicker.tsx`

The picker is a bottom-sheet rendered at the App level (sibling of
`ConfirmModal`). Two modes:
- **Blocking** (`onClose` undefined): used during first-launch
  onboarding. No close button. Backdrop tap is a no-op.
- **Dismissable** (`onClose` defined): used by the "Changer d'identité"
  button on Groupe. Close button visible. Backdrop tap + Escape close.

In both modes, tapping a participant row triggers `onPick(id)`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/IdentityPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IdentityPicker } from './IdentityPicker.tsx'
import { PARTICIPANTS } from '../data/participants.ts'

describe('IdentityPicker', () => {
  it('renders all 9 participants', () => {
    render(<IdentityPicker currentUserId={null} onPick={() => {}} />)
    for (const p of PARTICIPANTS) {
      expect(screen.getByText(p.name)).toBeInTheDocument()
    }
  })

  it('calls onPick with the tapped participant id', () => {
    const onPick = vi.fn()
    render(<IdentityPicker currentUserId={null} onPick={onPick} />)
    fireEvent.click(screen.getByTestId('picker-row-chloe'))
    expect(onPick).toHaveBeenCalledWith('chloe')
  })

  it('shows the "toi" badge on the current user row', () => {
    render(<IdentityPicker currentUserId="chloe" onPick={() => {}} />)
    const row = screen.getByTestId('picker-row-chloe')
    expect(row).toHaveTextContent('toi')
    const yvesRow = screen.getByTestId('picker-row-yves')
    expect(yvesRow).not.toHaveTextContent('toi')
  })

  it('does not render a close button when onClose is undefined (blocking mode)', () => {
    render(<IdentityPicker currentUserId={null} onPick={() => {}} />)
    expect(screen.queryByLabelText('fermer le sélecteur')).toBeNull()
  })

  it('renders a close button when onClose is defined and triggers it', () => {
    const onClose = vi.fn()
    render(
      <IdentityPicker
        currentUserId="chloe"
        onPick={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByLabelText('fermer le sélecteur'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape when dismissable', () => {
    const onClose = vi.fn()
    render(
      <IdentityPicker
        currentUserId="chloe"
        onPick={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on Escape when blocking', () => {
    const onPick = vi.fn()
    render(<IdentityPicker currentUserId={null} onPick={onPick} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    // No assertion-style "must not throw" — picker still shown.
    expect(screen.getByText('Adé')).toBeInTheDocument()
  })

  it('closes on backdrop tap when dismissable', () => {
    const onClose = vi.fn()
    render(
      <IdentityPicker
        currentUserId="chloe"
        onPick={() => {}}
        onClose={onClose}
      />,
    )
    fireEvent.click(screen.getByTestId('picker-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does NOT close on backdrop tap when blocking', () => {
    const onPick = vi.fn()
    render(<IdentityPicker currentUserId={null} onPick={onPick} />)
    fireEvent.click(screen.getByTestId('picker-backdrop'))
    // Picker still rendered.
    expect(screen.getByText('Adé')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- src/components/IdentityPicker.test.tsx`
Expected: FAIL with "Failed to resolve import './IdentityPicker.tsx'".

- [ ] **Step 3: Implement `IdentityPicker`**

Create `src/components/IdentityPicker.tsx`:

```tsx
import { useEffect } from 'react'
import { PARTICIPANTS } from '../data/participants.ts'
import { YB } from '../utils/theme.ts'

interface IdentityPickerProps {
  currentUserId: string | null
  onPick: (id: string) => void
  /**
   * When undefined the picker is blocking: no close button, Escape and
   * backdrop tap do nothing. Used during onboarding.
   */
  onClose?: () => void
}

export function IdentityPicker({
  currentUserId,
  onPick,
  onClose,
}: IdentityPickerProps) {
  const dismissable = !!onClose

  useEffect(() => {
    if (!dismissable) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose!()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissable, onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choisis ton prénom"
      data-testid="picker-backdrop"
      onClick={dismissable ? () => onClose!() : undefined}
      className="absolute inset-0 z-[40] flex items-end justify-center font-sans"
      style={{
        background: dismissable
          ? 'rgba(20,25,40,0.55)'
          : 'rgba(20,25,40,0.85)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full"
        style={{
          background: '#fff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: '20px 18px calc(env(safe-area-inset-bottom, 0px) + 22px)',
          boxShadow: '0 -10px 30px -10px rgba(20,30,50,0.35)',
          maxHeight: '85%',
          overflowY: 'auto',
        }}
      >
        <div
          className="flex items-center"
          style={{ justifyContent: 'space-between', marginBottom: 4 }}
        >
          <h2
            className="m-0 font-sans"
            style={{
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: -0.3,
              color: YB.ink,
            }}
          >
            Tu es qui ?
          </h2>
          {dismissable && (
            <button
              type="button"
              onClick={() => onClose!()}
              aria-label="fermer le sélecteur"
              className="font-sans cursor-pointer border-0"
              style={{
                background: 'transparent',
                color: YB.muted,
                fontSize: 22,
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>
          )}
        </div>
        <p
          className="font-sans"
          style={{
            margin: '0 0 16px',
            fontSize: 13.5,
            color: YB.ink2,
            lineHeight: 1.45,
          }}
        >
          Choisis ton prénom dans la liste.
        </p>

        <div className="flex flex-col" style={{ gap: 6 }}>
          {PARTICIPANTS.map((p) => {
            const isMe = p.id === currentUserId
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p.id)}
                data-testid={`picker-row-${p.id}`}
                className="flex items-center font-sans text-left w-full border-0 cursor-pointer"
                style={{
                  background: isMe ? YB.bgSoft : '#fff',
                  border: `1px solid ${isMe ? YB.ink : 'rgba(20,30,50,0.08)'}`,
                  borderRadius: 12,
                  padding: '10px 12px',
                  gap: 12,
                }}
              >
                <span
                  className="inline-flex items-center justify-center font-sans"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 99,
                    background: p.color,
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 800,
                    flexShrink: 0,
                    textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                  aria-hidden
                >
                  {p.initial}
                </span>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: YB.ink,
                    letterSpacing: -0.2,
                    flex: 1,
                  }}
                >
                  {p.name}
                </span>
                {isMe && (
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 9.5,
                      letterSpacing: 0.8,
                      padding: '2px 6px',
                      borderRadius: 99,
                      background: YB.ink,
                      color: '#fff',
                      textTransform: 'uppercase',
                    }}
                  >
                    toi
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- src/components/IdentityPicker.test.tsx`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/IdentityPicker.tsx src/components/IdentityPicker.test.tsx
git commit -m "feat: IdentityPicker bottom-sheet component"
```

---

## Task 3: Update `GroupScreen` — `currentUserId` prop + "Changer d'identité" button

**Files:**
- Modify: `src/components/GroupScreen.test.tsx`
- Modify: `src/components/GroupScreen.tsx`

- [ ] **Step 1: Update the failing tests first**

Replace `src/components/GroupScreen.test.tsx` entirely with:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GroupScreen } from './GroupScreen.tsx'
import { PARTICIPANTS } from '../data/participants.ts'

const noop = () => {}

describe('GroupScreen', () => {
  it('shows the group headline', () => {
    render(
      <GroupScreen
        currentUserId="yves"
        currentUserProgress={0}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    expect(screen.getByText('Le groupe')).toBeInTheDocument()
    expect(
      screen.getByText('9 personnes pour Maurice — novembre 2026.'),
    ).toBeInTheDocument()
  })

  it('renders all 9 participants in alphabetical order', () => {
    render(
      <GroupScreen
        currentUserId="yves"
        currentUserProgress={0}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    for (const p of PARTICIPANTS) {
      expect(screen.getByText(p.name)).toBeInTheDocument()
    }
    expect(PARTICIPANTS.map((p) => p.name)).toEqual([
      'Adé',
      'Alex',
      'Amély',
      'Audrey',
      'Chloé',
      'July',
      'Mathieu',
      'Quentin',
      'Yves',
    ])
  })

  it('uses the real progress for the currentUserId, fake for everyone else', () => {
    render(
      <GroupScreen
        currentUserId="chloe"
        currentUserProgress={37}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    const chloeRow = screen.getByTestId('participant-chloe')
    expect(chloeRow).toHaveTextContent('37 / 201')
    expect(chloeRow).toHaveTextContent('toi')

    const yvesRow = screen.getByTestId('participant-yves')
    // Yves no longer has fakeProgress hard-coded → 0 / 201
    expect(yvesRow).toHaveTextContent('0 / 201')
    expect(yvesRow).not.toHaveTextContent('toi')

    const alexRow = screen.getByTestId('participant-alex')
    expect(alexRow).toHaveTextContent('142 / 201')
  })

  it('shows no "toi" badge when currentUserId is null', () => {
    render(
      <GroupScreen
        currentUserId={null}
        currentUserProgress={50}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    for (const p of PARTICIPANTS) {
      const row = screen.getByTestId(`participant-${p.id}`)
      expect(row).not.toHaveTextContent('toi')
    }
  })

  it('shows ✓ fini when a participant reached the total', () => {
    render(
      <GroupScreen
        currentUserId="yves"
        currentUserProgress={0}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    expect(screen.getByTestId('participant-audrey')).toHaveTextContent('fini')
  })

  it('shows ✓ fini for the local user once they finish the deck', () => {
    render(
      <GroupScreen
        currentUserId="chloe"
        currentUserProgress={201}
        total={201}
        onChangeIdentity={noop}
      />,
    )
    expect(screen.getByTestId('participant-chloe')).toHaveTextContent('fini')
  })

  it('renders a "Changer d\'identité" button and fires the callback', () => {
    const onChangeIdentity = vi.fn()
    render(
      <GroupScreen
        currentUserId="yves"
        currentUserProgress={0}
        total={201}
        onChangeIdentity={onChangeIdentity}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /changer d'identité/i }))
    expect(onChangeIdentity).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test -- src/components/GroupScreen.test.tsx`
Expected: FAIL (type errors on `currentUserId`/`onChangeIdentity` props, missing button).

- [ ] **Step 3: Rewrite `src/components/GroupScreen.tsx`**

Replace the entire file contents with:

```tsx
import { PARTICIPANTS } from '../data/participants.ts'
import { YB } from '../utils/theme.ts'

interface GroupScreenProps {
  /** Id of the participant the local user identifies as. Null while
      onboarding is still pending (picker visible, GroupScreen invisible
      but still mounted). */
  currentUserId: string | null
  /** Number of activities the local user has swiped. */
  currentUserProgress: number
  /** Total number of activities in the deck. */
  total: number
  /** Open the IdentityPicker (handled at App level). */
  onChangeIdentity: () => void
}

/**
 * "Groupe" tab — hard-coded list of the 9 participants. Each row shows a
 * per-person progress bar: real for the local user (`currentUserId`),
 * faked-but-stable for the others (until we wire a backend).
 */
export function GroupScreen({
  currentUserId,
  currentUserProgress,
  total,
  onChangeIdentity,
}: GroupScreenProps) {
  return (
    <div
      className="absolute inset-0 z-[1] overflow-y-auto font-sans"
      style={{
        background: YB.bgSun,
        color: YB.ink,
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 76px)',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div style={{ padding: '0 22px' }}>
        <h1
          className="m-0 font-sans"
          style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}
        >
          Le groupe
        </h1>
        <p
          className="font-sans"
          style={{
            margin: '6px 0 22px',
            fontSize: 13.5,
            color: YB.ink2,
            lineHeight: 1.45,
          }}
        >
          {PARTICIPANTS.length} personnes pour Maurice — novembre 2026.
        </p>

        <div className="flex flex-col" style={{ gap: 8 }}>
          {PARTICIPANTS.map((p) => {
            const isMe = currentUserId !== null && p.id === currentUserId
            const progress = isMe
              ? currentUserProgress
              : (p.fakeProgress ?? 0)
            const pct = total > 0 ? Math.min(100, (progress / total) * 100) : 0
            const isDone = progress >= total && total > 0
            return (
              <div
                key={p.id}
                className="font-sans"
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: '12px 14px',
                  boxShadow: '0 2px 8px -2px rgba(20,30,50,0.06)',
                }}
                data-testid={`participant-${p.id}`}
              >
                <div className="flex items-center" style={{ gap: 14 }}>
                  <span
                    className="inline-flex items-center justify-center font-sans"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 99,
                      background: p.color,
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: 800,
                      flexShrink: 0,
                      textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                    }}
                    aria-hidden
                  >
                    {p.initial}
                  </span>
                  <div
                    className="flex-1 flex items-baseline"
                    style={{ gap: 8 }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: YB.ink,
                        letterSpacing: -0.2,
                      }}
                    >
                      {p.name}
                    </span>
                    {isMe && (
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 9.5,
                          letterSpacing: 0.8,
                          padding: '2px 6px',
                          borderRadius: 99,
                          background: YB.ink,
                          color: '#fff',
                          textTransform: 'uppercase',
                        }}
                      >
                        toi
                      </span>
                    )}
                  </div>
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 12,
                      color: isDone ? YB.green : YB.muted,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                    aria-label={`${progress} sur ${total} activités swipées`}
                  >
                    {isDone ? '✓ fini' : `${progress} / ${total}`}
                  </span>
                </div>

                <div
                  className="relative overflow-hidden"
                  style={{
                    marginTop: 10,
                    height: 6,
                    borderRadius: 99,
                    background: 'rgba(20,30,50,0.08)',
                  }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={progress}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: `${pct}%`,
                      background: isDone ? YB.green : p.color,
                      borderRadius: 99,
                      transition: 'width 0.3s ease-out',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onChangeIdentity}
          className="font-sans cursor-pointer"
          style={{
            marginTop: 24,
            width: '100%',
            padding: '12px 0',
            borderRadius: 99,
            background: '#fff',
            color: YB.ink,
            fontWeight: 700,
            fontSize: 14,
            border: `1px solid ${YB.ink}`,
            boxShadow: '0 2px 8px -2px rgba(20,30,50,0.08)',
          }}
          aria-label="changer d'identité"
        >
          Changer d'identité
        </button>
      </div>
    </div>
  )
}
```

Notice the import of `CURRENT_USER_ID` is gone.

- [ ] **Step 4: Remove `CURRENT_USER_ID` export from `participants.ts`**

Edit `src/data/participants.ts:33-34`, delete these two lines:

```ts
/** Id used to identify the local user — their progress is dynamic. */
export const CURRENT_USER_ID = 'yves'
```

- [ ] **Step 5: Run tests, verify GroupScreen tests pass**

Run: `npm test -- src/components/GroupScreen.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 6: TypeScript will flag App.tsx (broken until Task 4); skip to commit anyway**

Run: `npx tsc --noEmit`
Expected: error in `src/App.tsx` because `<GroupScreen>` is still rendered with the old props. This is expected — Task 4 fixes it. Do NOT run `npm test` for everything yet because it will fail.

- [ ] **Step 7: Commit (broken build is OK between two tightly-coupled commits — the next task closes it immediately)**

Actually, to keep the build green at every commit, **defer this commit and bundle it with Task 4**. Do not commit yet — leave the changes staged and continue.

```bash
git add src/components/GroupScreen.tsx src/components/GroupScreen.test.tsx src/data/participants.ts
# do NOT commit yet — App.tsx breaks until Task 4
```

---

## Task 4: Wire `App.tsx` — onboarding, change identity, reset clears identity

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the imports block (top of file)**

Replace lines 1-24 of `src/App.tsx` with:

```tsx
import { useCallback, useMemo, useRef, useState } from 'react'
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
```

- [ ] **Step 2: Add `userId` + `changingIdentity` state**

Inside `App()` just after the existing `useLocalStorage<VoteEntry[]>` line (around line 47), add:

```tsx
const [userId, setUserId] = useLocalStorage<string | null>(
  STORAGE_KEYS.userId,
  null,
)
const [changingIdentity, setChangingIdentity] = useState(false)
```

Also add (near the other `useState` calls, around line 74):

```tsx
const needsOnboarding = userId === null
const showPicker = needsOnboarding || changingIdentity
```

- [ ] **Step 3: Add the pick + change handlers**

After the `handleRandomFill` callback (around line 164), add:

```tsx
const handlePickIdentity = useCallback(
  (id: string) => {
    const wasOnboarding = userId === null
    if (wasOnboarding) {
      // Existing users carry over a history attributed to an implicit
      // "yves". Wipe it on the first identity choice so the user starts
      // fresh under their chosen name.
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
```

- [ ] **Step 4: Update `handleReset` to also clear identity**

Replace the existing `handleReset` (around line 123):

```tsx
const handleReset = useCallback(() => {
  setHistory([])
  setUserId(null)
  setDone(false)
  setReviewMode(false)
  setChangingIdentity(false)
  setToast({ id: Date.now(), text: 'Votes réinitialisés', emoji: '↺' })
}, [setHistory, setUserId])
```

- [ ] **Step 5: Update the GroupScreen JSX**

Replace the `<GroupScreen ... />` block (around lines 322-326):

```tsx
<GroupScreen
  currentUserId={userId}
  currentUserProgress={history.length}
  total={ACTIVITIES.length}
  onChangeIdentity={() => setChangingIdentity(true)}
/>
```

- [ ] **Step 6: Update the reset ConfirmModal message**

Replace the `confirmingReset` modal (around lines 349-362):

```tsx
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
```

- [ ] **Step 7: Render the IdentityPicker at App level**

At the end of the JSX, just before the closing `</div>` of the
`relative h-full w-full overflow-hidden font-sans` container (after the
`confirmingRandomFill` ConfirmModal block), add:

```tsx
{showPicker && (
  <IdentityPicker
    currentUserId={userId}
    onPick={handlePickIdentity}
    onClose={
      changingIdentity ? () => setChangingIdentity(false) : undefined
    }
  />
)}
```

- [ ] **Step 8: Type-check the project**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Run the full unit test suite**

Run: `npm test`
Expected: PASS — 134+ tests including the new IdentityPicker + updated GroupScreen tests.

- [ ] **Step 10: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 11: Stage all four files and commit together**

```bash
git add src/components/GroupScreen.tsx src/components/GroupScreen.test.tsx src/data/participants.ts src/App.tsx
git commit -m "feat: identity picker with onboarding + change flow

- IdentityPicker rendered at App level
- yallah.userId.v1 gates onboarding (blocking picker when null)
- GroupScreen accepts currentUserId prop + 'Changer d'identité' button
- Reset clears identity → onboarding reappears
- First pick wipes legacy history (existing users start fresh)"
```

---

## Task 5: Pre-seed `userId` in existing e2e specs

The four existing e2e specs assume the deck loads immediately. With
onboarding active, every test would block on the picker. Pre-seed
`yallah.userId.v1=yves` so the picker stays hidden.

**Files:**
- Modify: `e2e/swipe.spec.ts`
- Modify: `e2e/detail.spec.ts`
- Modify: `e2e/super-like.spec.ts`
- Modify: `e2e/persistence.spec.ts`

- [ ] **Step 1: Patch `e2e/swipe.spec.ts`**

Replace the `beforeEach` block (lines 3-8):

```ts
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('yves'))
  })
  await page.goto('/')
})
```

- [ ] **Step 2: Patch `e2e/detail.spec.ts`**

Replace the `beforeEach` block (lines 3-8) with:

```ts
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('yves'))
  })
  await page.goto('/')
})
```

- [ ] **Step 3: Patch `e2e/super-like.spec.ts`**

Replace the `beforeEach` block (lines 3-8) with:

```ts
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('yves'))
  })
  await page.goto('/')
})
```

- [ ] **Step 4: Patch `e2e/persistence.spec.ts`**

The spec uses `page.evaluate(() => window.localStorage.clear())` then
reloads. Replace lines 6-9:

```ts
await page.goto('/')
await page.evaluate(() => {
  window.localStorage.clear()
  window.localStorage.setItem('yallah.userId.v1', JSON.stringify('yves'))
})
await page.reload({ waitUntil: 'domcontentloaded' })
```

- [ ] **Step 5: Run all e2e tests, verify they still pass**

Run: `npm run test:e2e`
Expected: PASS — 11 tests across 4 specs.

- [ ] **Step 6: Commit**

```bash
git add e2e/swipe.spec.ts e2e/detail.spec.ts e2e/super-like.spec.ts e2e/persistence.spec.ts
git commit -m "test(e2e): pre-seed yallah.userId.v1 to skip onboarding"
```

---

## Task 6: New e2e spec — identity flow

**Files:**
- Create: `e2e/identity.spec.ts`

- [ ] **Step 1: Write the spec**

Create `e2e/identity.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
  await page.goto('/')
})

test('onboarding picker appears on first launch and is blocking', async ({
  page,
}) => {
  await expect(page.getByRole('dialog', { name: 'Choisis ton prénom' })).toBeVisible()
  // Escape and backdrop tap do not dismiss in blocking mode.
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('dialog', { name: 'Choisis ton prénom' }),
  ).toBeVisible()
})

test('picking Chloé closes the picker and shows the deck', async ({ page }) => {
  await page.getByTestId('picker-row-chloe').click()
  await expect(
    page.getByRole('dialog', { name: 'Choisis ton prénom' }),
  ).toHaveCount(0)
  // First activity heading visible.
  await expect(page.locator('h2').first()).toBeVisible()
  // Storage updated.
  const stored = await page.evaluate(() =>
    window.localStorage.getItem('yallah.userId.v1'),
  )
  expect(stored).toBe(JSON.stringify('chloe'))
})

test('on Groupe page, the picked participant carries the "toi" badge', async ({
  page,
}) => {
  await page.getByTestId('picker-row-chloe').click()
  await page.getByRole('button', { name: 'groupe' }).click()
  const chloeRow = page.getByTestId('participant-chloe')
  await expect(chloeRow).toContainText('toi')
  await expect(page.getByTestId('participant-yves')).not.toContainText('toi')
})

test('"Changer d\'identité" reopens the dismissable picker', async ({
  page,
}) => {
  await page.getByTestId('picker-row-chloe').click()
  await page.getByRole('button', { name: 'groupe' }).click()
  await page.getByRole('button', { name: "changer d'identité" }).click()

  const dialog = page.getByRole('dialog', { name: 'Choisis ton prénom' })
  await expect(dialog).toBeVisible()
  // Now there's a close button.
  await expect(page.getByLabel('fermer le sélecteur')).toBeVisible()

  await page.getByTestId('picker-row-ade').click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('participant-ade')).toContainText('toi')
})

test('Réinitialiser wipes the chosen identity and onboarding returns', async ({
  page,
}) => {
  await page.getByTestId('picker-row-chloe').click()
  // Cast a vote so the reset button is enabled.
  await page.getByLabel('like').click()
  await page.waitForTimeout(700)

  await page.getByRole('button', { name: 'résultats' }).click()
  await page.getByRole('button', { name: /réinitialiser les votes/i }).click()
  await page
    .getByRole('button', { name: 'Tout effacer' })
    .click()

  // Picker is back (blocking, no close button).
  await expect(
    page.getByRole('dialog', { name: 'Choisis ton prénom' }),
  ).toBeVisible()
  await expect(page.getByLabel('fermer le sélecteur')).toHaveCount(0)

  const stored = await page.evaluate(() =>
    window.localStorage.getItem('yallah.userId.v1'),
  )
  expect(stored).toBeNull()
})
```

- [ ] **Step 2: Run the new spec**

Run: `npm run test:e2e -- identity.spec.ts`
Expected: PASS — 5 tests.

- [ ] **Step 3: Run the full e2e suite to confirm nothing else regressed**

Run: `npm run test:e2e`
Expected: PASS — 16 tests across 5 specs.

- [ ] **Step 4: Commit**

```bash
git add e2e/identity.spec.ts
git commit -m "test(e2e): identity picker onboarding + change + reset flows"
```

---

## Task 7: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Storage section**

Find the "## Storage" section. Replace its body so it documents both
keys:

```markdown
## Storage

Two keys in `localStorage`:

- `yallah.history.v1` — `VoteEntry[]` = `{ id, verdict, quotaHit? }`. Last-write wins per `id` once review mode has touched it; otherwise raw chronological appends.
- `yallah.userId.v1` — `string | null` — id of the participant the user picked at onboarding (`"chloe"`, `"yves"`, …). When `null`, the app shows the blocking `IdentityPicker` bottom-sheet at launch and wipes any pre-existing history on first pick (migration path for users upgraded from the pre-picker app).

**Legacy migration**: when `App.tsx` loads history, any entry with `verdict: 'neutre'` is rewritten to `'whynot'` (the id was renamed in the source tree). Existing users keep their votes.
```

- [ ] **Step 2: Add a bullet under "Modals & overlays" mentioning the picker**

Find the "## Modals & overlays" section. After the `ConfirmModal`
bullet, append:

```markdown
- **IdentityPicker** — bottom-sheet rendered at the **App level**. Two modes: blocking (no `onClose` prop, opaque backdrop, no close button, used during onboarding when `yallah.userId.v1` is `null`) and dismissable (used by the "Changer d'identité" button on Groupe). Tapping a participant row triggers `onPick(id)`.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document yallah.userId.v1 + IdentityPicker in CLAUDE.md"
```

---

## Wrap-up

- [ ] **Final verification**

Run all three:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
```

Expected: all four green.

- [ ] **Optional manual smoke test**

```bash
npm run dev
```

In a private window (so localStorage is fresh):
1. App opens on the blocking picker.
2. Tap "Chloé" → picker closes, deck appears, toast "Salut Chloé 👋".
3. Tap a "LIKE" verdict → activity advances.
4. Go to Groupe → Chloé carries the "toi" badge, her bar is at 1/201.
5. Tap "Changer d'identité" → picker reopens with close button.
6. Tap "Adé" → "toi" migrates to Adé.
7. Go to Résultats → "Réinitialiser" → confirm → picker reappears
   (blocking, no close button); localStorage is empty.
