// JWT 認證中介層

import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Env, JWTPayload } from '../types';
import { isAllowedOrigin } from '../config/origins';

// 從 JWT payload 取得用戶資訊
export function getUserFromContext(c: Context): JWTPayload {
  return c.get('jwtPayload') as JWTPayload;
}

/**
 * 要求用戶登入的 Middleware
 * 驗證 JWT token 並設置用戶資訊到 context
 */
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  // cookie-only：JWT 只從 httpOnly cookie 讀，不再接受 Authorization: Bearer。
  // 這強制所有舊 Bearer token 失效（force re-login），並徹底避免 token 在 header/URL 流動。
  // 註：/v1 對外 API 走另一個 middleware（verifyApiKey）用 API key，不受此影響。
  const token = getCookie(c, 'token');

  if (!token) {
    return c.json({ error: 'Unauthorized', message: 'Missing or invalid authorization' }, 401);
  }

  // CSRF 防護：只在「有 cookie」時才相關（cookie 會被瀏覽器自動帶上、含跨站 → CSRF 攻擊面）。
  // state-changing 請求（非 GET/HEAD）必須驗證 Origin 來自允許的前端；瀏覽器一定帶 Origin
  // 且攻擊者無法偽造，惡意站台的 Origin 不在白名單 → 擋。無 cookie 的請求在上面就 401 了。
  // 註：Stripe webhook 走簽名驗證（不經 requireAuth）、/v1 走 API key，皆不受影響。
  const method = c.req.method.toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    // 用與 CORS 同一份 ALLOWED_ORIGINS，兩者一致、不會漏掉 app.oao.to
    if (!isAllowedOrigin(c.req.header('Origin'))) {
      return c.json({ error: 'Forbidden', message: 'CSRF check failed: invalid origin' }, 403);
    }
  }

  let payload: JWTPayload;
  try {
    const { verify } = await import('hono/jwt');
    payload = await verify(token, c.env.JWT_SECRET, 'HS256') as JWTPayload;
  } catch (error) {
    return c.json({ error: 'Unauthorized', message: 'Invalid or expired token' }, 401);
  }

  // 角色再驗證：JWT 內的 role 可能已過時（例如 admin 被降級），
  // 用一次 indexed 查詢（users PK）拿 DB 當前 role 為準；
  // DB 查詢失敗時 fallback 回 JWT role（不因暫時性錯誤擋住合法用戶）。
  // 這關掉了「被降級的 admin 仍持有舊 token 存取 N 天」的漏洞。
  let effectiveRole = payload.role;
  try {
    const row = await c.env.DB.prepare(
      'SELECT role FROM users WHERE id = ?'
    ).bind(payload.userId).first<{ role: JWTPayload['role'] }>();

    if (!row) {
      // 帳號已刪除 → 拒絕存取
      return c.json({ error: 'Unauthorized', message: 'Account not found' }, 401);
    }

    effectiveRole = row.role;
  } catch (error) {
    console.error('[requireAuth] role re-verification DB error, falling back to JWT role:', error);
  }

  // 設置到 context（userRole 用 DB 當前值，不是 JWT 內可能過時的值）
  c.set('jwtPayload', payload);
  c.set('userId', payload.userId);
  c.set('userEmail', payload.email);
  c.set('userRole', effectiveRole);

  await next();
}