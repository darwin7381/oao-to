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
    
    // 參數驗證和清理
    const safeUserId = userId || 'unknown';
    const safeUserEmail = userEmail || 'unknown';
    const safeUserRole = userRole || 'unknown';
    const safeResourceId = resourceId || null;
    const safeOldValue = oldValue ? JSON.stringify(oldValue) : null;
    const safeNewValue = newValue ? JSON.stringify(newValue) : null;
    const safeIpAddress = request?.headers.get('cf-connecting-ip') || request?.headers.get('x-forwarded-for') || null;
    const safeUserAgent = request?.headers.get('user-agent') || null;
    
    console.log('[AuditLog] Creating log with safe params:', { 
      id, action, resourceType, userId: safeUserId, resourceId: safeResourceId 
    });
    
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
      safeUserId,
      safeUserEmail,
      safeUserRole,
      action,
      resourceType,
      safeResourceId,
      safeOldValue,
      safeNewValue,
      safeIpAddress,
      safeUserAgent,
      Date.now()
    ).run();
    
    console.log('[AuditLog] Successfully created:', id);
  } catch (error) {
    console.error('[AuditLog] Failed to log audit action:', error);
    console.error('[AuditLog] Parameters:', { userId, userEmail, userRole, action, resourceType, resourceId });
    throw error;
  }
}
