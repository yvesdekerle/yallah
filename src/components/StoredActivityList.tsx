import type { Activity } from '../types/activity.ts'
import type { StoredUserActivity } from '../types/userActivity.ts'
import { YB } from '../utils/theme.ts'
import { cssUrlValue } from '../utils/photoUrl.ts'

interface StoredActivityListProps {
  /** Persisted user activities (raw records). */
  stored: StoredUserActivity[]
  /** Runtime counterparts (carry resolved photoUrls) — for the thumbnail/preview. */
  userActivities: Activity[]
  /** Open the detail sheet for a saved activity. */
  onPreview: (activity: Activity) => void
  /** Hydrate the edit form from a record (parent also scrolls to the form). */
  onEdit: (record: StoredUserActivity) => void
  /** Ask the parent to confirm + perform deletion. */
  onRequestDelete: (id: string) => void
}

/**
 * "Mes activités ajoutées" — the list of the user's own activities below the
 * add/edit form. Each row previews, edits (hydrates the form) or deletes. Hidden
 * when there are none.
 */
export function StoredActivityList({
  stored,
  userActivities,
  onPreview,
  onEdit,
  onRequestDelete,
}: StoredActivityListProps) {
  if (stored.length === 0) return null
  return (
    <div style={{ marginTop: 36 }}>
      <h2 className="m-0 font-sans" style={{ fontSize: 18, fontWeight: 800 }}>
        Mes activités ajoutées
      </h2>
      <div className="flex flex-col" style={{ gap: 6, marginTop: 12 }}>
        {stored.map((record) => {
          const runtime = userActivities.find((a) => a.id === record.id)
          const preview = runtime?.photoUrls?.[0] ?? '/photos/hero.jpg'
          return (
            <div
              key={record.id}
              className="flex items-center font-sans"
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '8px 10px',
                gap: 12,
                boxShadow: '0 2px 8px -2px rgba(20,30,50,0.06)',
              }}
              data-testid={`user-activity-${record.id}`}
            >
              <button
                type="button"
                onClick={() => runtime && onPreview(runtime)}
                aria-label={`voir ${record.title}`}
                className="flex items-center cursor-pointer border-0"
                style={{
                  flex: 1,
                  minWidth: 0,
                  gap: 12,
                  background: 'transparent',
                  padding: 0,
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: `url('${cssUrlValue(preview)}') center/cover, ${YB.bgSoft}`,
                  }}
                  aria-hidden
                />
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: YB.ink }}>
                  {record.title}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onEdit(record)}
                className="font-sans cursor-pointer border-0"
                style={{ background: 'transparent', color: YB.ink, fontSize: 13, fontWeight: 700, padding: 6 }}
                aria-label={`modifier ${record.title}`}
              >
                Éditer
              </button>
              <button
                type="button"
                onClick={() => onRequestDelete(record.id)}
                className="font-sans cursor-pointer border-0"
                style={{ background: 'transparent', color: YB.coralDeep, fontSize: 13, fontWeight: 700, padding: 6 }}
                aria-label={`supprimer ${record.title}`}
              >
                Suppr.
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
