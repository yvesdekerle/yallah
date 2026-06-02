import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddActivityScreen } from './AddActivityScreen.tsx'
import type { StoredUserActivity } from '../types/userActivity.ts'
import type { Activity } from '../types/activity.ts'

const SUBMIT = 'ajouter l’activité'

function record(over: Partial<StoredUserActivity> = {}): StoredUserActivity {
  return {
    id: 'u-1',
    number: 900,
    title: 'Mon spot secret',
    tags: [],
    category: 'Autre',
    location: '',
    transit: '',
    description: '',
    price: '',
    rating: 0,
    pepite: false,
    secret: false,
    userAdded: true,
    photoRefs: [],
    createdAt: 1,
    ...over,
  }
}

// Minimal curated set so the category/tag palettes have something to offer.
const CURATED: Activity[] = [
  {
    id: 'a001',
    number: 1,
    title: 'Plage',
    tags: ['🌊'],
    category: 'Plage',
    location: '',
    transit: '',
    description: '',
    price: '',
    rating: 0,
    pepite: false,
    secret: false,
  },
]

// `active={false}` keeps the heavy Leaflet picker unmounted in jsdom.
function renderScreen(props: Partial<Parameters<typeof AddActivityScreen>[0]> = {}) {
  const onAdd = vi.fn().mockResolvedValue(undefined)
  const onUpdate = vi.fn().mockResolvedValue(undefined)
  const onRequestDelete = vi.fn()
  const onPreview = vi.fn()
  const result = render(
    <AddActivityScreen
      curatedActivities={CURATED}
      userActivities={[]}
      stored={[]}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onRequestDelete={onRequestDelete}
      onPreview={onPreview}
      active={false}
      {...props}
    />,
  )
  return { onAdd, onUpdate, onRequestDelete, onPreview, ...result }
}

describe('AddActivityScreen', () => {
  it('disables submit until a title is entered', async () => {
    const user = userEvent.setup()
    renderScreen()
    const submit = screen.getByRole('button', { name: SUBMIT })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText('Titre'), 'Rando du Morne')
    expect(submit).toBeEnabled()
  })

  it('adds a pasted URL photo and submits the activity', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderScreen()

    await user.type(screen.getByLabelText('Titre'), 'Rando du Morne')
    await user.type(
      screen.getByLabelText('coller une url d’image'),
      'https://example.com/p.jpg{Enter}',
    )
    expect(screen.getByLabelText('photo principale')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: SUBMIT }))

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1))
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Rando du Morne',
        photos: [{ kind: 'ref', ref: { kind: 'url', url: 'https://example.com/p.jpg' } }],
      }),
    )
  })

  it('lists added activities and requests deletion', async () => {
    const user = userEvent.setup()
    const { onRequestDelete } = renderScreen({ stored: [record()] })
    expect(screen.getByText('Mes activités ajoutées')).toBeInTheDocument()
    await user.click(screen.getByLabelText('supprimer Mon spot secret'))
    expect(onRequestDelete).toHaveBeenCalledWith('u-1')
  })

  it('previews a saved activity (runtime, with photos) when its row is tapped', async () => {
    const user = userEvent.setup()
    const stored = [record({ title: 'Mon spot' })]
    const runtime = { ...stored[0], photoUrls: [] } as unknown as Activity
    const { onPreview } = renderScreen({ stored, userActivities: [runtime] })
    await user.click(screen.getByLabelText('voir Mon spot'))
    expect(onPreview).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u-1', photoUrls: [] }),
    )
  })

  it('loads a record into the form when editing', async () => {
    const user = userEvent.setup()
    renderScreen({ stored: [record({ title: 'À éditer' })] })
    await user.click(screen.getByLabelText('modifier À éditer'))
    expect(screen.getByLabelText('Titre')).toHaveValue('À éditer')
    expect(
      screen.getByRole('button', { name: 'enregistrer les modifications' }),
    ).toBeInTheDocument()
  })

  it('rejects an unsafe pasted URL: no photo added and an error is shown', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(
      screen.getByLabelText('coller une url d’image'),
      "https://evil.com/a.jpg');alert(1){Enter}",
    )
    expect(screen.queryByLabelText('photo principale')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('rejects a data: URL (scheme not whitelisted)', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.type(
      screen.getByLabelText('coller une url d’image'),
      'data:image/png;base64,AAAA{Enter}',
    )
    expect(screen.queryByLabelText('photo principale')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('revokes a picked-file preview URL when its photo is removed', async () => {
    const user = userEvent.setup()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-pick')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    renderScreen()
    await user.upload(
      screen.getByLabelText('ajouter des photos depuis la galerie'),
      new File(['x'], 'p.jpg', { type: 'image/jpeg' }),
    )
    expect(screen.getByLabelText('photo principale')).toBeInTheDocument()
    await user.click(screen.getByLabelText('supprimer la photo 1'))
    expect(revoke).toHaveBeenCalledWith('blob:mock-pick')
    expect(screen.queryByLabelText('photo principale')).not.toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('revokes created preview URLs on unmount', async () => {
    const user = userEvent.setup()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-unmount')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const { unmount } = renderScreen()
    await user.upload(
      screen.getByLabelText('ajouter des photos depuis la galerie'),
      new File(['x'], 'p.jpg', { type: 'image/jpeg' }),
    )
    unmount()
    expect(revoke).toHaveBeenCalledWith('blob:mock-unmount')
    vi.restoreAllMocks()
  })

  it('clears the form after a successful add', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderScreen()
    await user.type(screen.getByLabelText('Titre'), 'Spot test')
    await user.click(screen.getByRole('button', { name: SUBMIT }))
    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1))
    expect(screen.getByLabelText('Titre')).toHaveValue('')
    expect(screen.getByRole('button', { name: SUBMIT })).toBeDisabled()
  })

  it('submits a custom "Autre…" category', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderScreen()
    await user.type(screen.getByLabelText('Titre'), 'Spot')
    await user.selectOptions(screen.getByLabelText('catégorie'), '__other__')
    await user.type(screen.getByLabelText('autre catégorie'), 'Spéléo')
    await user.click(screen.getByRole('button', { name: SUBMIT }))
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Spéléo' }),
      ),
    )
  })

  it('falls back to "Autre" when the custom category is left empty', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderScreen()
    await user.type(screen.getByLabelText('Titre'), 'Spot')
    await user.selectOptions(screen.getByLabelText('catégorie'), '__other__')
    await user.click(screen.getByRole('button', { name: SUBMIT }))
    await waitFor(() =>
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Autre' }),
      ),
    )
  })

  it('loads every field when editing (category/difficulty/rating/photo)', async () => {
    const user = userEvent.setup()
    renderScreen({
      stored: [
        record({
          title: 'À éditer',
          category: 'Catégorie Perso',
          rating: 4,
          difficulty: { dot: '🟠', label: 'Difficile' },
          photoRefs: [{ kind: 'url', url: 'https://x/p.jpg' }],
        }),
      ],
    })
    await user.click(screen.getByLabelText('modifier À éditer'))
    expect(screen.getByLabelText('Titre')).toHaveValue('À éditer')
    // Non-preset category → the "Autre" free-text input carries it.
    expect(screen.getByLabelText('autre catégorie')).toHaveValue('Catégorie Perso')
    expect(screen.getByLabelText('note 4 sur 5')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Difficile' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText('photo principale')).toBeInTheDocument()
  })

  it('sets the rating to the tapped star and never toggles off on re-tap', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByLabelText('note 5 sur 5'))
    for (const n of [1, 2, 3, 4, 5]) {
      expect(screen.getByLabelText(`note ${n} sur 5`)).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    }
    // Re-tapping the same star must keep the rating, not clear it.
    await user.click(screen.getByLabelText('note 5 sur 5'))
    expect(screen.getByLabelText('note 5 sur 5')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('shows a numeric N/5 readout reflecting the rating', async () => {
    const user = userEvent.setup()
    renderScreen()
    expect(screen.queryByText('3/5')).not.toBeInTheDocument()
    await user.click(screen.getByLabelText('note 3 sur 5'))
    expect(screen.getByText('3/5')).toBeInTheDocument()
  })

  it('clears the rating only via the dedicated Effacer button', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByLabelText('note 3 sur 5'))
    expect(screen.getByLabelText('note 3 sur 5')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByLabelText('effacer la note'))
    expect(screen.getByLabelText('note 3 sur 5')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
