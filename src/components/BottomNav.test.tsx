import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomNav } from './BottomNav.tsx'

describe('BottomNav', () => {
  const labels = ['vote', 'résultats', 'groupe', 'ajouter']

  it('notifies the parent of the tapped tab index', () => {
    const onChange = vi.fn()
    render(<BottomNav active={0} onChange={onChange} />)
    labels.forEach((label, i) => {
      fireEvent.click(screen.getByRole('button', { name: label }))
      expect(onChange).toHaveBeenNthCalledWith(i + 1, i)
    })
  })

  it('marks only the active tab as pressed', () => {
    render(<BottomNav active={2} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'groupe' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'vote' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
