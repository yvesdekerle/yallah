import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('getReviewSummary', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock('../data/reviewSummaries.json')
  })

  it('returns the curated summary when present', async () => {
    vi.doMock('../data/reviewSummaries.json', () => ({
      default: { a001: 'Eau claire, foule le matin.' },
    }))
    const { getReviewSummary } = await import('./reviewSummary.ts')
    expect(getReviewSummary('a001')).toBe('Eau claire, foule le matin.')
  })

  it('returns null when the activity is missing', async () => {
    vi.doMock('../data/reviewSummaries.json', () => ({ default: {} }))
    const { getReviewSummary } = await import('./reviewSummary.ts')
    expect(getReviewSummary('a999')).toBeNull()
  })

  it('treats explicit null and empty string as no summary', async () => {
    vi.doMock('../data/reviewSummaries.json', () => ({
      default: { a001: null, a002: '' },
    }))
    const { getReviewSummary } = await import('./reviewSummary.ts')
    expect(getReviewSummary('a001')).toBeNull()
    expect(getReviewSummary('a002')).toBeNull()
  })
})
