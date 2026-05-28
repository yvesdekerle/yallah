import type { SVGProps } from 'react'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'fill'> {
  /** Pixel size — applied to both width and height. */
  size?: number
  /** Stroke / fill color. Defaults to `currentColor`. */
  color?: string
  /** Filled icons (Heart, Star) accept a separate fill color. */
  fill?: string
}

function base(p: IconProps, defaultSize: number): SVGProps<SVGSVGElement> {
  const { size, color: _color, fill: _fill, ...rest } = p
  void _color
  void _fill
  return {
    width: size ?? defaultSize,
    height: size ?? defaultSize,
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true,
    ...rest,
  }
}

export function X(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)}>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Heart(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)} fill={p.fill ?? 'none'}>
      <path
        d="M12 20s-7-4.5-9.2-9.1C1.1 7.3 3 4 6.3 4c2 0 3.6 1.2 4.4 2.7C11.4 5.2 13 4 15 4c3.3 0 5.2 3.3 3.5 6.9C19 15.5 12 20 12 20z"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Star(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)} fill={p.fill ?? 'none'}>
      <path
        d="M12 2.5l2.95 6.5L22 9.7l-5.2 5.05L18 22l-6-3.4L6 22l1.2-7.25L2 9.7l7.05-1.2L12 2.5z"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function StarFilled(p: IconProps = {}) {
  return (
    <svg {...base(p, 12)} fill={p.fill ?? p.color ?? 'currentColor'}>
      <path d="M12 2l2.95 6.5L22 9.7l-5.2 5.05L18 22l-6-3.4L6 22l1.2-7.25L2 9.7l7.05-1.2L12 2z" />
    </svg>
  )
}

export function Undo(p: IconProps = {}) {
  return (
    <svg {...base(p, 18)}>
      <path
        d="M4 9h11a5 5 0 010 10H9"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 6L4 9l3 3"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Pin(p: IconProps = {}) {
  return (
    <svg {...base(p, 14)}>
      <path
        d="M12 22s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2}
      />
      <circle
        cx={12}
        cy={10}
        r={2.5}
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2}
      />
    </svg>
  )
}

export function Clock(p: IconProps = {}) {
  return (
    <svg {...base(p, 13)}>
      <circle
        cx={12}
        cy={12}
        r={9}
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
      />
      <path
        d="M12 7v5l3 2"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Wallet(p: IconProps = {}) {
  return (
    <svg {...base(p, 13)}>
      <rect
        x={3}
        y={6}
        width={18}
        height={13}
        rx={2.5}
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
      />
      <path
        d="M16 12.5h3"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Cards(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)}>
      <rect
        x={6}
        y={4}
        width={12}
        height={16}
        rx={2.5}
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
      />
      <path
        d="M9 9h6M9 13h4"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Results(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)}>
      <path
        d="M5 19V11M12 19V5M19 19v-5"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function People(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)}>
      <circle
        cx={9}
        cy={9}
        r={3.2}
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
      />
      <circle
        cx={17}
        cy={10}
        r={2.5}
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
      />
      <path
        d="M3 19c.6-3 3-5 6-5s5.4 2 6 5M15 14.5c2.5.2 4.5 1.8 5 4.5"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Eye(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)}>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
      />
      <circle
        cx={12}
        cy={12}
        r={3}
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
        fill="none"
      />
    </svg>
  )
}

export function EyeOff(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)}>
      <path
        d="M2 12s3.5-7 10-7c2.4 0 4.4.9 6 2M22 12s-3.5 7-10 7c-2.4 0-4.4-.9-6-2"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <path
        d="M3 3l18 18"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  )
}

export function WhyNotChevron(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)}>
      <path
        d="M5 15l7-7 7 7"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Skip / "decide later" — a circle with a diagonal slash. */
export function Skip(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)}>
      <circle
        cx={12}
        cy={12}
        r={9}
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
      />
      <path
        d="M6 18L18 6"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Plus — used for the "Ajouter" tab and add-photo affordances. */
export function Plus(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)}>
      <path
        d="M12 5v14M5 12h14"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Equal-sign — used on the card when re-going through the deck to confirm a previous vote. */
export function Equal(p: IconProps = {}) {
  return (
    <svg {...base(p, 22)}>
      <path
        d="M5 9h14M5 15h14"
        stroke={p.color ?? 'currentColor'}
        strokeWidth={2.6}
        strokeLinecap="round"
      />
    </svg>
  )
}

