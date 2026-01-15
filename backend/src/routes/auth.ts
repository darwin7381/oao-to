// Google OAuth 認證路由

import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import type { Env } from '../types';

const auth = new Hono<{ Bindings: Env }>();

// 開始 Google OAuth 流程
auth.get('/google', (c) => {
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', c.env.GOOGLE_REDIRECT_URI);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'email profile');
  
  return c.redirect(googleAuthUrl.toString());
});

// Google OAuth 回調
auth.get('/google/callback', async (c) => {
  const code = c.req.query('code');
  
  if (!code) {
    return c.json({ error: 'No authorization code' }, 400);
  }

  try {
    // 1. 換取 access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: c.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json() as any;
    
    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // 2. 獲取用戶資訊
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userResponse.json() as any;

    // 3. 檢查或創建用戶
    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(userData.email).first() as any;

    if (!user) {
      // 創建新用戶
      const userId = crypto.randomUUID();
      await c.env.DB.prepare(
        'INSERT INTO users (id, email, name, avatar, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        userId,
        userData.email,
        userData.name,
        userData.picture,
        Date.now()
      ).run();

      user = { id: userId, email: userData.email, name: userData.name };
    }

    // 4. 生成 JWT
    const token = await sign(
      {
        userId: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30), // 30 天
      },
      c.env.JWT_SECRET
    );

    // 5. 重定向到前端，帶上 token
    return c.redirect(`https://oao.to/auth/callback?token=${token}`);
  } catch (error) {
    console.error('OAuth error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

// 驗證當前用戶
auth.get('/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const token = authHeader.substring(7);
    const payload = await import('hono/jwt').then(m => m.verify(token, c.env.JWT_SECRET));
    
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, avatar FROM users WHERE id = ?'
    ).bind((payload as any).userId).first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(user);
  } catch (error) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

export default auth;

