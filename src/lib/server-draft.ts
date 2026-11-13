import { participantApi } from './participant'

/**
 * Server copy of a submission draft, for verified participants.
 *
 * The browser draft (lib/draft.ts) stays the working copy; this saves it to
 * the account on request so it survives another device or a cleared browser.
 * The id and version of the open server draft live in sessionStorage.
 */
export type DraftKind = 'challenge' | 'innovation'
interface Handle { id: string; version: number }
const key = (kind: DraftKind) => `inthinks.${kind}.server-draft`

function read(kind: DraftKind): Handle | null {
  try { const v = sessionStorage.getItem(key(kind)); return v ? JSON.parse(v) as Handle : null } catch { return null }
}
function write(kind: DraftKind, handle: Handle | null) {
  try { if (handle) sessionStorage.setItem(key(kind), JSON.stringify(handle)); else sessionStorage.removeItem(key(kind)) } catch { /* in-memory only */ }
}

export async function saveServerDraft(kind: DraftKind, payload: object, organizationId: string) {
  const handle = read(kind)
  const body = { kind, payload, organizationId: organizationId || null }
  const saved = handle
    ? await participantApi<Handle>(`/drafts/${handle.id}`, { ...body, version: handle.version }, 'PUT')
    : await participantApi<Handle>('/drafts', body)
  write(kind, saved)
  return saved
}

export async function openServerDraft(kind: DraftKind, id: string) {
  const draft = await participantApi<{ id: string; kind: string; version: number; payload: Record<string, unknown> }>(`/drafts/${id}`)
  if (draft.kind !== kind) throw new Error('That draft belongs to the other form.')
  write(kind, { id: draft.id, version: draft.version })
  return draft.payload
}

/** After a confirmed submission: the server draft has served its purpose. */
export async function discardServerDraft(kind: DraftKind) {
  const handle = read(kind)
  write(kind, null)
  if (handle) await participantApi(`/drafts/${handle.id}`, undefined, 'DELETE').catch(() => undefined)
}
