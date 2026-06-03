import { YB } from '../utils/theme.ts'
import { Plus, X } from '../icons/index.tsx'
import { Field, SmallButton } from './AddActivityFields.tsx'
import { inputStyle } from './addActivityStyles.ts'
import { cssUrlValue } from '../utils/photoUrl.ts'
import type { PhotoItem } from '../hooks/useAddActivityForm.ts'

/**
 * Photo picker: thumbnail previews (first = HERO, each removable) + a gallery
 * file input + a paste-URL input with its validation error. Pure
 * presentational — all state lives in useAddActivityForm.
 */
export function PhotoPickerPanel({
  photos,
  urlInput,
  urlError,
  onAddFiles,
  onRemovePhoto,
  onUrlInputChange,
  onAddUrlPhoto,
}: {
  photos: PhotoItem[]
  urlInput: string
  urlError: string
  onAddFiles: (files: FileList | null) => void
  onRemovePhoto: (idx: number) => void
  onUrlInputChange: (v: string) => void
  onAddUrlPhoto: () => void
}) {
  return (
    <Field label="Photos">
      {photos.length > 0 && (
        <div className="flex flex-wrap" style={{ gap: 8, marginBottom: 10 }}>
          {photos.map((p, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <div
                style={{
                  width: 72,
                  height: 90,
                  borderRadius: 10,
                  background: `url('${cssUrlValue(p.preview)}') center/cover, ${YB.bgSoft}`,
                  border: i === 0 ? `2px solid ${YB.coral}` : '2px solid transparent',
                }}
                aria-label={i === 0 ? 'photo principale' : `photo ${i + 1}`}
              />
              {i === 0 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    left: 4,
                    fontSize: 9,
                    fontWeight: 800,
                    color: '#fff',
                    background: YB.coral,
                    borderRadius: 6,
                    padding: '1px 4px',
                  }}
                >
                  HERO
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemovePhoto(i)}
                aria-label={`supprimer la photo ${i + 1}`}
                className="inline-flex items-center justify-center border-0 cursor-pointer"
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: 99,
                  background: YB.ink,
                  padding: 0,
                  boxShadow: '0 2px 6px -1px rgba(20,30,50,0.3)',
                }}
              >
                <X color="#fff" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label
        className="inline-flex items-center font-sans cursor-pointer"
        style={{
          gap: 6,
          height: 60,
          background: '#fff',
          border: `1px solid ${YB.bgSoft}`,
          borderRadius: 14,
          padding: '0 18px',
          fontSize: 14,
          fontWeight: 700,
          color: YB.ink,
          marginBottom: 8,
        }}
      >
        <Plus color={YB.ink} size={16} />
        Galerie
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            onAddFiles(e.target.files)
            e.target.value = ''
          }}
          aria-label="ajouter des photos depuis la galerie"
          style={{ display: 'none' }}
        />
      </label>
      <div className="flex" style={{ gap: 8 }}>
        <input
          type="url"
          value={urlInput}
          onChange={(e) => onUrlInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAddUrlPhoto()
            }
          }}
          placeholder="…ou coller une URL d’image"
          aria-label="coller une url d’image"
          style={{ ...inputStyle, flex: 1 }}
        />
        <SmallButton onClick={onAddUrlPhoto} label="Ajouter" />
      </div>
      {urlError && (
        <p role="alert" style={{ color: YB.coralDeep, fontSize: 12, marginTop: 6 }}>
          {urlError}
        </p>
      )}
    </Field>
  )
}
