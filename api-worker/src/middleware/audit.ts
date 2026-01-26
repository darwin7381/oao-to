// Audit Logging Middleware
// 自動記錄所有 Admin 操作

import { Context } from 'hono';
import type { Env } from '../types';

export async function logAuditAction(
  env: Env,
  userId: string,
  userEmail: string,
  userRole: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  oldValue?: any,
  newValue?: any,
  request?: Request
) {
  try {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await env.DB.prepare(`
      INSERT INTO audit_logs (
        id, user_id, user_email, user_role,
        action, resource_type, resource_id,
        old_value, new_value,
        ip_address, user_agent,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      userId,
      userEmail,
      userRole,
      action,
      resourceType,
      resourceId || null,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      request?.headers.get('cf-connecting-ip') || request?.headers.get('x-forwarded-for') || null,
      request?.headers.get('user-agent') || null,
      Date.now()
    ).run();
  } catch (error) {
    console.error('Failed to log audit action:', error);
    // 不影響主業務流程
  }
}
