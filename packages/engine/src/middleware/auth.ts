import { Context, Next } from 'hono';
import { getTenantByApiKey } from '../db/queries';
import { getAuthSession, readSessionCookie } from '../services/auth-sessions';
import { isAllowedOrigin } from './cors';

export async function hashApiKey(key:string):Promise<string>{const data=new TextEncoder().encode(key);const hashBuffer=await crypto.subtle.digest('SHA-256',data);const hashArray=Array.from(new Uint8Array(hashBuffer));return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');}

function requiresCsrfProtection(method: string) {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

function cookieRequestHasValidOrigin(c: Context) {
  const origin = c.req.header('Origin');
  return isAllowedOrigin(origin, c.env) && origin !== new URL(c.req.url).origin;
}

export async function authMiddleware(c:Context,next:Next){
  const authHeader=c.req.header('Authorization');
  const bearer=authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const cookieToken=readSessionCookie(c.req.header('Cookie'));
  const token=bearer || cookieToken;
  if(!token)return c.json({error:'Unauthorized'},401);

  if(token.startsWith('us_')){
    if(!bearer && requiresCsrfProtection(c.req.method) && !cookieRequestHasValidOrigin(c)) return c.json({error:'CSRF validation failed'},403);
    const session=await getAuthSession(c.env.DB,token);
    if(!session)return c.json({error:'Unauthorized'},401);
    const tenant=await c.env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(session.tenant_id).first();
    if(!tenant)return c.json({error:'Unauthorized'},401);
    const membership=await c.env.DB.prepare('SELECT 1 FROM tenant_members WHERE tenant_id=? AND subject=? LIMIT 1').bind(session.tenant_id,session.subject).first();
    if(!membership)return c.json({error:'Unauthorized'},401);
    c.set('tenant',tenant); c.set('tenantId',session.tenant_id); c.set('executionPrincipal',session.subject);
    await next(); return;
  }

  const hash=await hashApiKey(token);
  const tenant=await getTenantByApiKey(c.env.DB,hash);
  if(!tenant)return c.json({error:'Unauthorized'},401);
  c.set('tenant',tenant); c.set('tenantId',tenant.id); c.set('executionPrincipal',`api-key:${hash.slice(0,24)}`);
  await next();
}