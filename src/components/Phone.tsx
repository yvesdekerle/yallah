import type { ReactNode } from 'react'
import { YB } from '../utils/theme.ts'

interface PhoneProps {
  children: ReactNode
  /** Background tint inside the phone screen. */
  bg?: string
}

/**
 * Visual "phone" wrapper — only shown on wide viewports. On mobile (<460px)
 * the bezel/notch collapses to a full-bleed surface via the media query in
 * `index.css`.
 */
export function Phone({ children, bg = YB.bgSun }: PhoneProps) {
  return (
    <div
      className="phone-frame relative h-full w-full box-border"
      style={{
        background: '#0E1018',
        borderRadius: 46,
        padding: 10,
        boxShadow:
          '0 30px 60px -20px rgba(20,30,50,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="phone-notch absolute left-1/2 z-10 -translate-x-1/2"
        style={{
          top: 14,
          width: 96,
          height: 26,
          background: '#0E1018',
          borderRadius: 99,
        }}
      />
      <div
        className="phone-screen relative h-full w-full box-border overflow-hidden"
        style={{ background: bg, borderRadius: 38 }}
      >
        {children}
      </div>
    </div>
  )
}
