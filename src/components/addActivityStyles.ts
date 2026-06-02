import type { CSSProperties } from 'react'
import { YB } from '../utils/theme.ts'

// Shared input/select styling for the add-activity form. Lives in a `.ts`
// module (not a `.tsx`) so it can be exported alongside no components without
// tripping react-refresh/only-export-components.
export const inputStyle: CSSProperties = {
  minWidth: 0,
  width: '100%',
  height: 60,
  borderRadius: 14,
  border: `1px solid ${YB.bgSoft}`,
  background: '#fff',
  // 16px keeps iOS Safari from auto-zooming the viewport on focus.
  padding: '0 16px',
  fontSize: 16,
  color: YB.ink,
  boxSizing: 'border-box',
}

export const selectStyle: CSSProperties = { ...inputStyle, appearance: 'auto' }
