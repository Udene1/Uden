import { logEvent } from './observability';

export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';
export type Permission = 'graph:execute' | 'graph:resume' | 'graph:read' | 'settings:write' | 'audit:read';

const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  owner: ['graph:execute','graph:resume','graph:read','settings:write','audit:read'],
  admin: ['graph:execute','graph:resume','graph:read','settings:write','audit:read'],
  member: ['graph:execute','graph:resume','graph:read'],
  viewer: ['graph:read'],
};

export async function hasPermission(db: D1Database, tenantId: string, permission: Permission, subject = 'tenant-api-key'): Promise<boolean> {
  const row = await db.prepare('SELECT role FROM tenant_members WHERE tenant_id=? AND subject=?').bind(tenantId, subject).first<{role: TenantRole}>();
  const role = row?.role || 'owner';
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export async function requirePermission(db: D1Database, tenantId: string, permission: Permission, subject?: string): Promise<void> {
  if (!(await hasPermission(db, tenantId, permission, subject))) throw new Error('Forbidden');
}

export async function writeAudit(db: D1Database, tenantId: string, action: string, resourceType: string, resourceId?: string, subject = 'tenant-api-key', requestId?: string, metadata?: Record<string, unknown>): Promise<void> {
  await db.prepare(`INSERT INTO audit_logs (id,tenant_id,subject,action,resource_type,resource_id,request_id,metadata_json) VALUES (?,?,?,?,?,?,?,?)`)
    .bind(crypto.randomUUID(), tenantId, subject, action, resourceType, resourceId || null, requestId || null, metadata ? JSON.stringify(metadata) : null).run();
  logEvent('audit', { tenantId, subject, action, resourceType, resourceId, requestId });
}

export async function listAuditLogs(db: D1Database, tenantId: string, limit = 100, offset = 0) {
  const result = await db.prepare(`SELECT id,subject,action,resource_type,resource_id,request_id,metadata_json,created_at FROM audit_logs WHERE tenant_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(tenantId, limit, offset).all();
  return result.results || [];
}
