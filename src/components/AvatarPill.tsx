/**
 * A participant's coloured initial disc. Shared by IdentityPicker,
 * DetailGroupVotes and GroupScreen (they differ only in size).
 */
export function AvatarPill({
  initial,
  color,
  size,
  fontSize,
}: {
  initial: string
  color: string
  size: number
  fontSize: number
}) {
  return (
    <span
      className="inline-flex items-center justify-center font-sans"
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: color,
        color: '#fff',
        fontSize,
        fontWeight: 800,
        flexShrink: 0,
        textShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }}
      aria-hidden
    >
      {initial}
    </span>
  )
}
