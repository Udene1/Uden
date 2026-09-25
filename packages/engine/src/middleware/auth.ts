import { Context, Next } from 'hono';
import { getTenantByApiKey, getTenantBySessionTokenHash, touchAuthSession } from '../db/queries';

export async function hashApiKey(key:string):Promise<string>{
  const data=new TextEncoder().encode(key); const hashBuffer=await crypto.subtle.digest('SHA-256',data);
  const hashArray=Array.from(new Uint8Array(hashBuffer)); return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
}

export async function authMiddleware(c:Context,next:Next){
  const authHeader=c.req.header('Authorization');
  if(!authHeader||!authHeader.startsWith('Bearer '))return c.json({error:'Unauthorized'},401);
  const token=authHeader.slice(7).trim(); if(!token)return c.json({error:'Unauthorized'},401);
  const hash=await hashApiKey(token);
  const tenant=await getTenantByApiKey(c.env.DB,hash);
  if(tenant){
    c.set('tenant',tenant); c.set('tenantId',tenant.id); c.set('executionPrincipal',`api-key:${hash.slice(0,24)}`); await next(); return;
  }
  const sessionTenant=await getTenantBySessionTokenHash(c.env.DB,hash);
  if(!sessionTenant)return c.json({error:'Unauthorized'},401);
  await touchAuthSession(c.env.DB,hash);
  c.set('tenant',sessionTenant); c.set('tenantId',sessionTenant.id); c.set('executionPrincipal',`session:${hash.slice(0,24)}`);
  await next();
}
