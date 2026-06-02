import { type ReactNode } from 'react'
import { YB } from '../utils/theme.ts'
import { inputStyle } from './addActivityStyles.ts'

/** Labelled form row wrapper. */
export function Field({
  label,
  children,
  required,
}: {
  label?: string
  children: ReactNode
  required?: boolean
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
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="inline-flex items-center justify-center font-sans cursor-pointer"
      style={{
        minHeight: 40,
        gap: 6,
        padding: '0 14px',
        borderRadius: 99,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1,
        background: selected ? YB.ink : '#fff',
        color: selected ? '#fff' : YB.ink,
        border: selected ? '1px solid transparent' : `1px solid ${YB.bgSoft}`,
      }}
    >
      {dot && (
        <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>
          {dot}
        </span>
      )}
      <span style={{ lineHeight: 1 }}>{label}</span>
    </button>
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
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="inline-flex items-center font-sans cursor-pointer"
      style={{
        gap: 8,
        padding: '8px 14px',
        borderRadius: 99,
        fontSize: 13.5,
        fontWeight: 700,
        background: on ? YB.ink : '#fff',
        color: on ? '#fff' : YB.ink,
        border: on ? '1px solid transparent' : `1px solid ${YB.bgSoft}`,
      }}
    >
      {label}
    </button>
  )
}
