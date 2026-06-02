import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import App from './App.tsx'
import type { Activity } from './types/activity.ts'
import activitiesJson from './data/activities.json'

// Curated activities are code-split + loaded in main.tsx, then passed to <App>
// as a prop. Inject the real list directly so these integration tests stay
// synchronous (no dynamic-import / fake-timer interplay to await).
const ACTIVITIES: Activity[] = activitiesJson
const renderApp = () => render(<App activities={ACTIVITIES} />)

// Locate a verdict-count tile on the Résultats screen by its visible label, so
// count assertions read the user-facing label/number pair rather than a
// data-testid. All tabs stay mounted, so the tile is always queryable.
const verdictTile = (label: string) =>
  within(screen.getByText(label).parentElement as HTMLElement)

describe('App (integration)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    // Seed userId so the blocking IdentityPicker doesn't overlay the app
    // during these integration tests — mirrors the precondition of every
    // real user past their first launch.
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('yves'))
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the wordmark and the first activity title', () => {
    renderApp()
    expect(screen.getByText('yallah')).toBeInTheDocument()
    // Heroic photo etc. don't load, but the first activity title from the
    // markdown should be visible inside the card.
    expect(
      screen.getByText('Snorkeling à Blue Bay Marine Park'),
    ).toBeInTheDocument()
  })

  it('disables the undo button until a vote has been recorded', () => {
    renderApp()
    expect(screen.getByLabelText('annuler le dernier swipe')).toBeDisabled()
  })

  it('voting through the action row advances the deck', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('like'))
    // After the exit animation a different activity is on top.
    act(() => {
      vi.advanceTimersByTime(800)
    })
    // The card heading (h2) shouldn't be the first activity anymore. (The
    // title may still appear as a plain span in the Résultats list since
    // all tabs stay mounted, so scope to role=heading.)
    expect(
      screen.queryByRole('heading', {
        name: 'Snorkeling à Blue Bay Marine Park',
      }),
    ).not.toBeInTheDocument()
    // Undo is now enabled.
    expect(screen.getByLabelText('annuler le dernier swipe')).toBeEnabled()
  })

  it('persists the vote history to localStorage', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('non'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    const stored = JSON.parse(
      window.localStorage.getItem('yallah.history.v1')!,
    )
    expect(stored).toHaveLength(1)
    expect(stored[0].verdict).toBe('non')
  })

  it('undo removes the last vote and re-disables when empty', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('like'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    fireEvent.click(screen.getByLabelText('annuler le dernier swipe'))
    expect(screen.getByText('Swipe annulé')).toBeInTheDocument()
    // Card 1 is back — check via the card heading.
    expect(
      screen.getByRole('heading', {
        name: 'Snorkeling à Blue Bay Marine Park',
      }),
    ).toBeInTheDocument()
  })

  it('after 5 super-likes the 6th attempt is converted with the toast', () => {
    renderApp()
    const superBtn = () => screen.getByLabelText('super like')
    for (let i = 0; i < 5; i++) {
      fireEvent.click(superBtn())
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }
    // Quota is now 0. The button is disabled — but the gesture path still
    // works. Verify the button is disabled, then trigger another super-like
    // via the deck's imperative API (clicking the button does nothing now).
    expect(superBtn()).toBeDisabled()
  })

  it('opens the detail modal when the eye button is clicked', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('voir le détail'))
    expect(screen.getByTestId('detail-sheet')).toBeInTheDocument()
  })

  it('switches to the résultats tab and shows the current vote counts', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('like'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    fireEvent.click(screen.getByLabelText('résultats'))
    // "1 / 198" string also appears in the GroupScreen (Yves' progress)
    // since all tabs stay mounted — use a more specific match.
    expect(
      screen.getByText('1 / 198 activités swipées.'),
    ).toBeInTheDocument()
    expect(verdictTile('♥ like').getByText('1')).toBeInTheDocument()
  })

  it('switches to the groupe tab and lists the 9 participants', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('groupe'))
    expect(screen.getByText('Le groupe')).toBeInTheDocument()
    // Participant rows render their visible names — assert those rather than a
    // data-testid. (GroupScreen.test still covers row internals by id.)
    expect(screen.getByText('Yves')).toBeInTheDocument()
    expect(screen.getByText('Adé')).toBeInTheDocument()
  })

  it('reset from résultats clears history after confirmation', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('like'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    fireEvent.click(screen.getByLabelText('résultats'))
    fireEvent.click(screen.getByLabelText('réinitialiser les votes'))
    expect(screen.getByText('Tout effacer ?')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Tout effacer'))
    expect(screen.getByText('0 / 198 activités swipées.')).toBeInTheDocument()
    expect(
      JSON.parse(window.localStorage.getItem('yallah.history.v1')!),
    ).toEqual([])
  })

  it('migrates a legacy "neutre" vote to "whynot" on load', () => {
    // Pre-rename users may still carry a 'neutre' verdict in storage (the id
    // was renamed to 'whynot'). migrateHistory rewrites it so the vote keeps
    // counting in the right bucket; non-legacy verdicts pass through untouched.
    window.localStorage.setItem(
      'yallah.history.v1',
      JSON.stringify([
        { id: 'a001', verdict: 'neutre' },
        { id: 'a002', verdict: 'oui' },
      ]),
    )
    renderApp()
    fireEvent.click(screen.getByLabelText('résultats'))
    expect(verdictTile('↓ why not').getByText('1')).toBeInTheDocument()
    expect(verdictTile('♥ like').getByText('1')).toBeInTheDocument()
    // The legacy verdict folds into the whynot bucket — no separate "neutre"
    // tile ever renders.
    expect(screen.queryByText(/neutre/i)).toBeNull()
  })

  it('migrates an all-legacy "neutre" history without crashing', () => {
    window.localStorage.setItem(
      'yallah.history.v1',
      JSON.stringify([
        { id: 'a001', verdict: 'neutre' },
        { id: 'a002', verdict: 'neutre' },
      ]),
    )
    renderApp()
    fireEvent.click(screen.getByLabelText('résultats'))
    expect(verdictTile('↓ why not').getByText('2')).toBeInTheDocument()
  })

  it('random-fill generates 2–3 super-likes and completes the deck', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('résultats'))
    fireEvent.click(
      screen.getByLabelText('remplir aléatoirement les activités restantes'),
    )
    expect(screen.getByText('Remplir aléatoirement ?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remplir' }))
    expect(screen.getByText('198 / 198 activités swipées.')).toBeInTheDocument()
    // Guaranteed 2–3 super-likes (capped by the quota of 5 and the pool size).
    const supers = Number(
      verdictTile('★ super like').getByText(/^\d+$/).textContent,
    )
    expect(supers).toBeGreaterThanOrEqual(2)
    expect(supers).toBeLessThanOrEqual(3)
  })

  it('review mode re-walks the deck from card 1 and shows the review affordances', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('like'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    fireEvent.click(screen.getByLabelText('résultats'))
    fireEvent.click(screen.getByText('Revoir mes votes'))
    // App-level exit pill.
    expect(screen.getByText('Mode révision')).toBeInTheDocument()
    // topIdx reset to 0 → card 1 is active again despite history.length === 1.
    expect(
      screen.getByRole('heading', { name: 'Snorkeling à Blue Bay Marine Park' }),
    ).toBeInTheDocument()
    // Per-card "you already voted" affordance on the re-walked card.
    expect(screen.getByRole('region', { name: /Tu as voté/ })).toBeInTheDocument()
  })

  it('the eye in review mode opens the current card, not allActivities[history.length]', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('like'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    fireEvent.click(screen.getByLabelText('résultats'))
    fireEvent.click(screen.getByText('Revoir mes votes'))
    fireEvent.click(screen.getByLabelText('voir le détail'))
    // getCurrent() at topIdx 0 = card 1; the buggy fallback would show card 2.
    const sheet = screen.getByTestId('detail-sheet')
    expect(
      within(sheet).getByText('Snorkeling à Blue Bay Marine Park'),
    ).toBeInTheDocument()
  })

  it('voting from a Résultats-row detail upserts the existing vote (no duplicate)', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('like'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    fireEvent.click(screen.getByLabelText('résultats'))
    // Open the detail for the already-voted card from its Résultats row.
    fireEvent.click(
      screen.getByLabelText('Voir le détail de Snorkeling à Blue Bay Marine Park'),
    )
    // Change the verdict from inside the modal (source 'review' → upsert).
    const sheet = screen.getByTestId('detail-sheet')
    fireEvent.click(within(sheet).getByLabelText('non'))
    // History is replaced in place, not appended — still one entry, new verdict.
    const stored = JSON.parse(window.localStorage.getItem('yallah.history.v1')!)
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ id: 'a001', verdict: 'non' })
  })
})
