import { bodyObject, emailValue, reply, textValue } from './access-http'
import type { Participant } from './participant-auth'

export async function membership(db: D1Database, organization: string, email: string) {
  return db.prepare('SELECT role FROM memberships WHERE organization_id=? AND email=? AND active=1')
    .bind(organization,email).first<{role:'owner'|'contributor'}>()
}
export async function organizationRoutes(request: Request, db: D1Database, user: Participant, path: string) {
  if (path === '/organizations' && request.method === 'GET') {
    const rows = await db.prepare(`SELECT o.id,o.name,m.role FROM organizations o JOIN memberships m ON m.organization_id=o.id
      WHERE m.email=? AND m.active=1 ORDER BY o.created_at`).bind(user.email).all()
    return reply({ items:rows.results })
  }
  if (path === '/organizations' && request.method === 'POST') {
    const body = await bodyObject(request); const name = textValue(body?.name)
    if (!name) return reply({error:'Organization name is required.'},422)
    const count = await db.prepare("SELECT COUNT(*) n FROM memberships WHERE email=? AND role='owner'").bind(user.email).first<{n:number}>()
    if ((count?.n ?? 0) >= 10) return reply({error:'Organization limit reached. Contact InThinks.'},409)
    const id = crypto.randomUUID()
    await db.batch([
      db.prepare('INSERT INTO organizations(id,name,created_at) VALUES (?,?,?)').bind(id,name,new Date().toISOString()),
      db.prepare("INSERT INTO memberships(organization_id,email,role) VALUES (?,?,'owner')").bind(id,user.email),
    ])
    return reply({id,name,role:'owner'},201)
  }
  if (path === '/invitations' && request.method === 'GET') {
    const rows = await db.prepare(`SELECT i.id,o.name FROM organization_invitations i JOIN organizations o ON o.id=i.organization_id
      WHERE i.email=? AND i.accepted_at IS NULL AND i.expires_at>?`).bind(user.email,new Date().toISOString()).all()
    return reply({items:rows.results})
  }
  const accept = path.match(/^\/invitations\/([a-f0-9-]{36})\/accept$/)
  if (accept && request.method === 'POST') {
    const invitation = await db.prepare(`SELECT organization_id FROM organization_invitations WHERE id=? AND email=?
      AND accepted_at IS NULL AND expires_at>?`).bind(accept[1],user.email,new Date().toISOString()).first<{organization_id:string}>()
    if (!invitation) return reply({error:'Invitation not found.'},404)
    const accepted = await db.batch([
      db.prepare(`INSERT INTO memberships(organization_id,email,role)
        SELECT organization_id,email,'contributor' FROM organization_invitations
        WHERE id=? AND email=? AND accepted_at IS NULL AND expires_at>?
        ON CONFLICT(organization_id,email) DO UPDATE SET active=1`).bind(accept[1],user.email,new Date().toISOString()),
      db.prepare('UPDATE organization_invitations SET accepted_at=? WHERE id=?').bind(new Date().toISOString(),accept[1]),
    ])
    return accepted[0].meta.changes ? reply({ok:true}) : reply({error:'Invitation no longer available.'},404)
  }
  const match = path.match(/^\/organizations\/([a-f0-9-]{36})\/members(?:\/([^/]+))?$/)
  if (!match) return null
  const org = match[1]
  if ((await membership(db,org,user.email))?.role !== 'owner') return reply({error:'Not found.'},404)
  if (request.method === 'GET' && !match[2]) {
    const members = await db.prepare('SELECT email,role,active FROM memberships WHERE organization_id=?').bind(org).all()
    return reply({items:members.results})
  }
  if (request.method === 'POST' && !match[2]) {
    const body = await bodyObject(request); const email = emailValue(body?.email)
    if (!email || email === user.email) return reply({error:'Enter another member’s email.'},422)
    const id = crypto.randomUUID()
    await db.prepare(`INSERT INTO organization_invitations(id,organization_id,email,invited_by,expires_at) VALUES (?,?,?,?,?)
      ON CONFLICT(organization_id,email) DO UPDATE SET id=excluded.id,invited_by=excluded.invited_by,expires_at=excluded.expires_at,accepted_at=NULL`)
      .bind(id,org,email,user.email,new Date(Date.now()+604_800_000).toISOString()).run()
    return reply({ok:true,message:'Invitation is available when this person verifies their email and opens My submissions.'},201)
  }
  if (request.method === 'DELETE' && match[2]) {
    const email = emailValue(decodeURIComponent(match[2]))
    if (!email) return reply({error:'Invalid member.'},422)
    // Owners cannot revoke other owners or themselves through the contributor route.
    const target = await db.prepare('SELECT role FROM memberships WHERE organization_id=? AND email=?').bind(org,email).first<{role:string}>()
    if (target?.role === 'owner') return reply({error:'Owner removal requires an ownership transfer.'},409)
    await db.batch([
      db.prepare("UPDATE memberships SET active=0 WHERE organization_id=? AND email=? AND role='contributor'").bind(org,email),
      db.prepare('DELETE FROM organization_invitations WHERE organization_id=? AND email=?').bind(org,email),
      db.prepare('DELETE FROM case_grants WHERE email=? AND reference IN (SELECT reference FROM case_records WHERE organization_id=?)').bind(email,org),
    ])
    return reply({ok:true})
  }
  return reply({error:'Method not allowed.'},405)
}
