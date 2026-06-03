import type { CSSProperties } from 'react'

/**
 * React's {@link CSSProperties} rejects arbitrary `--custom` properties, so
 * inline styles that feed CSS variables to a keyframe normally need an
 * `as CSSProperties` cast. This type adds the custom-property index instead.
 */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>

/**
 * Identity helper: lets an inline style object declare CSS custom properties
 * (`--foo`) while still being type-checked — the object is validated as
 * {@link CSSVars} and returned as a plain style object, replacing the
 * `as React.CSSProperties` casts.
 */
export const cssVars = (style: CSSVars): CSSProperties => style
