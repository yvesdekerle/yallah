import { describe, it, expect } from 'vitest'
import { isSafePhotoUrl, cssUrlValue } from './photoUrl.ts'

describe('isSafePhotoUrl', () => {
  it('accepts http, https and blob URLs', () => {
    expect(isSafePhotoUrl('https://images.pexels.com/photos/1/a.jpg')).toBe(true)
    expect(isSafePhotoUrl('http://example.com/p.png')).toBe(true)
    expect(isSafePhotoUrl('blob:https://app.local/uuid-123')).toBe(true)
  })

  it('rejects dangerous schemes', () => {
    expect(isSafePhotoUrl('javascript:alert(1)')).toBe(false)
    expect(isSafePhotoUrl('data:image/png;base64,AAAA')).toBe(false)
    expect(isSafePhotoUrl('vbscript:msgbox(1)')).toBe(false)
  })

  it('rejects protocol-relative and empty/whitespace input', () => {
    expect(isSafePhotoUrl('//evil.com/x.jpg')).toBe(false)
    expect(isSafePhotoUrl('')).toBe(false)
    expect(isSafePhotoUrl('   ')).toBe(false)
  })

  it('rejects URLs containing HTML/CSS breakout characters', () => {
    expect(isSafePhotoUrl("https://x/a.jpg')")).toBe(false)
    expect(isSafePhotoUrl('https://x/a.jpg"')).toBe(false)
    expect(isSafePhotoUrl('https://x/<svg>')).toBe(false)
    expect(isSafePhotoUrl('https://x/a>')).toBe(false)
  })
})

describe('cssUrlValue', () => {
  it("escapes the characters that break out of url('...') inside an HTML style attribute", () => {
    const out = cssUrlValue("a.jpg');}</style><img onerror=x>")
    expect(out).not.toContain("'")
    expect(out).not.toContain('<')
    expect(out).not.toContain('>')
    expect(out).not.toContain('"')
  })

  it('leaves a normal URL (percent-encoding, parens, spaces, &) byte-identical', () => {
    const url = 'https://images.pexels.com/photos/1/img%20(1).jpg?auto=compress&cs=tinysrgb'
    expect(cssUrlValue(url)).toBe(url)
  })
})
