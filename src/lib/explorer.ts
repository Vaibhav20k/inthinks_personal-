import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Explorer state lives in the URL.
 *
 * Filters and a search box are the two things a person wants to send someone
 * else — "look at the TRL 7-9 clean-tech ones" is a link or it is a paragraph
 * of instructions. Keeping the state in `useSearchParams` also means the back
 * button undoes a filter, which is what every reader expects it to do and what
 * component state cannot give them.
 *
 * Lists are comma-joined rather than repeated keys: `?trl=4-6,7-9` reads as
 * something a person could edit by hand, and `?trl=4-6&trl=7-9` does not.
 */
export function useExplorerState(keys: readonly string[]) {
  const [params, setParams] = useSearchParams()

  const write = useCallback(
    (next: URLSearchParams) => {
      // `replace`, so typing four characters into search does not put four
      // entries in the history and make the back button useless.
      setParams(next, { replace: true })
    },
    [setParams],
  )

  const list = useCallback(
    (key: string) => {
      const raw = params.get(key)
      return raw ? raw.split(',').filter(Boolean) : []
    },
    [params],
  )

  const text = useCallback((key: string) => params.get(key) ?? '', [params])

  const setList = useCallback(
    (key: string, values: string[]) => {
      const next = new URLSearchParams(params)
      if (values.length === 0) next.delete(key)
      else next.set(key, values.join(','))
      write(next)
    },
    [params, write],
  )

  const toggle = useCallback(
    (key: string, value: string) => {
      const current = params.get(key)?.split(',').filter(Boolean) ?? []
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      setList(key, next)
    },
    [params, setList],
  )

  const setText = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params)
      if (value.trim() === '') next.delete(key)
      else next.set(key, value)
      write(next)
    },
    [params, write],
  )

  const clear = useCallback(() => {
    const next = new URLSearchParams(params)
    for (const k of keys) next.delete(k)
    write(next)
  }, [keys, params, write])

  /** How many filters are on. Search is not a filter — it has its own control. */
  const activeCount = useMemo(
    () => keys.reduce((n, k) => n + (params.get(k)?.split(',').filter(Boolean).length ?? 0), 0),
    [keys, params],
  )

  return { list, text, setList, toggle, setText, clear, activeCount }
}

/**
 * Search across a record's text.
 *
 * Every word has to appear somewhere in the record, in any field and any
 * order — "heat steel" finds a furnace problem in the steel sector without
 * either word being adjacent to the other. Deliberately not fuzzy: a reader
 * who types a reference number wants that record, not five that resemble it.
 */
const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

export function searchMatches(query: string, fields: (string | undefined)[]) {
  const terms = normalise(query).split(' ').filter(Boolean)
  if (terms.length === 0) return true
  const hay = normalise(fields.filter(Boolean).join(' '))
  return terms.every((t) => hay.includes(t))
}
