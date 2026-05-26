import type { Verdict } from '../types/verdict.ts'
import { VERDICT_META } from '../constants/swipe.ts'

interface VerdictBadgeProps {
  verdict: Verdict
  number: number
  size?: number
}

/**
 * Activity-number badge whose colour AND shape vary with the verdict.
 *
 * - `oui` → heart shape (pink)
 * - `top` → star shape (gold)
 * - `non` / `whynot` / `skip` → coloured circle
 *
 * The activity number is laid out as white text in the centre of the
 * shape. Used in the results list to communicate "what did I vote on this
 * activity" at a glance.
 */
export function VerdictBadge({ verdict, number, size = 40 }: VerdictBadgeProps) {
  const num = number.toString().padStart(2, '0')
  const fill = VERDICT_META[verdict].color
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden
      style={{ display: 'block', flexShrink: 0 }}
    >
      <ShapeFor verdict={verdict} fill={fill} />
      <text
        x="24"
        y={
          verdict === 'oui' ? 32 : verdict === 'top' ? 31 : 30
        }
        textAnchor="middle"
        fontSize={verdict === 'oui' || verdict === 'top' ? 13 : 14}
        fontWeight={800}
        fontFamily="ui-monospace, monospace"
        fill="#fff"
        style={{ pointerEvents: 'none' }}
      >
        {num}
      </text>
    </svg>
  )
}

interface ShapeProps {
  verdict: Verdict
  fill: string
}

function ShapeFor({ verdict, fill }: ShapeProps) {
  switch (verdict) {
    case 'oui':
      return (
        <path
          d="M24 42 C24 42, 4 30, 4 15 C4 9, 9 5, 14 5 C18 5, 22 7.5, 24 11.5 C26 7.5, 30 5, 34 5 C39 5, 44 9, 44 15 C44 30, 24 42, 24 42 Z"
          fill={fill}
        />
      )
    case 'top':
      return (
        // 5-pointed star (puffier interior to fit a 2-digit number).
        <path
          d="M24 4 L29.3 17.6 L44 18.8 L32.7 28.4 L36.3 42.6 L24 35 L11.7 42.6 L15.3 28.4 L4 18.8 L18.7 17.6 Z"
          fill={fill}
        />
      )
    case 'non':
    case 'whynot':
    case 'skip':
    default:
      return <circle cx={24} cy={24} r={20} fill={fill} />
  }
}
