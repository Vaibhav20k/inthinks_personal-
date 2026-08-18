import { useCallback, useEffect, useState } from 'react'

/**
 * Autosaving form draft.
 *
 * Both submission flows are long, and losing a half-finished challenge or
 * innovation is the fastest way to lose the submission entirely. State is
 * mirrored into localStorage on every change and restored on mount.
 */
export function useDraft<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? { ...initial, ...(JSON.parse(stored) as T) } : initial
    } catch {
      return initial
    }
  })
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      setSavedAt(Date.now())
    } catch {
      /* storage unavailable (private mode, quota) — the form still works */
    }
  }, [key, value])

  const update = useCallback(
    (patch: Partial<T>) => setValue((v) => ({ ...v, ...patch })),
    [],
  )

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      /* ignore */
    }
    setValue(initial)
    // `initial` is a module-level constant in both call sites, so leaving it
    // out of the deps keeps this callback stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { value, update, clear, savedAt }
}
