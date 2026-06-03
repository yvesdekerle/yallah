import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { X } from '../icons/index.tsx'
import { useModalA11y } from '../hooks/useModalA11y.ts'

interface PhotoLightboxProps {
  photos: string[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}

const DRAG_THRESHOLD = 60
// Below this, a pointer gesture counts as a tap (used to close) rather than a swipe.
const TAP_SLOP = 8

/**
 * Full-screen photo viewer built as a sliding filmstrip: all photos sit in a
 * single flex track translated by `-index * 100%`, so navigating animates the
 * neighbouring photo into view instead of swapping the source in place.
 *
 * - Tap the letterbox / X button / Escape to close
 * - Arrow keys (← →) or the on-screen arrows to navigate
 * - Horizontal pointer drag (≥60px) to swipe between photos, with rubber-band
 *   resistance at the first / last photo
 */
export const PhotoLightbox = memo(function PhotoLightbox({
  photos,
  index,
  onIndex,
  onClose,
}: PhotoLightboxProps) {
  const [enter, setEnter] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startRef = useRef<{ x: number; moved: boolean } | null>(null)
  // After a real swipe a synthetic click fires — suppress it so the gesture
  // that lands on the backdrop doesn't also close the viewer.
  const suppressClickRef = useRef(false)

  // Esc-to-close, focus trap + restoration. Scoped here so when the lightbox
  // is layered over the detail sheet, Esc closes the photo first.
  const rootRef = useRef<HTMLDivElement>(null)
  useModalA11y(rootRef, { onClose })

  useEffect(() => {
    requestAnimationFrame(() => setEnter(true))
  }, [])

  // Arrow-key navigation (Esc is handled by useModalA11y above).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') onIndex(Math.min(index + 1, photos.length - 1))
      if (e.key === 'ArrowLeft') onIndex(Math.max(index - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length, onIndex])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX, moved: false }
    setDragging(true)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    if (Math.abs(dx) > TAP_SLOP) startRef.current.moved = true
    // Rubber-band when dragging past the first / last photo.
    const atEdge =
      (index === 0 && dx > 0) || (index === photos.length - 1 && dx < 0)
    setDragX(atEdge ? dx * 0.35 : dx)
  }

  const onPointerUp = () => {
    if (!startRef.current) return
    const dx = dragX
    if (dx < -DRAG_THRESHOLD && index < photos.length - 1) onIndex(index + 1)
    else if (dx > DRAG_THRESHOLD && index > 0) onIndex(index - 1)
    suppressClickRef.current = startRef.current.moved
    startRef.current = null
    setDragX(0)
    setDragging(false)
  }

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Photo en plein écran"
      data-testid="photo-lightbox"
      onClick={(e) => {
        // Stop the close-click from bubbling to the DetailModal backdrop,
        // which would otherwise dismiss the whole sheet underneath.
        e.stopPropagation()
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          return
        }
        onClose()
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-[50] overflow-hidden outline-none"
      style={{
        background: enter ? 'rgba(10,12,18,0.96)' : 'rgba(10,12,18,0)',
        transition: 'background 0.22s',
      }}
    >
      <div
        className="flex h-full w-full"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(calc(${-index * 100}% + ${dragX}px))`,
          transition: dragging
            ? 'none'
            : 'transform 0.34s cubic-bezier(.22,.61,.36,1)',
          touchAction: 'pan-y',
          willChange: 'transform',
          opacity: enter ? 1 : 0,
          cursor: dragging ? 'grabbing' : 'grab',
        }}
      >
        {photos.map((src, i) => (
          <div
            key={i}
            className="flex h-full shrink-0 items-center justify-center"
            style={{ flex: '0 0 100%', padding: '0 16px' }}
          >
            <img
              src={src}
              alt={`photo ${i + 1} sur ${photos.length}`}
              draggable={false}
              onClick={(e) => e.stopPropagation()}
              className="select-none"
              style={{
                maxWidth: 'min(600px, 100%)',
                maxHeight: 'calc(100vh - 80px)',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: 18,
                boxShadow: '0 20px 60px -20px rgba(0,0,0,0.6)',
                background: '#181B1F',
              }}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="fermer la photo"
        className="absolute z-[2] flex items-center justify-center border-0 cursor-pointer"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 18px)',
          right: 18,
          width: 40,
          height: 40,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.16)',
          color: '#fff',
          backdropFilter: 'blur(8px)',
        }}
      >
        <X color="#fff" size={20} />
      </button>

      <div
        className="absolute z-[2] -translate-x-1/2 font-mono"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 26px)',
          left: '50%',
          fontSize: 12,
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: 0.6,
        }}
      >
        {index + 1} / {photos.length}
      </div>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onIndex(index - 1)
          }}
          aria-label="photo précédente"
          style={arrowStyle('left')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      {index < photos.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onIndex(index + 1)
          }}
          aria-label="photo suivante"
          style={arrowStyle('right')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 18l6-6-6-6"
              stroke="#fff"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
})

function arrowStyle(side: 'left' | 'right'): CSSProperties {
  return {
    position: 'absolute',
    [side]: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 44,
    height: 44,
    borderRadius: 99,
    border: 'none',
    background: 'rgba(255,255,255,0.16)',
    color: '#fff',
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  }
}
