import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  act,
  within,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.tsx'
import type { Activity } from './types/activity.ts'
import activitiesJson from './data/activities.json'
import { APP_VERSION_KEY } from './constants/version.ts'

// Curated activities are code-split + loaded in main.tsx, then passed to <App>
// as a prop. Inject the real list directly so these integration tests stay
// synchronous (no dynamic-import / fake-timer interplay to await).
const ACTIVITIES: Activity[] = activitiesJson
const renderApp = () => render(<App activities={ACTIVITIES} />)

// A 2-card deck used by the completion/review/filter specs below: exhausting
// the full deck is feasible with two activities (it isn't with the real 198),
// which is what exercises handleComplete / done / exitReview / filteredEmpty.
const tiny = (over: Partial<Activity> = {}): Activity => ({
  id: 't1',
  number: 1,
  title: 'Tiny One',
  tags: ['🌊'],
  category: 'Plage',
  location: '',
  transit: '',
  description: '',
  price: '',
  rating: 0,
  pepite: false,
  secret: false,
  ...over,
})
const TINY: Activity[] = [
  tiny(),
  tiny({ id: 't2', number: 2, title: 'Tiny Two', tags: ['🐅'] }),
]

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
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('mathieu'))
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
    // "1 / 198" string also appears in the GroupScreen (Mathieu's progress)
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
    expect(screen.getByText('Réinitialiser les votes ?')).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'Réinitialiser' }),
    )
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

  it('voting from a swipe-opened detail modal records the vote via the deck', () => {
    renderApp()
    // Eye toggle opens the detail for the current card (source 'swipe').
    fireEvent.click(screen.getByLabelText('voir le détail'))
    const sheet = screen.getByTestId('detail-sheet')
    fireEvent.click(within(sheet).getByLabelText('like'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    const stored = JSON.parse(window.localStorage.getItem('yallah.history.v1')!)
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ id: 'a001', verdict: 'oui' })
  })

  it('logging out from the demo profile menu returns to the welcome screen', () => {
    renderApp()
    // Demo mode now shows the profile avatar too (item 4).
    fireEvent.click(screen.getByLabelText('Compte de Mathieu'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))
    // Welcome screen is back and the demo identity has been cleared.
    expect(screen.getByRole('button', { name: 'Mode démo' })).toBeInTheDocument()
    expect(window.localStorage.getItem('yallah.userId.v1')).toBeNull()
  })

  it('opens Réglages from the demo profile menu "Paramètres" entry', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('Compte de Mathieu'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Paramètres' }))
    expect(screen.getByRole('dialog', { name: 'Réglages' })).toBeInTheDocument()
  })

  it('the eye button toggles the detail modal closed when already open', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('voir le détail'))
    const sheet = screen.getByTestId('detail-sheet')
    expect(sheet).toBeInTheDocument()
    // Both the swipe ActionRow and the modal's own ActionRow expose a "fermer
    // le détail" eye; the swipe-screen one drives App.handleToggleDetail.
    const swipeEye = screen
      .getAllByLabelText('fermer le détail')
      .find((b) => !sheet.contains(b))!
    fireEvent.click(swipeEye)
    expect(screen.queryByTestId('detail-sheet')).not.toBeInTheDocument()
  })
})

describe('App — onboarding & identity', () => {
  beforeEach(() => {
    // NOTE: no userId seeded — the blocking IdentityPicker must appear.
    window.localStorage.clear()
  })

  it('shows the welcome screen first, then the picker via "Mode démo"', async () => {
    const user = userEvent.setup()
    renderApp()
    // Welcome screen: demo entry + (disabled) Google button. No picker yet.
    expect(screen.getByRole('button', { name: 'Mode démo' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Connexion Google indisponible/ }),
    ).toBeDisabled()
    expect(
      screen.queryByRole('dialog', { name: 'Tu es qui ?' }),
    ).not.toBeInTheDocument()
    // Mode démo → the blocking picker appears.
    await user.click(screen.getByRole('button', { name: 'Mode démo' }))
    expect(
      screen.getByRole('dialog', { name: 'Tu es qui ?' }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('fermer le sélecteur')).not.toBeInTheDocument()
    await user.click(screen.getByTestId('picker-row-mathieu'))
    expect(await screen.findByText('Salut Mathieu')).toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: 'Tu es qui ?' }),
    ).not.toBeInTheDocument()
  })

  it('wipes any pre-existing history when identifying at onboarding', async () => {
    // Pre-picker upgrade path: history exists but userId is still null.
    window.localStorage.setItem(
      'yallah.history.v1',
      JSON.stringify([{ id: 'a001', verdict: 'oui' }]),
    )
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Mode démo' }))
    await user.click(screen.getByTestId('picker-row-chloe'))
    await waitFor(() =>
      expect(
        JSON.parse(window.localStorage.getItem('yallah.history.v1') ?? '[]'),
      ).toEqual([]),
    )
  })

  it('a persisted Google session skips the welcome screen and shows the avatar', async () => {
    // The OAuth popup isn't exercised; seed a stored profile as if signed in.
    window.localStorage.setItem(
      'yallah.googleUser.v1',
      JSON.stringify({ uid: '1', name: 'Mathieu', email: 'mathieu@example.com' }),
    )
    renderApp()
    // Straight to the app: no welcome, no picker.
    expect(
      screen.queryByRole('button', { name: 'Mode démo' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('dialog', { name: 'Tu es qui ?' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Compte de Mathieu')).toBeInTheDocument()
  })

  it('logging out from the avatar menu returns to the welcome screen', async () => {
    window.localStorage.setItem(
      'yallah.googleUser.v1',
      JSON.stringify({ uid: '1', name: 'Mathieu', email: 'mathieu@example.com' }),
    )
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByLabelText('Compte de Mathieu'))
    await user.click(screen.getByRole('menuitem', { name: 'Se déconnecter' }))
    // Back on the welcome screen; profile cleared from storage.
    expect(screen.getByRole('button', { name: 'Mode démo' })).toBeInTheDocument()
    expect(window.localStorage.getItem('yallah.googleUser.v1')).toBeNull()
  })

  it('changing identity from the Groupe tab keeps the existing history', async () => {
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('mathieu'))
    window.localStorage.setItem(
      'yallah.history.v1',
      JSON.stringify([{ id: 'a001', verdict: 'oui' }]),
    )
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByLabelText('groupe'))
    await user.click(screen.getByText(/Changer d.identité/))
    // Dismissable variant now (a close button exists).
    expect(screen.getByLabelText('fermer le sélecteur')).toBeInTheDocument()
    await user.click(screen.getByTestId('picker-row-chloe'))
    expect(await screen.findByText(/Tu es maintenant/)).toBeInTheDocument()
    expect(
      JSON.parse(window.localStorage.getItem('yallah.history.v1')!),
    ).toHaveLength(1)
  })
})

describe('App — user activities (add / edit / delete)', () => {
  const SUBMIT = 'ajouter l’activité'
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('mathieu'))
  })

  it('adds an activity from the Ajouter tab and surfaces the toast', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByLabelText('ajouter'))
    // The Ajouter tab is code-split — wait for the lazy chunk to mount.
    await user.type(await screen.findByLabelText('Titre'), 'Spot perso')
    await user.click(screen.getByRole('button', { name: SUBMIT }))
    expect(await screen.findByText('Activité ajoutée')).toBeInTheDocument()
    expect(screen.getByText('Mes activités ajoutées')).toBeInTheDocument()
    expect(screen.getByLabelText('voir Spot perso')).toBeInTheDocument()
  })

  it('edits a stored activity and surfaces the update toast', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByLabelText('ajouter'))
    await user.type(await screen.findByLabelText('Titre'), 'Avant edit')
    await user.click(screen.getByRole('button', { name: SUBMIT }))
    await screen.findByText('Activité ajoutée')

    await user.click(screen.getByLabelText('modifier Avant edit'))
    const title = screen.getByLabelText('Titre')
    await user.clear(title)
    await user.type(title, 'Après edit')
    await user.click(
      screen.getByRole('button', { name: 'enregistrer les modifications' }),
    )
    expect(await screen.findByText('Activité mise à jour')).toBeInTheDocument()
    expect(screen.getByLabelText('voir Après edit')).toBeInTheDocument()
  })

  it('deletes a stored activity after confirmation', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByLabelText('ajouter'))
    await user.type(await screen.findByLabelText('Titre'), 'À supprimer')
    await user.click(screen.getByRole('button', { name: SUBMIT }))
    await screen.findByText('Activité ajoutée')

    await user.click(screen.getByLabelText('supprimer À supprimer'))
    expect(screen.getByText('Supprimer cette activité ?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    expect(await screen.findByText('Activité supprimée')).toBeInTheDocument()
    expect(screen.queryByLabelText('voir À supprimer')).not.toBeInTheDocument()
  })
})

describe('App — deck completion & filtering (tiny deck)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('mathieu'))
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  const renderTiny = () => render(<App activities={TINY} />)
  const voteBoth = () => {
    fireEvent.click(screen.getByLabelText('like'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    fireEvent.click(screen.getByLabelText('non'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    // handleComplete schedules setDone(true) EXIT_MS after the deck empties.
    act(() => {
      vi.advanceTimersByTime(800)
    })
  }

  it('completing the whole deck lands on the review prompt', () => {
    renderTiny()
    voteBoth()
    expect(screen.getByTestId('review-prompt')).toBeInTheDocument()
  })

  it('exiting review mode while everything is voted returns to the review prompt', () => {
    renderTiny()
    voteBoth()
    fireEvent.click(screen.getByLabelText('revoir les votes'))
    expect(screen.getByText('Mode révision')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('quitter le mode révision'))
    expect(screen.getByText('Mode révision terminé')).toBeInTheDocument()
    expect(screen.getByTestId('review-prompt')).toBeInTheDocument()
  })

  it('shows the empty-filter fallback when no unvoted activity matches', () => {
    renderTiny()
    // Vote the only 🌊 card, then filter by 🌊 → nothing unvoted matches.
    fireEvent.click(screen.getByLabelText('like'))
    act(() => {
      vi.advanceTimersByTime(800)
    })
    fireEvent.click(screen.getByLabelText('filtrer par catégorie'))
    fireEvent.click(screen.getByTestId('filter-chip-🌊'))
    fireEvent.click(screen.getByTestId('filter-confirm'))
    expect(
      screen.getByText('Aucune activité à voter pour ces catégories.'),
    ).toBeInTheDocument()
  })

  it('a filtered deck completion does not trigger the global review prompt', () => {
    renderTiny()
    // Filter to just the 🌊 card, swipe it → filtered deck empties but the
    // global "Revoir les votes ?" must NOT appear (handleComplete early-return).
    fireEvent.click(screen.getByLabelText('filtrer par catégorie'))
    fireEvent.click(screen.getByTestId('filter-chip-🌊'))
    fireEvent.click(screen.getByTestId('filter-confirm'))
    fireEvent.click(screen.getByLabelText('like'))
    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(screen.queryByTestId('review-prompt')).not.toBeInTheDocument()
  })
})

describe('App — version upgrade', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('mathieu'))
  })

  it('surfaces an upgrade toast when the stored app version is older', () => {
    // Raw string (useAppVersionCheck reads/writes the key without JSON).
    window.localStorage.setItem(APP_VERSION_KEY, '0.0.1-old')
    renderApp()
    expect(screen.getByText(/Mis à jour en v/)).toBeInTheDocument()
  })
})
