// 角色權限中介層

import { Context, Next } from 'hono';
import type { Env, UserRole, JWTPayload } from '../types';

// 檢查用戶是否有指定角色
export function requireRole(...allowedRoles: UserRole[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const jwtPayload = c.get('jwtPayload') as JWTPayload;

    if (!jwtPayload) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 一律用 requireAuth 針對 DB 重驗過的 userRole（effectiveRole），
    // 不用 JWT 內的 role — 否則被降權的 admin 在 token 有效期內（7 天）仍可過關
    const userRole = (c.get('userRole') as UserRole) || jwtPayload.role;

    if (!allowedRoles.includes(userRole)) {
      return c.json({ 
        error: 'Forbidden',
        message: `需要角色: ${allowedRoles.join(' 或 ')}，您的角色: ${userRole}`
      }, 403);
    }

    await next();
  };
}

// 檢查是否為管理員（admin 或 superadmin）
export function requireAdmin() {
  return requireRole('admin', 'superadmin');
}

// 檢查是否為超級管理員
export function requireSuperAdmin() {
  return requireRole('superadmin');
}

// 角色權限層級
export const ROLE_HIERARCHY = {
  user: 0,
  admin: 1,
  superadmin: 2,
};

// 檢查角色是否有足夠權限
export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}


