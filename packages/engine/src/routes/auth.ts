import { Hono } from 'hono';
import { HonoEnv } from '../types';
import { createTenant, getTenantById, revokeAuthSession } from '../db/queries';
import { hashApiKey } from '../middleware/auth';
import { Tenant } from '@ai-work-partner/shared';

const SESSION_DAYS = 30;

function encode(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)); }
function decode(value: string): Uint8Array { return Uint8Array.from(atob(value), c => c.charCodeAt(0)); }

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
  return encode(new Uint8Array(bits));
}
async function createSession(db: D1Database, tenantId: string): Promise<string> {
  const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); const token = encode(bytes);
  const tokenHash = await hashApiKey(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
  await db.prepare('INSERT INTO auth_sessions (id, tenant_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), tenantId, tokenHash, expires).run();
  return token;
}

export const authRoutes = new Hono<HonoEnv>();

authRoutes.post('/register', async c => {
  const body=await c.req.json().catch(()=>({}));
  const email=String(body.email||'').trim().toLowerCase();
  const password=String(body.password||'');
  const name=String(body.name||'').trim();
  if(!name)return c.json({error:'Name is required'},400);
  if(!email||!email.includes('@'))return c.json({error:'A valid email is required'},400);
  if(password.length<8)return c.json({error:'Password must be at least 8 characters'},400);
  const existing=await c.env.DB.prepare('SELECT id FROM tenants WHERE lower(email)=? LIMIT 1').bind(email).first<any>();
  if(existing)return c.json({error:'An account already exists for this email'},409);
  const tenant:Tenant={id:crypto.randomUUID(),name,email,apiKeyHash:await hashApiKey(`sk_${crypto.randomUUID().replace(/-/g,'')}`),qualityPreference:'balanced',monthlyBudgetCents:10000,defaultMode:'permissionless',bringOwnKeys:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  const salt=new Uint8Array(16); crypto.getRandomValues(salt);
  const passwordHash=await hashPassword(password,salt);
  await createTenant(c.env.DB,tenant);
  await c.env.DB.prepare('INSERT INTO auth_credentials (tenant_id,password_salt,password_hash) VALUES (?,?,?)').bind(tenant.id,encode(salt),passwordHash).run();
  const token=await createSession(c.env.DB,tenant.id);
  return c.json({session_token:token,tenant:{id:tenant.id,name:tenant.name,email:tenant.email}},201);
});

authRoutes.post('/login', async c => {
  const body=await c.req.json().catch(()=>({}));
  const email=String(body.email||'').trim().toLowerCase(); const password=String(body.password||'');
  const row=await c.env.DB.prepare('SELECT t.*, c.password_salt, c.password_hash FROM tenants t JOIN auth_credentials c ON c.tenant_id=t.id WHERE lower(t.email)=? LIMIT 1').bind(email).first<any>();
  if(!row)return c.json({error:'Invalid email or password'},401);
  const actual=await hashPassword(password,decode(row.password_salt));
  if(actual!==row.password_hash)return c.json({error:'Invalid email or password'},401);
  const token=await createSession(c.env.DB,row.id);
  return c.json({session_token:token,tenant:{id:row.id,name:row.name,email:row.email||''}});
});

authRoutes.get('/me', async c => {
  const tenant=await getTenantById(c.env.DB,c.get('tenantId'));
  if(!tenant)return c.json({error:'Unauthorized'},401);
  return c.json({tenant});
});

authRoutes.post('/logout', async c => {
  const header=c.req.header('Authorization');
  if(header?.startsWith('Bearer '))await revokeAuthSession(c.env.DB,await hashApiKey(header.slice(7).trim()));
  return c.json({success:true});
});
