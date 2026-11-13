export interface Organization { id:string;name:string;role:'owner'|'contributor' }
export const ORGANIZATION_KEY = 'inthinks.active-organization'
export function activeOrganization() { try { return sessionStorage.getItem(ORGANIZATION_KEY) ?? '' } catch { return '' } }
export function chooseOrganization(id:string) { try { sessionStorage.setItem(ORGANIZATION_KEY,id) } catch { /* server still validates */ } }
export async function participantApi<T>(path:string, body?:unknown, method = body === undefined ? 'GET' : 'POST'):Promise<T> {
  const response = await fetch(`/api/participant${path}`,{method,headers:body === undefined ? {} : {'content-type':'application/json'},body:body === undefined ? undefined : JSON.stringify(body)})
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Request failed')
  return data as T
}
