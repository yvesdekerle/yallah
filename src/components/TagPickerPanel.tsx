import { YB } from '../utils/theme.ts'
import { Field } from './AddActivityFields.tsx'
import { inputStyle } from './addActivityStyles.ts'

/** Emoji-tag palette (toggle) + a custom-tag text input. Pure presentational. */
export function TagPickerPanel({
  tagPalette,
  selectedTags,
  tagInput,
  onTagInputChange,
  onAddTag,
  onToggleTag,
}: {
  tagPalette: string[]
  selectedTags: string[]
  tagInput: string
  onTagInputChange: (v: string) => void
  onAddTag: () => void
  onToggleTag: (tag: string) => void
}) {
  return (
    <Field label="Tags (emojis)">
      <div className="flex flex-wrap items-center" style={{ gap: 6, marginBottom: 10 }}>
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
      <input
        type="text"
        value={tagInput}
        onChange={(e) => onTagInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onAddTag()
          }
        }}
        onBlur={onAddTag}
        placeholder="Autre emoji, puis Entrée"
        aria-label="ajouter un tag personnalisé"
        style={{ ...inputStyle, width: '100%' }}
      />
    </Field>
  )
}
