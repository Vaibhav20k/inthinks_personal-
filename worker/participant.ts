import type { Env } from './types'
import { reply, sameOrigin } from './access-http'
import { participant, participantAuth } from './participant-auth'
import { organizationRoutes } from './participant-organizations'
import { recordRoutes } from './participant-records'
import { audit } from './audit'
import { ipTag } from './ratelimit'

export async function handleParticipant(request: Request, env: Env) {
  if (!['GET','HEAD'].includes(request.method) && !sameOrigin(request)) return reply({error:'Request origin not allowed.'},403)
  const path = new URL(request.url).pathname.slice('/api/participant'.length)
  const authResponse = await participantAuth(request,env,path)
  if (authResponse) return authResponse
  const user = await participant(env,request)
  if (!user) return reply({error:'Verify your email to continue.'},401)
  if (path === '/me' && request.method === 'GET') return reply(user)
  const response = await organizationRoutes(request,env.DB!,user,path)
    ?? await recordRoutes(request,env,user,path)
    ?? reply({error:'Not found.'},404)
  if (response.ok) await audit(env.DB!,{email:user.email,role:'participant'},`participant.${request.method.toLowerCase()}`,path,undefined,
    await ipTag(request.headers.get('cf-connecting-ip') ?? '0.0.0.0',env.IP_SALT))
  return response
}
