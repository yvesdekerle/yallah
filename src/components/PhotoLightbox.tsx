import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { X } from '../icons/index.tsx'

interface PhotoLightboxProps {
  photos: string[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
}

const DRAG_THRESHOLD = 60

/**
 * Full-screen photo viewer. Supports:
 * - Click outside the image / X button to close
 * - Arrow keys (← →) to navigate, Escape to close
 * - Horizontal pointer drag (≥60px) to swipe between photos
 */
export function PhotoLightbox({
  photos,
  index,
  onIndex,
  onClose,
}: PhotoLightboxProps) {
  const [enter, setEnter] = useState(false)
  const [drag, setDrag] = useState({ x: 0, dragging: false })
  const startRef = useRef<{ x: number } | null>(null)

  useEffect(() => {
    requestAnimationFrame(() => setEnter(true))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onIndex(Math.min(index + 1, photos.length - 1))
      if (e.key === 'ArrowLeft') onIndex(Math.max(index - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length, onIndex, onClose])

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    startRef.current = { x: e.clientX }
    setDrag({ x: 0, dragging: true })
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.dragging || !startRef.current) return
    setDrag({ x: e.clientX - startRef.current.x, dragging: true })
  }

  const onPointerUp = () => {
    if (!drag.dragging) return
    const dx = drag.x
    if (dx > DRAG_THRESHOLD && index > 0) onIndex(index - 1)
    else if (dx < -DRAG_THRESHOLD && index < photos.length - 1) onIndex(index + 1)
    setDrag({ x: 0, dragging: false })
    startRef.current = null
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute inset-0 z-[50] flex items-center justify-center"
      style={{
        background: enter ? 'rgba(10,12,18,0.96)' : 'rgba(10,12,18,0)',
        transition: 'background 0.22s',
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="fermer la photo"
        className="absolute z-[2] flex items-center justify-center border-0 cursor-pointer"
        style={{
          top: 18,
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
          top: 26,
          left: '50%',
          fontSize: 12,
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: 0.6,
        }}
      >
        {index + 1} / {photos.length}
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={`photo ${index + 1} sur ${photos.length}`}
        className="select-none"
        style={{
          width: 'calc(100% - 32px)',
          maxWidth: 600,
          aspectRatio: '1 / 1',
          background: `url(${photos[index]}) center/cover, #181B1F`,
          borderRadius: 18,
          boxShadow: '0 20px 60px -20px rgba(0,0,0,0.6)',
          opacity: enter ? 1 : 0,
          transform: enter
            ? `translateX(${drag.x}px) scale(${drag.dragging ? 0.98 : 1})`
            : 'scale(0.92)',
          transition: drag.dragging
            ? 'none'
            : 'opacity 0.22s, transform 0.22s cubic-bezier(.2,.7,.3,1)',
          cursor: drag.dragging ? 'grabbing' : 'grab',
          touchAction: 'pan-y',
        }}
      />

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
}

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
