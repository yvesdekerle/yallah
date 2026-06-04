import type { Activity } from '../types/activity.ts'
import { YB } from '../utils/theme.ts'
import { SectionHeading } from './SectionHeading.tsx'
import { getLinks } from '../utils/links.ts'

/**
 * The textual body of the DetailModal: description, optional anecdote, the
 * curated links list, and the horizontal photo carousel (each thumb opens the
 * lightbox via `onOpenPhoto`).
 */
export function DetailBody({
  activity,
  photos,
  onOpenPhoto,
  createdByMe = false,
}: {
  activity: Activity
  photos: string[]
  onOpenPhoto: (index: number) => void
  /** True when the current user created this activity ("Créé par toi"). */
  createdByMe?: boolean
}) {
  const activityLinks = getLinks(activity.id)
  return (
    <>
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

      {activityLinks.length > 0 && (
        <>
          <SectionHeading count={activityLinks.length}>Liens</SectionHeading>
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
                  <span style={{ color: YB.muted, fontSize: 16 }} aria-hidden>
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

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
              onOpenPhoto(i)
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

      {activity.createdBy && (
        <p
          className="font-sans"
          style={{
            margin: '0 0 8px',
            fontSize: 13,
            fontWeight: 600,
            color: YB.muted,
          }}
        >
          Créé par {createdByMe ? 'toi' : activity.createdBy.name}
        </p>
      )}
    </>
  )
}
