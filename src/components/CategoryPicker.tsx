import { Field } from './AddActivityFields.tsx'
import { inputStyle, selectStyle } from './addActivityStyles.ts'

/** Category <select> with an "Autre…" free-text fallback. Pure presentational. */
export function CategoryPicker({
  categories,
  categoryMode,
  category,
  categoryOther,
  onCategoryChange,
  onCategoryOtherChange,
}: {
  categories: string[]
  categoryMode: 'preset' | 'other'
  category: string
  categoryOther: string
  onCategoryChange: (value: string) => void
  onCategoryOtherChange: (value: string) => void
}) {
  return (
    <Field label="Catégorie">
      <select
        value={categoryMode === 'other' ? '__other__' : category}
        onChange={(e) => onCategoryChange(e.target.value)}
        aria-label="catégorie"
        style={selectStyle}
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value="__other__">Autre…</option>
      </select>
      {categoryMode === 'other' && (
        <input
          type="text"
          value={categoryOther}
          onChange={(e) => onCategoryOtherChange(e.target.value)}
          placeholder="Nom de la catégorie"
          aria-label="autre catégorie"
          style={{ ...inputStyle, marginTop: 8 }}
        />
      )}
    </Field>
  )
}
