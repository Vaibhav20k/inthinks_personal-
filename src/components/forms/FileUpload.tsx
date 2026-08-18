import { useRef, useState } from 'react'

interface Props {
  files: File[]
  onChange: (files: File[]) => void
  hint?: string
  /** False when the deployment has no object storage bound. */
  enabled?: boolean
}

const MAX_MB = 25
const MAX_FILES = 12

/** Mirrors the allow-list the Worker enforces, so rejections happen here first. */
const ALLOWED = new Set([
  'pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt', 'md',
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'tif', 'tiff', 'heic',
  'mp4', 'mov', 'webm',
  'dwg', 'dxf', 'step', 'stp', 'iges', 'igs', 'stl', 'zip',
])

function readable(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

/**
 * Drag-and-drop evidence upload.
 *
 * Holds real File objects rather than metadata, because these are uploaded on
 * submit. That is also why they are not part of the autosaved draft — a File
 * cannot be serialised into localStorage, so the form says so rather than
 * quietly losing attachments on reload.
 */
export default function FileUpload({ files, onChange, hint, enabled = true }: Props) {
  const [over, setOver] = useState(false)
  const [rejected, setRejected] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = (list: FileList | null) => {
    if (!list) return
    const next: File[] = []
    const bad: string[] = []

    for (const file of Array.from(list)) {
      if (files.length + next.length >= MAX_FILES) {
        bad.push(`${file.name} — limit is ${MAX_FILES} files`)
        continue
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        bad.push(`${file.name} — over ${MAX_MB} MB`)
        continue
      }
      if (!ALLOWED.has(extensionOf(file.name))) {
        bad.push(`${file.name} — file type not accepted`)
        continue
      }
      if (files.some((f) => f.name === file.name && f.size === file.size)) continue
      next.push(file)
    }

    setRejected(bad)
    if (next.length) onChange([...files, ...next])
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (!enabled) return
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!enabled) return
          e.preventDefault()
          setOver(false)
          accept(e.dataTransfer.files)
        }}
        className="p-8 text-center transition-colors duration-250"
        style={{
          border: `1px dashed ${over ? 'var(--color-accent)' : 'var(--rule-strong)'}`,
          background: over ? 'color-mix(in oklab, var(--color-accent) 5%, transparent)' : 'transparent',
          opacity: enabled ? 1 : 0.55,
        }}
      >
        <p className="text-[0.9375rem] font-medium">
          {enabled ? 'Drag files here' : 'File upload unavailable'}
        </p>
        <p className="mt-1.5 text-[0.8125rem]" style={{ color: 'var(--color-muted)' }}>
          {enabled
            ? (hint ?? `Photographs, reports, test results, papers, drawings, CAD, video. Up to ${MAX_MB} MB each, ${MAX_FILES} files.`)
            : 'This deployment has no file storage configured. You can still submit the written record.'}
        </p>
        <button
          type="button"
          disabled={!enabled}
          onClick={() => inputRef.current?.click()}
          className="tap label mt-5 px-4 py-2.5 transition-colors duration-250 disabled:cursor-not-allowed"
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
              key={`${file.name}-${file.size}-${file.lastModified}`}
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
                className="tap label shrink-0 transition-colors duration-250 hover:text-accent"
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
