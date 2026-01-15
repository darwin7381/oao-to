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

