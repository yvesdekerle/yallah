import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeckDone } from './DeckDone.tsx'
import type { VoteEntry } from '../types/verdict.ts'

const history: VoteEntry[] = [
  { id: 'a001', verdict: 'oui' },
  { id: 'a002', verdict: 'oui' },
  { id: 'a003', verdict: 'top' },
  { id: 'a004', verdict: 'whynot' },
  { id: 'a005', verdict: 'non' },
  { id: 'a006', verdict: 'non' },
  { id: 'a007', verdict: 'non' },
]

describe('DeckDone', () => {
  it('shows the celebration headline', () => {
    render(<DeckDone history={history} bg="#FFCB45" onReset={() => {}} />)
    expect(screen.getByText("Yallah, t'as tout fait !")).toBeInTheDocument()
  })

  it('reports the counts per verdict', () => {
    render(<DeckDone history={history} bg="#FFCB45" onReset={() => {}} />)
    expect(screen.getByTestId('summary-oui')).toHaveTextContent('2')
    expect(screen.getByTestId('summary-top')).toHaveTextContent('1')
    expect(screen.getByTestId('summary-whynot')).toHaveTextContent('1')
    expect(screen.getByTestId('summary-non')).toHaveTextContent('3')
  })

  it('calls onReset when the restart button is clicked', async () => {
    const user = userEvent.setup()
    const onReset = vi.fn()
    render(<DeckDone history={history} bg="#FFCB45" onReset={onReset} />)
    await user.click(screen.getByText('Recommencer à zéro'))
    expect(onReset).toHaveBeenCalledOnce()
  })
})
