// Google OAuth 認證路由

import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import type { Env } from '../types';

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
      // 現有用戶：如果在超級管理員列表中，自動升級
      if (shouldBeSuperAdmin && user.role !== 'superadmin') {
        console.log('[OAuth] Upgrading user to superadmin:', userData.email);
        
        await c.env.DB.prepare(
          'UPDATE users SET role = ?, updated_at = ? WHERE id = ?'
        ).bind('superadmin', Date.now(), user.id).run();
        
        user.role = 'superadmin';
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
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // 30 天
      },
      c.env.JWT_SECRET,
      'HS256'
    );

    // 5. 重定向到前端，帶上 token
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('OAuth error:', error);
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:5173';
    return c.redirect(`${frontendUrl}/?error=auth_failed`);
  }
});

// 驗證當前用戶
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  
  console.log('[/me] Authorization header:', authHeader ? 'EXISTS' : 'MISSING');
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('[/me] Invalid auth header format');
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const token = authHeader.substring(7);
    console.log('[/me] Token length:', token.length);
    console.log('[/me] JWT_SECRET exists:', !!c.env.JWT_SECRET);
    
    const { verify } = await import('hono/jwt');
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as any;
    
    console.log('[/me] Token verified, userId:', payload.userId);
    
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, avatar, role FROM users WHERE id = ?'
    ).bind(payload.userId).first();

    console.log('[/me] User from DB:', user ? 'FOUND' : 'NOT FOUND');

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  } catch (error) {
    console.error('[/me] Error:', error);
    return c.json({ error: 'Invalid token', details: String(error) }, 401);
  }
});

export default auth;

