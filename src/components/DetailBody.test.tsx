import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DetailBody } from './DetailBody.tsx'
import type { Activity } from '../types/activity.ts'

const activity: Activity = {
  id: 'a999',
  number: 1,
  title: 'T',
  tags: [],
  category: 'c',
  location: 'l',
  transit: 't',
  description: 'Une belle description',
  price: 'p',
  rating: 5,
  pepite: false,
  secret: false,
}

describe('DetailBody', () => {
  it('renders the description and opens a photo from the carousel', () => {
    const onOpenPhoto = vi.fn()
    render(
      <DetailBody
        activity={activity}
        photos={['/photos/hero.jpg', '/photos/2.jpg']}
        onOpenPhoto={onOpenPhoto}
      />,
    )
    expect(screen.getByText('Une belle description')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('ouvrir la photo 2'))
    expect(onOpenPhoto).toHaveBeenCalledWith(1)
  })

  it('shows the anecdote when present', () => {
    render(
      <DetailBody
        activity={{ ...activity, insolite: 'Un fait surprenant' }}
        photos={[]}
        onOpenPhoto={() => {}}
      />,
    )
    expect(screen.getByText('Un fait surprenant')).toBeInTheDocument()
  })
})
