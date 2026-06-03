import { type ReactNode } from 'react'
import { YB } from '../utils/theme.ts'
import { inputStyle } from './addActivityStyles.ts'
import { PillButton } from './PillButton.tsx'

/** Labelled form row wrapper. */
export function Field({
  label,
  children,
  required,
}: {
  label?: string | undefined
  children: ReactNode
  required?: boolean | undefined
}) {
  return (
    <label className="flex flex-col" style={{ gap: 6 }}>
      {label && (
        <span style={{ fontSize: 12.5, fontWeight: 700, color: YB.ink2 }}>
          {label}
          {required && <span style={{ color: YB.coralDeep }}> *</span>}
        </span>
      )}
      {children}
    </label>
  )
}

export function FieldText({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <Field label={label} required={required}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        style={inputStyle}
      />
    </Field>
  )
}

export function FieldArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Field label={label}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        rows={3}
        style={{ ...inputStyle, height: 'auto', padding: '10px 12px', lineHeight: 1.4, resize: 'vertical' }}
      />
    </Field>
  )
}

export function Chip({
  selected,
  onClick,
  label,
  dot,
}: {
  selected: boolean
  onClick: () => void
  label: string
  dot?: string
}) {
  return (
    <PillButton
      selected={selected}
      onClick={onClick}
      className="justify-center"
      style={{
        minHeight: 40,
        gap: 6,
        padding: '0 14px',
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {dot && (
        <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>
          {dot}
        </span>
      )}
      <span style={{ lineHeight: 1 }}>{label}</span>
    </PillButton>
  )
}

export function SmallButton({
  onClick,
  label,
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-sans cursor-pointer border-0"
      style={{ height: 60, padding: '0 18px', borderRadius: 14, background: YB.ink, color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}
    >
      {label}
    </button>
  )
}

export function Toggle({
  label,
  on,
  onToggle,
}: {
  label: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <PillButton
      selected={on}
      onClick={onToggle}
      style={{ gap: 8, padding: '8px 14px', fontSize: 13.5, fontWeight: 700 }}
    >
      {label}
    </PillButton>
  )
}
