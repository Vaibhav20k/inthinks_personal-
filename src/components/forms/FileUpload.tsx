import { useRef, useState } from 'react'

export interface StagedFile {
  name: string
  size: number
  type: string
}

interface Props {
  files: StagedFile[]
  onChange: (files: StagedFile[]) => void
  hint?: string
}

const MAX_MB = 25

function readable(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Drag-and-drop evidence upload.
 *
 * Files are staged in the browser only — nothing is transmitted, because there
 * is no upload endpoint yet. The list records name, size and type so the rest
 * of the flow behaves correctly; the page states plainly that submission is
 * not connected.
 */
export default function FileUpload({ files, onChange, hint }: Props) {
  const [over, setOver] = useState(false)
  const [rejected, setRejected] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = (list: FileList | null) => {
    if (!list) return
    const next: StagedFile[] = []
    const bad: string[] = []
    for (const file of Array.from(list)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        bad.push(`${file.name} — over ${MAX_MB} MB`)
        continue
      }
      if (files.some((f) => f.name === file.name && f.size === file.size)) continue
      next.push({ name: file.name, size: file.size, type: file.type || 'unknown' })
    }
    setRejected(bad)
    if (next.length) onChange([...files, ...next])
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          accept(e.dataTransfer.files)
        }}
        className="p-8 text-center transition-colors duration-250"
        style={{
          border: `1px dashed ${over ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
          background: over ? 'color-mix(in oklab, var(--color-accent) 5%, transparent)' : 'transparent',
        }}
      >
        <p className="text-[0.9375rem] font-medium">Drag files here</p>
        <p className="mt-1.5 text-[0.8125rem]" style={{ color: 'var(--color-muted)' }}>
          {hint ?? `Photographs, reports, test results, papers, drawings, CAD, video. Up to ${MAX_MB} MB each.`}
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="label mt-5 px-4 py-2.5 transition-colors duration-250 hover:border-accent"
          style={{ border: '1px solid var(--rule-strong)' }}
        >
          CHOOSE FILES
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => {
            accept(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {rejected.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1">
          {rejected.map((r) => (
            <li key={r} className="label" style={{ color: 'var(--color-accent-deep)' }}>{r}</li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="mt-5">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.size}`}
              className="flex items-center justify-between gap-4 py-3"
              style={{ borderTop: '1px solid var(--rule)' }}
            >
              <span className="min-w-0 flex-1 truncate text-[0.875rem]">{file.name}</span>
              <span className="label shrink-0" style={{ color: 'var(--color-faint)' }}>
                {readable(file.size)}
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((f) => f !== file))}
                className="label shrink-0 transition-colors duration-250 hover:text-accent"
                style={{ color: 'var(--color-muted)' }}
              >
                REMOVE
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
