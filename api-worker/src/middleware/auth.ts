// JWT 認證中介層

import { Context, Next } from 'hono';
import { jwt } from 'hono/jwt';
import type { Env, JWTPayload } from '../types';

export function createAuthMiddleware(secret: string) {
  return jwt({ 
    secret,
    alg: 'HS256'  // 指定演算法
  });
}

// 從 JWT payload 取得用戶資訊
export function getUserFromContext(c: Context): JWTPayload {
  return c.get('jwtPayload') as JWTPayload;
}

/**
 * 要求用戶登入的 Middleware
 * 驗證 JWT token 並設置用戶資訊到 context
 */
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid authorization header' }, 401);
  }
  
  const token = authHeader.substring(7); // 移除 "Bearer "
  
  try {
    const { verify } = await import('hono/jwt');
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as JWTPayload;
    
    // 設置到 context
    c.set('jwtPayload', payload);
    c.set('userId', payload.userId);
    c.set('userEmail', payload.email);
    c.set('userRole', payload.role);
    
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
  }
}