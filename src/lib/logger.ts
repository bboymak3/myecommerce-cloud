import type { Env } from '../types';

export async function logActivity(
  db: D1Database,
  data: {
    adminId?: string;
    adminUsername: string;
    action: string;
    entityType?: string;
    entityId?: string;
    details?: object;
    ip?: string;
  }
): Promise<void> {
  await db.prepare(
    `INSERT INTO activity_log (admin_id, admin_username, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    data.adminId || '',
    data.adminUsername,
    data.action,
    data.entityType || '',
    data.entityId || '',
    JSON.stringify(data.details || {}),
    data.ip || ''
  ).run();
}

export function getNow(): string {
  return new Date().toISOString();
}