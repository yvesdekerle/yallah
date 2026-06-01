import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Activity } from '../types/activity.ts'
import type { Verdict } from '../types/verdict.ts'
import { YB } from '../utils/theme.ts'
import { detailPhotos, heroPhotoUrl } from '../utils/photos.ts'
import {
  X,
  Pin,
  Clock,
  Wallet,
  StarFilled,
} from '../icons/index.tsx'
import { SectionHeading } from './SectionHeading.tsx'
import { ActionRow } from './ActionRow.tsx'
import { PhotoLightbox } from './PhotoLightbox.tsx'
import { coordsFor } from '../utils/coords.ts'
import {
  BASE_TAMARIN,
  BASE_TROU_AUX_BICHES,
  estimateDriveTime,
} from '../utils/distance.ts'
import { getLinks } from '../utils/links.ts'
import { ratingComment } from '../utils/rating.ts'
import { getReviewSummary } from '../utils/reviewSummary.ts'
import { labelForTag } from '../utils/tags.ts'
import { fakeVote } from '../utils/groupVotes.ts'
import { shortPrice, formatRating } from '../utils/format.ts'
import { PARTICIPANTS } from '../data/participants.ts'
import { VERDICT_META } from '../constants/swipe.ts'
import type { MapView } from '../types/map.ts'

const ActivityMiniMap = lazy(() =>
  import('./ActivityMiniMap.tsx').then((m) => ({ default: m.ActivityMiniMap })),
)

function MetaTile({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: ReactNode
  iconBg: string
  label: string
  value: string
}) {
  return (
    <div
      className="flex flex-col items-center font-sans"
      style={{ gap: 6, padding: '4px 6px', minWidth: 0 }}
    >
      <span
        className="inline-flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          borderRadius: 99,
          background: iconBg,
          flexShrink: 0,
        }}
        aria-hidden
      >
        {icon}
      </span>
      <span
        className="font-mono"
        style={{
          fontSize: 9.5,
          letterSpacing: 0.9,
          color: YB.muted,
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: YB.ink,
          textAlign: 'center',
          lineHeight: 1.2,
          maxWidth: '100%',
          overflowWrap: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  )
}

interface DetailModalProps {
  activity: Activity
  /** Called when the modal should close (overlay click, X button, eye toggle). */
  onClose: () => void
  /** Called with a verdict from the sticky bottom action row. */
  onVerdict: (verdict: Verdict) => void
  superRemaining: number
  /** Open the FullscreenMap. Optional — when undefined, the mini-map
      is not tappable (still shown, just inert). */
  onOpenMap?: (view: MapView) => void
  /** True once the local user has voted on every activity. Gates the
      "Le groupe" votes panel — placeholder before, reveal after. */
  meDone?: boolean
  /** Id of the local user — used to slot the real verdict in the group panel. */
  userId?: string | null
  /** Local user's verdict for this activity, if any. */
  myVerdict?: Verdict | null
}

/**
 * Slide-up bottom-sheet detail view for a single activity. Hosts:
 * - Hero photo with pagination dots
 * - Meta-chip strip (duration, difficulty, rating, price, transit)
 * - Description
 * - Horizontal scroll-snap photo carousel (12 photos)
 * - Group votes (locked behind `meDone`; placeholder until then)
 * - Sticky bottom action row (5 buttons, reused from the swipe screen)
 * - Lightbox overlay when a photo is clicked
 */
export function DetailModal({
  activity,
  onClose,
  onVerdict,
  superRemaining,
  onOpenMap,
  meDone = false,
  userId = null,
  myVerdict = null,
}: DetailModalProps) {
  const [open, setOpen] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)

  const photos = useMemo(() => detailPhotos(activity), [activity])

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true))
  }, [])

  // The active swipe card opens this modal on `pointerup` (tap-vs-drag is
  // decided there). On touch, a synthesized `click` follows the pointer
  // sequence and lands on this just-mounted backdrop — closing the modal
  // the instant it opens. Ignore backdrop clicks for a short window after
  // mount so that opening-tap echo can't dismiss it. (The X button is not
  // guarded — it's an explicit, deliberate action.)
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setArmed(true), 400)
    return () => window.clearTimeout(t)
  }, [])

  const close = () => {
    setOpen(false)
    window.setTimeout(onClose, 250)
  }

  const closeFromBackdrop = () => {
    if (!armed) return
    close()
  }

  const handleAction = (v: Verdict) => {
    onVerdict(v)
    close()
  }

  return (
    <div
      onClick={closeFromBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`Détail de ${activity.title}`}
      className="absolute inset-0 z-[50]"
      style={{
        background: open ? 'rgba(20,25,40,0.5)' : 'rgba(20,25,40,0)',
        transition: 'background 0.25s',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="detail-sheet"
        className="absolute left-0 right-0 bottom-0 overflow-y-auto font-sans"
        style={{
          top: open ? 0 : '100%',
          background: YB.paper,
          transition: 'top 0.35s cubic-bezier(.2,.7,.3,1)',
          color: YB.ink,
        }}
      >
        {/* Hero photo */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            aspectRatio: '4 / 4.1',
            background: `url(${photos[photoIdx]}) center center/cover, ${YB.ink}`,
          }}
        >
          {/* Bottom gradient for title legibility */}
          <div
            className="pointer-events-none absolute left-0 right-0 bottom-0"
            style={{
              height: '55%',
              background:
                'linear-gradient(180deg, rgba(15,18,28,0) 0%, rgba(15,18,28,0.25) 45%, rgba(15,18,28,0.78) 88%, rgba(15,18,28,0.92) 100%)',
            }}
          />

          <button
            type="button"
            onClick={close}
            aria-label="fermer"
            className="absolute z-[3] flex items-center justify-center border-0 cursor-pointer"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
              left: 14,
              width: 38,
              height: 38,
              borderRadius: 99,
              background: 'rgba(255,255,255,0.95)',
              boxShadow: '0 4px 10px -2px rgba(20,30,50,0.25)',
            }}
          >
            <X color={YB.ink} size={20} />
          </button>

          {/* Tag chips — tap to toggle the legend */}
          <div
            className="absolute z-[3] flex flex-col"
            style={{
              top: 'calc(env(safe-area-inset-top, 0px) + 14px)',
              right: 14,
              alignItems: 'flex-end',
              gap: 6,
            }}
          >
            <div className="flex" style={{ gap: 4 }}>
              {activity.tags.slice(0, 3).map((tag, i) => (
                <button
                  type="button"
                  key={`${tag}-${i}`}
                  onClick={() => setLegendOpen((v) => !v)}
                  aria-label={labelForTag(tag)}
                  aria-expanded={legendOpen}
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 99,
                    background: legendOpen
                      ? '#fff'
                      : 'rgba(255,255,255,0.95)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 16,
                    boxShadow:
                      tag === '💎'
                        ? `0 0 0 2px ${YB.top}, 0 2px 8px -2px rgba(20,30,50,0.15)`
                        : '0 2px 8px -2px rgba(20,30,50,0.15)',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
            {legendOpen && (
              <div
                role="dialog"
                aria-label="Légende des tags"
                className="font-sans"
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'rgba(255,255,255,0.97)',
                  color: YB.ink,
                  borderRadius: 14,
                  padding: '10px 12px',
                  boxShadow: '0 6px 20px -6px rgba(20,30,50,0.35)',
                  maxWidth: 220,
                  fontSize: 12.5,
                  lineHeight: 1.35,
                }}
              >
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {activity.tags.slice(0, 3).map((tag, i) => (
                    <li
                      key={`legend-${tag}-${i}`}
                      className="flex items-center"
                      style={{ gap: 8 }}
                    >
                      <span style={{ fontSize: 15 }} aria-hidden>
                        {tag}
                      </span>
                      <span>{labelForTag(tag)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {photos.length > 1 && (
            <div
              className="absolute z-[3] flex"
              style={{ bottom: 88, right: 18, gap: 5 }}
              role="tablist"
              aria-label="pagination photos"
            >
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === photoIdx}
                  aria-label={`photo ${i + 1}`}
                  onClick={() => setPhotoIdx(i)}
                  style={{
                    width: i === photoIdx ? 18 : 6,
                    height: 6,
                    border: 'none',
                    borderRadius: 99,
                    background:
                      i === photoIdx ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'width 0.2s, background 0.2s',
                  }}
                />
              ))}
            </div>
          )}

          {/* Title block */}
          <div
            className="absolute z-[2] text-white"
            style={{ left: 20, right: 20, bottom: 18 }}
          >
            <div
              className="font-mono"
              style={{
                fontSize: 10.5,
                letterSpacing: 1.5,
                opacity: 0.78,
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              Nº{activity.number.toString().padStart(2, '0')}
            </div>
            <h1
              className="m-0 font-sans"
              style={{
                fontSize: 30,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: -0.6,
                textShadow: '0 2px 12px rgba(0,0,0,0.35)',
              }}
            >
              {activity.title}
            </h1>
            <div
              className="flex items-center"
              style={{
                gap: 8,
                marginTop: 10,
                fontSize: 13,
                fontWeight: 500,
                opacity: 0.95,
              }}
            >
              <Pin color="#fff" size={14} />
              {activity.location}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 22px 200px' }}>
          {activity.difficulty &&
            (activity.difficulty.label === 'Difficile' ||
              activity.difficulty.label === 'Très difficile') && (
              <div
                role="note"
                aria-label={`Avertissement difficulté: ${activity.difficulty.label}`}
                className="flex font-sans"
                style={{
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 16px',
                  marginBottom: 22,
                  background: `${activity.difficulty.dot}14`,
                  border: `1px solid ${activity.difficulty.dot}33`,
                  borderLeft: `4px solid ${activity.difficulty.dot}`,
                  borderRadius: 12,
                }}
              >
                <span
                  style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}
                  aria-hidden
                >
                  ⚠️
                </span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: activity.difficulty.dot,
                      marginBottom: 2,
                      letterSpacing: -0.1,
                    }}
                  >
                    {activity.difficulty.label}
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.4,
                      color: YB.ink2,
                    }}
                  >
                    {activity.difficulty.detail
                      ? activity.difficulty.detail.charAt(0).toUpperCase() +
                        activity.difficulty.detail.slice(1)
                      : 'Bonne condition physique requise.'}
                  </div>
                </div>
              </div>
            )}

          {/* Meta tiles — Durée / Niveau / Note / Prix in a 4-column grid */}
          <div
            className="font-sans"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 2,
              marginBottom: 18,
              padding: '14px 8px',
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 2px 10px -4px rgba(20,30,50,0.08)',
            }}
            aria-label="Caractéristiques de l'activité"
          >
            <MetaTile
              icon={<Clock color={YB.bgLagoon} size={20} />}
              iconBg={`${YB.bgLagoon}33`}
              label="Durée"
              value={activity.duration ?? '—'}
            />
            <MetaTile
              icon={
                activity.difficulty ? (
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 99,
                      background: activity.difficulty.dot,
                      display: 'inline-block',
                    }}
                    aria-hidden
                  />
                ) : (
                  <span aria-hidden />
                )
              }
              iconBg={
                activity.difficulty
                  ? `${activity.difficulty.dot}22`
                  : `${YB.muted}22`
              }
              label="Niveau"
              value={activity.difficulty?.label ?? '—'}
            />
            <MetaTile
              icon={<StarFilled color={YB.top} size={20} />}
              iconBg={`${YB.top}26`}
              label="Note"
              value={formatRating(activity.rating)}
            />
            <MetaTile
              icon={<Wallet color={YB.bgPistachio} size={20} />}
              iconBg={`${YB.bgPistachio}55`}
              label="Prix"
              value={shortPrice(activity.price)}
            />
          </div>

          {(() => {
            const summary =
              getReviewSummary(activity.id) ?? ratingComment(activity.rating)
            if (!summary) return null
            return (
              <div
                className="flex font-sans"
                style={{
                  alignItems: 'flex-start',
                  gap: 8,
                  marginBottom: 22,
                  fontSize: 13.5,
                  fontStyle: 'italic',
                  color: YB.ink2,
                  lineHeight: 1.45,
                }}
                aria-label="Justification de la note"
              >
                <span style={{ marginTop: 2, flexShrink: 0 }} aria-hidden>
                  <StarFilled color={YB.top} size={14} />
                </span>
                <span>
                  <strong style={{ fontStyle: 'normal', color: YB.ink }}>
                    {formatRating(activity.rating)}/5
                  </strong>{' '}
                  · {summary}
                </span>
              </div>
            )
          })()}

          {(() => {
            const coords = coordsFor(activity)
            const tamarinValue =
              activity.transit ||
              (coords ? estimateDriveTime(coords, BASE_TAMARIN) : null)
            const troubValue = coords
              ? estimateDriveTime(coords, BASE_TROU_AUX_BICHES)
              : null
            if (!tamarinValue && !troubValue) return null
            return (
              <div
                className="font-sans"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  columnGap: 10,
                  rowGap: 6,
                  alignItems: 'center',
                  marginBottom: 26,
                  padding: '12px 14px',
                  background: YB.bgSoft,
                  borderRadius: 12,
                  fontSize: 14,
                }}
                aria-label="Trajets depuis les villas"
              >
                {tamarinValue && (
                  <>
                    <span
                      className="inline-flex items-center justify-center"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 99,
                        background: '#fff',
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                      aria-hidden
                    >
                      🚗
                    </span>
                    <div style={{ color: YB.ink }}>
                      <span style={{ fontWeight: 700 }}>
                        {BASE_TAMARIN.label}
                      </span>
                      {' : '}
                      {tamarinValue}
                    </div>
                  </>
                )}
                {troubValue && (
                  <>
                    <span aria-hidden />
                    <div style={{ color: YB.ink2 }}>
                      <span style={{ fontWeight: 700 }}>
                        {BASE_TROU_AUX_BICHES.label}
                      </span>
                      {' : '}
                      {troubValue}
                    </div>
                  </>
                )}
              </div>
            )
          })()}

          <SectionHeading>L'expérience</SectionHeading>
          <p
            className="font-sans"
            style={{
              margin: '0 0 32px',
              padding: '4px 0 4px 18px',
              borderLeft: `4px solid ${YB.primary}`,
              fontSize: 15.5,
              lineHeight: 1.55,
              color: YB.ink,
              fontWeight: 400,
              letterSpacing: -0.05,
            }}
          >
            {activity.description}
          </p>

          {activity.insolite && (
            <>
              <SectionHeading>Anecdote</SectionHeading>
              <p
                className="font-serif italic"
                style={{
                  margin: '0 0 32px',
                  fontSize: 17,
                  lineHeight: 1.5,
                  color: YB.ink2,
                }}
              >
                {activity.insolite}
              </p>
            </>
          )}

          {(() => {
            const activityLinks = getLinks(activity.id)
            if (activityLinks.length === 0) return null
            return (
              <>
                <SectionHeading count={activityLinks.length}>
                  Liens
                </SectionHeading>
                <ul
                  className="font-sans"
                  style={{
                    listStyle: 'none',
                    margin: '0 0 32px',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                  aria-label="Liens utiles"
                >
                  {activityLinks.map((link, i) => (
                    <li key={`${link.url}-${i}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                        style={{
                          gap: 10,
                          padding: '12px 14px',
                          background: YB.bgSoft,
                          borderRadius: 12,
                          textDecoration: 'none',
                          color: YB.ink,
                          fontSize: 14,
                        }}
                      >
                        <span style={{ fontSize: 16 }} aria-hidden>
                          🔗
                        </span>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: 600,
                          }}
                        >
                          {link.label || link.url.replace(/^https?:\/\//, '')}
                        </span>
                        <span
                          style={{ color: YB.muted, fontSize: 16 }}
                          aria-hidden
                        >
                          ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )
          })()}

          <SectionHeading count={photos.length}>Photos</SectionHeading>
          <div
            className="flex"
            style={{
              gap: 10,
              overflowX: 'auto',
              overflowY: 'visible',
              scrollSnapType: 'x mandatory',
              padding: '6px 4px 18px',
              marginLeft: -4,
              marginRight: -4,
              marginBottom: 24,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {photos.map((src, i) => (
              <button
                key={i}
                type="button"
                aria-label={`ouvrir la photo ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setLightboxIdx(i)
                }}
                style={{
                  flex: '0 0 auto',
                  width: 168,
                  height: 210,
                  borderRadius: 18,
                  background: `url(${src}) center/cover, ${YB.ink}`,
                  cursor: 'pointer',
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  scrollSnapAlign: 'start',
                  boxShadow: '0 6px 16px -8px rgba(20,30,50,0.25)',
                  transition: 'transform 0.16s',
                }}
              />
            ))}
          </div>

          <SectionHeading>Sur la carte</SectionHeading>
          <div style={{ marginBottom: 24 }}>
            <Suspense
              fallback={
                <div
                  style={{
                    height: 180,
                    background: YB.bgSoft,
                    borderRadius: 12,
                  }}
                />
              }
            >
              <ActivityMiniMap
                coords={coordsFor(activity)}
                pinColor={YB.coral}
                photo={heroPhotoUrl(activity)}
                onExpand={
                  onOpenMap
                    ? () =>
                        onOpenMap({
                          mode: 'single',
                          activityId: activity.id,
                        })
                    : undefined
                }
              />
            </Suspense>
          </div>

          <SectionHeading>Le groupe</SectionHeading>
          {meDone ? (
            <ul
              data-testid="group-votes"
              className="font-sans"
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 12,
                background: YB.bgSoft,
                borderRadius: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
              aria-label="Votes du groupe pour cette activité"
            >
              {PARTICIPANTS.map((p) => {
                const isMe = userId !== null && p.id === userId
                const verdict =
                  isMe && myVerdict
                    ? myVerdict
                    : fakeVote(p.id, activity.id)
                const meta = VERDICT_META[verdict]
                return (
                  <li
                    key={p.id}
                    className="flex items-center"
                    style={{
                      gap: 10,
                      padding: '8px 10px',
                      background: '#fff',
                      borderRadius: 12,
                      fontSize: 14,
                    }}
                    data-testid={`group-vote-${p.id}`}
                  >
                    <span
                      className="inline-flex items-center justify-center font-sans"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 99,
                        background: p.color,
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 800,
                        flexShrink: 0,
                        textShadow: '0 1px 2px rgba(0,0,0,0.15)',
                      }}
                      aria-hidden
                    >
                      {p.initial}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontWeight: 600,
                        color: YB.ink,
                      }}
                    >
                      {p.name}
                      {isMe && (
                        <span
                          className="font-mono"
                          style={{
                            marginLeft: 6,
                            fontSize: 9.5,
                            letterSpacing: 0.6,
                            padding: '1px 5px',
                            borderRadius: 99,
                            background: YB.ink,
                            color: '#fff',
                            textTransform: 'uppercase',
                            verticalAlign: 'middle',
                          }}
                        >
                          toi
                        </span>
                      )}
                    </span>
                    <span
                      className="inline-flex items-center font-sans"
                      style={{
                        gap: 5,
                        padding: '3px 9px',
                        borderRadius: 99,
                        background: `${meta.color}1f`,
                        color: meta.color,
                        fontSize: 11.5,
                        fontWeight: 700,
                        letterSpacing: 0.2,
                      }}
                    >
                      <span aria-hidden style={{ fontSize: 12 }}>
                        {meta.emoji}
                      </span>
                      {meta.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div
              className="flex items-center font-sans"
              style={{
                padding: 18,
                background: YB.bgSoft,
                borderRadius: 16,
                fontSize: 14,
                color: YB.ink2,
                lineHeight: 1.55,
                gap: 12,
              }}
            >
              <span
                className="inline-flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 99,
                  background: '#fff',
                  fontSize: 16,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                🔒
              </span>
              <span>
                Les votes du groupe apparaîtront ici une fois que tu auras fini
                ton deck.
              </span>
            </div>
          )}
        </div>

        {/* Sticky bottom action bar */}
        <div
          className="sticky bottom-0 left-0 right-0"
          style={{
            background: 'rgba(255,252,245,0.96)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(20,30,50,0.08)',
            padding: '14px 12px',
          }}
        >
          <ActionRow
            onAct={handleAction}
            superRemaining={superRemaining}
            onToggleDetail={close}
            detailOpen
            absolute={false}
          />
        </div>
      </div>

      {lightboxIdx != null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIdx}
          onIndex={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </div>
  )
}
