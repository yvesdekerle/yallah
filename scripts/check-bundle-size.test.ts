import { describe, it, expect } from 'vitest'
import { evaluateBundle, type Budgets } from './check-bundle-size.ts'

const B: Budgets = { mainKB: 135, lazyKB: 15 }

describe('evaluateBundle', () => {
  it('flags the main entry chunk over budget', () => {
    const v = evaluateBundle([{ name: 'index-abc.js', gzipKB: 140 }], B)
    expect(v).toHaveLength(1)
    expect(v[0]!.kind).toBe('main')
  })

  it('flags a lazy chunk over budget', () => {
    const v = evaluateBundle([{ name: 'FullscreenMap-x.js', gzipKB: 20 }], B)
    expect(v).toHaveLength(1)
    expect(v[0]!.kind).toBe('lazy')
  })

  it('excludes the Leaflet (TileLayer) vendor chunk even when large', () => {
    expect(evaluateBundle([{ name: 'TileLayer-x.js', gzipKB: 90 }], B)).toEqual([])
  })

  it('passes when every chunk is within budget', () => {
    expect(
      evaluateBundle(
        [
          { name: 'index-x.js', gzipKB: 124 },
          { name: 'FullscreenMap-x.js', gzipKB: 1.5 },
        ],
        B,
      ),
    ).toEqual([])
  })

  it('treats a chunk exactly at budget as within budget (≤, not <)', () => {
    expect(
      evaluateBundle(
        [
          { name: 'index-x.js', gzipKB: 135 },
          { name: 'lazy-x.js', gzipKB: 15 },
        ],
        B,
      ),
    ).toEqual([])
  })
})
