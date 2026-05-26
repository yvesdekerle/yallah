import { describe, it, expect } from 'vitest'
import {
  clamp,
  dragVerdict,
  exitOffset,
  dragRotation,
  dragIntensity,
} from './swipe.ts'

describe('clamp', () => {
  it('returns value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
  it('clamps to lower bound', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
  })
  it('clamps to upper bound', () => {
    expect(clamp(99, 0, 10)).toBe(10)
  })
})

describe('dragVerdict', () => {
  it('returns null when below thresholds', () => {
    expect(dragVerdict(0, 0)).toBeNull()
    expect(dragVerdict(20, 20)).toBeNull()
  })
  it('returns "oui" on strong right drag', () => {
    expect(dragVerdict(60, 0)).toBe('oui')
    expect(dragVerdict(200, 10)).toBe('oui')
  })
  it('returns "non" on strong left drag', () => {
    expect(dragVerdict(-60, 0)).toBe('non')
    expect(dragVerdict(-150, -20)).toBe('non')
  })
  it('returns "whynot" on strong up drag', () => {
    expect(dragVerdict(0, -60)).toBe('whynot')
    expect(dragVerdict(20, -120)).toBe('whynot')
  })
  it('returns "top" on strong down drag', () => {
    expect(dragVerdict(0, 60)).toBe('top')
  })
  it('favours horizontal over vertical when |x| > |y| * 0.7', () => {
    // x = 60, y = -50, |x| > |y| * 0.7 → horizontal wins → "oui"
    expect(dragVerdict(60, -50)).toBe('oui')
  })
  it('favours vertical when horizontal is small', () => {
    // x = 10, y = -60 → vertical wins → "whynot"
    expect(dragVerdict(10, -60)).toBe('whynot')
  })
})

describe('exitOffset', () => {
  it('moves right-and-up for "oui"', () => {
    const o = exitOffset('oui')
    expect(o.x).toBeGreaterThan(0)
    expect(o.y).toBeLessThan(0)
    expect(o.r).toBeGreaterThan(0)
  })
  it('moves left-and-up for "non"', () => {
    const o = exitOffset('non')
    expect(o.x).toBeLessThan(0)
    expect(o.r).toBeLessThan(0)
  })
  it('moves straight up for "whynot"', () => {
    expect(exitOffset('whynot')).toEqual({ x: 0, y: expect.any(Number), r: 0 })
    expect(exitOffset('whynot').y).toBeLessThan(0)
  })
  it('moves straight down for "top"', () => {
    expect(exitOffset('top').y).toBeGreaterThan(0)
    expect(exitOffset('top').x).toBe(0)
  })
})

describe('dragRotation', () => {
  it('returns 0 when x is 0', () => {
    expect(dragRotation(0)).toBe(0)
  })
  it('caps to +18 for large positive x', () => {
    expect(dragRotation(1000)).toBe(18)
  })
  it('caps to -18 for large negative x', () => {
    expect(dragRotation(-1000)).toBe(-18)
  })
})

describe('dragIntensity', () => {
  it('is 0 at rest', () => {
    expect(dragIntensity(0, 0)).toBe(0)
  })
  it('is 1 when the larger component reaches 200', () => {
    expect(dragIntensity(200, 0)).toBe(1)
    expect(dragIntensity(0, -250)).toBe(1)
  })
  it('uses the max of |x| and |y|', () => {
    expect(dragIntensity(100, -50)).toBe(0.5)
    expect(dragIntensity(-30, 100)).toBe(0.5)
  })
})
