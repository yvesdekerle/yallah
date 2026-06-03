import { memo } from 'react'
import { YB } from '../utils/theme.ts'
import { Field } from './AddActivityFields.tsx'

/**
 * Emoji-tag palette (toggle). Pure presentational + `memo`'d so editing other
 * form fields (which re-render the parent on every keystroke) doesn't re-render
 * the whole tag grid — its props (memoized palette, stable `onToggleTag`) are
 * referentially stable across unrelated edits.
 */
export const TagPickerPanel = memo(function TagPickerPanel({
  tagPalette,
  selectedTags,
  onToggleTag,
}: {
  tagPalette: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
}) {
  return (
    <Field label="Tags (emojis)">
      <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
        {tagPalette.map((tag) => {
          const on = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              aria-pressed={on}
              aria-label={`tag ${tag}`}
              className="inline-flex items-center justify-center cursor-pointer"
              style={{
                width: 40,
                height: 40,
                borderRadius: 99,
                fontSize: 19,
                lineHeight: 1,
                padding: 0,
                background: on ? YB.coral : '#fff',
                border: on ? '2px solid transparent' : `1px solid ${YB.bgSoft}`,
                boxShadow: on ? '0 4px 10px -3px rgba(255,107,71,0.5)' : 'none',
              }}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </Field>
  )
})
