import { describe, it, expect } from 'vitest'
import {
  evaluateBundle,
  auditLeaflet,
  auditFirebase,
  type Budgets,
} from './check-bundle-size.ts'

const B: Budgets = { mainKB: 135, lazyKB: 15, dataKB: 40 }

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

  it('excludes the Firebase vendor chunk even when large', () => {
    expect(evaluateBundle([{ name: 'firebase-x.js', gzipKB: 120 }], B)).toEqual([])
  })

  it('judges the activities data chunk against the larger data budget', () => {
    // Within the data budget (would bust the 15 kB lazy budget) → no violation.
    expect(evaluateBundle([{ name: 'activities-x.js', gzipKB: 30 }], B)).toEqual([])
    // Over the data budget → flagged as 'data', not 'lazy'.
    const v = evaluateBundle([{ name: 'activities-x.js', gzipKB: 50 }], B)
    expect(v).toHaveLength(1)
    expect(v[0]!.kind).toBe('data')
    expect(v[0]!.budgetKB).toBe(40)
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

describe('auditLeaflet', () => {
  // Minified Leaflet emits its DOM class literals verbatim; one is enough here.
  const VENDOR = { name: 'TileLayer-x.js', code: 'a.className="leaflet-pane leaflet-map-pane"' }

  it('reports no leak when Leaflet lives only in its vendor chunk', () => {
    const r = auditLeaflet([{ name: 'index-x.js', code: 'console.log(1)' }, VENDOR])
    expect(r.leak).toBeNull()
    expect(r.vendorFound).toBe(true)
  })

  it('flags a leak when the eager entry chunk carries Leaflet code', () => {
    const r = auditLeaflet([
      { name: 'index-x.js', code: 'el.className="leaflet-container"' },
      VENDOR,
    ])
    expect(r.leak).toBe('index-x.js')
    expect(r.vendorFound).toBe(true)
  })

  it('reports vendorFound=false when no chunk carries the fingerprint (stale regex / maps removed)', () => {
    const r = auditLeaflet([{ name: 'index-x.js', code: 'console.log(1)' }])
    expect(r.vendorFound).toBe(false)
    expect(r.leak).toBeNull()
  })
})

describe('auditFirebase', () => {
  // Firestore/Auth bake their API hosts into the bundle as string literals.
  const VENDOR = {
    name: 'firebase-x.js',
    code: 'const H="firestore.googleapis.com"',
  }

  it('reports no leak when Firebase lives only in its vendor chunk', () => {
    const r = auditFirebase([
      { name: 'index-x.js', code: 'console.log(1)' },
      VENDOR,
    ])
    expect(r.leak).toBeNull()
    expect(r.vendorFound).toBe(true)
  })

  it('flags a leak when the eager entry chunk carries Firebase code', () => {
    const r = auditFirebase([
      { name: 'index-x.js', code: 'fetch("https://identitytoolkit.googleapis.com/v1")' },
      VENDOR,
    ])
    expect(r.leak).toBe('index-x.js')
    expect(r.vendorFound).toBe(true)
  })

  it('reports vendorFound=false when no chunk carries the fingerprint', () => {
    const r = auditFirebase([{ name: 'index-x.js', code: 'console.log(1)' }])
    expect(r.vendorFound).toBe(false)
    expect(r.leak).toBeNull()
  })
})
