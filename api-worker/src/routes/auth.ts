// Google OAuth 認證路由

import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { Env } from '../types';
import { isAllowedOrigin } from '../config/origins';

// JWT / cookie 有效期：7 天（原本 30 天，縮短以降低失竊 token 的暴露窗口）
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

const auth = new Hono<{ Bindings: Env }>();

// 開始 Google OAuth 流程
auth.get('/google', (c) => {
  // 在代碼中構建完整的 redirect URI
  const apiUrl = c.env.API_URL || 'http://localhost:8788';
  const redirectUri = `${apiUrl}/api/auth/google/callback`;
  
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  
  console.log('[OAuth] Redirect URI:', redirectUri);
  
  return c.redirect(googleAuthUrl.toString());
});

// Google OAuth 回調
auth.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  
  // 處理用戶拒絕授權
  if (error) {
    console.error('OAuth error from Google:', error);
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/?error=access_denied`);
  }
  
  if (!code) {
    return c.json({ error: 'No authorization code' }, 400);
  }

  try {
    // 構建完整的 redirect URI（與發起 OAuth 時相同）
    const apiUrl = c.env.API_URL || 'http://localhost:8788';
    const redirectUri = `${apiUrl}/api/auth/google/callback`;
    
    console.log('[OAuth Callback] Exchange code for token, redirect_uri:', redirectUri);
    
    // 1. 換取 access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenResponse.json() as any;
    
    if (!tokenData.access_token) {
      console.error('Google token response:', JSON.stringify(tokenData, null, 2));
      console.error('Token request failed. Status:', tokenResponse.status);
      throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error || 'Unknown error'}`);
    }

    // 2. 獲取用戶資訊
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json() as any;

    // 3. 檢查或創建用戶
    let user = await c.env.DB.prepare(
      'SELECT id, email, name, avatar, role FROM users WHERE email = ?'
    ).bind(userData.email).first() as any;

    // 檢查是否為超級管理員
    const superAdminEmails = c.env.SUPERADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const shouldBeSuperAdmin = superAdminEmails.includes(userData.email);

    if (!user) {
      // 創建新用戶
      const userId = crypto.randomUUID();
      const role = shouldBeSuperAdmin ? 'superadmin' : 'user';
      
      console.log('[OAuth] Creating new user:', { 
        email: userData.email, 
        role,
        isSuperAdmin: shouldBeSuperAdmin 
      });
      
      await c.env.DB.prepare(
        'INSERT INTO users (id, email, name, avatar, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        userId,
        userData.email,
        userData.name,
        userData.picture,
        role,
        Date.now()
      ).run();

      // ✨ 同時創建 credits 記錄（100 credits 歡迎獎勵）
      const now = Date.now();
      const nextMonthStart = new Date();
      nextMonthStart.setMonth(nextMonthStart.getMonth() + 1, 1);
      nextMonthStart.setHours(0, 0, 0, 0);
      
      await c.env.DB.prepare(
        `INSERT INTO credits (id, user_id, balance, purchased_balance, 
         plan_type, monthly_used, monthly_reset_at, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        `credit_${userId}`,
        userId,
        100,              // 注册赠送 100 credits
        0,                // purchased_balance = 0（赠送不算购买）
        'free',           // monthly_quota 从 plans 表动态获取
        0,
        nextMonthStart.getTime(),
        now
      ).run();

      console.log('[OAuth] Created credits record for new user:', userId);

      user = { 
        id: userId, 
        email: userData.email, 
        name: userData.name,
        avatar: userData.picture,
        role
      };
    } else {
      // 現有用戶：對稱同步 SUPERADMIN_EMAILS 白名單
      if (shouldBeSuperAdmin && user.role !== 'superadmin') {
        // 在白名單 → 升級
        console.log('[OAuth] Upgrading user to superadmin:', userData.email);
        await c.env.DB.prepare(
          'UPDATE users SET role = ?, updated_at = ? WHERE id = ?'
        ).bind('superadmin', Date.now(), user.id).run();
        user.role = 'superadmin';
      } else if (!shouldBeSuperAdmin && user.role === 'superadmin') {
        // 已從白名單移除 → 降回 admin（不再靜默保留 superadmin）
        console.log('[OAuth] Downgrading former superadmin (removed from allowlist):', userData.email);
        await c.env.DB.prepare(
          'UPDATE users SET role = ?, updated_at = ? WHERE id = ?'
        ).bind('admin', Date.now(), user.id).run();
        user.role = 'admin';
      }
    }

    console.log('[OAuth] User logged in:', { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      isSuperAdmin: shouldBeSuperAdmin
    });

    // 4. 生成 JWT（包含角色資訊）
    const token = await sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS, // 7 天
      },
      c.env.JWT_SECRET,
      'HS256'
    );

    // 5. 把 token 寫進 httpOnly cookie（JS 讀不到，防 XSS 竊取）
    //    SameSite=Lax 允許 top-level 導航（OAuth redirect）帶上 cookie；
    //    Secure 只在 HTTPS 送出（本地 http://localhost 開發時瀏覽器仍接受 Secure cookie）
    // SameSite=None + Secure：前端 app.oao.to → api.oao.to 是跨子網域 fetch，
    // 用 None 才保證 cookie 一定被帶上（HTTPS 生產環境）。httpOnly 防 XSS 竊取
    setCookie(c, 'token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: TOKEN_TTL_SECONDS,
    });

    // 6. 重定向到前端（cookie-only，token 完全不進 URL）
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/auth/callback`);
  } catch (error) {
    console.error('OAuth error:', error);
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/?error=auth_failed`);
  }
});

// 驗證當前用戶
auth.get('/me', async (c) => {
  // cookie-only：只從 httpOnly cookie 讀 token（不再接受 Authorization: Bearer）
  const token = getCookie(c, 'token');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // 1. 先驗證 JWT — 失敗才是真的「未授權」（回 401，前端會登出）
  let payload: any;
  try {
    const { verify } = await import('hono/jwt');
    payload = await verify(token, c.env.JWT_SECRET, 'HS256');
  } catch {
    // 不回傳 error details，避免洩漏內部實作
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // 2. 查 DB — 若 D1 暫時失敗（cold start / 5xx）回 500 讓前端「重試」而非登出；
  //    這是「登入常出問題 / 無故被登出」的後端側修復
  try {
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, avatar, role FROM users WHERE id = ?'
    ).bind(payload.userId).first();

    if (!user) {
      // 帳號確實不存在（已刪）→ 401 讓前端登出
      return c.json({ error: 'Account not found' }, 401);
    }

    return c.json(user);
  } catch (error) {
    console.error('[/me] DB error:', error);
    return c.json({ error: 'Temporary server error, please retry' }, 500);
  }
});

// 登出：清除 httpOnly cookie
// CSRF 防護：logout 是 state-changing 且**不經 requireAuth**（過期 token 也要能登出），
// 所以 requireAuth 內的 Origin 檢查蓋不到這條 → 這裡自己擋一次。否則惡意站台可利用
// SameSite=None cookie 跨站 POST 強制把已登入使用者登出（logout CSRF）。
// 用與 CORS/requireAuth 同一份 ALLOWED_ORIGINS，來源一致不漂移。
auth.post('/logout', (c) => {
  if (!isAllowedOrigin(c.req.header('Origin'))) {
    return c.json({ error: 'Forbidden', message: 'CSRF check failed: invalid origin' }, 403);
  }
  deleteCookie(c, 'token', { path: '/', secure: true, sameSite: 'None' });
  return c.json({ success: true });
});

export default auth;

