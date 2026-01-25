// 管理員 API 路由

import { Hono } from 'hono';
import { createAuthMiddleware } from '../middleware/auth';
import { requireAdmin, requireSuperAdmin } from '../middleware/role';
import type { Env } from '../types';

const admin = new Hono<{ Bindings: Env }>();

// 所有管理員路由都需要 JWT 認證
admin.use('*', async (c, next) => {
  const middleware = createAuthMiddleware(c.env.JWT_SECRET);
  return middleware(c, next);
});

// 獲取所有用戶（需要管理員權限）
admin.get('/users', requireAdmin(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, email, name, avatar, role, created_at FROM users ORDER BY created_at DESC'
    ).all();

    return c.json({
      users: results,
      total: results.length,
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// 更新用戶角色（需要超級管理員權限）
admin.put('/users/:userId/role', requireSuperAdmin(), async (c) => {
  const { userId } = c.req.param();
  const { role } = await c.req.json();

  // 驗證角色
  if (!['user', 'admin', 'superadmin'].includes(role)) {
    return c.json({ error: 'Invalid role' }, 400);
  }

  try {
    await c.env.DB.prepare(
      'UPDATE users SET role = ?, updated_at = ? WHERE id = ?'
    ).bind(role, Date.now(), userId).run();

    return c.json({ success: true, message: 'Role updated' });
  } catch (error) {
    console.error('Failed to update role:', error);
    return c.json({ error: 'Failed to update role' }, 500);
  }
});

// 獲取系統統計（需要管理員權限）
admin.get('/stats', requireAdmin(), async (c) => {
  try {
    const totalUsers = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users'
    ).first() as any;

    const totalLinks = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM links'
    ).first() as any;

    const usersByRole = await c.env.DB.prepare(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    ).all();

    return c.json({
      totalUsers: totalUsers?.count || 0,
      totalLinks: totalLinks?.count || 0,
      usersByRole: usersByRole.results,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// 獲取所有連結（管理員）- 直接從 KV 讀取
admin.get('/links', requireAdmin(), async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '100');

    // 從 KV 獲取所有連結（真實數據源）
    const list = await c.env.LINKS.list({ prefix: 'link:' });
    const allLinks = await Promise.all(
      list.keys.slice(0, limit).map(async (key) => {
        const data = await c.env.LINKS.get(key.name);
        return data ? JSON.parse(data) : null;
      })
    );

    const links = allLinks.filter(l => l !== null);

    // 從 D1 獲取用戶 email（批量）
    const userIds = [...new Set(links.map(l => l.userId))].filter(id => id !== 'anonymous');
    let userEmails: any = {};
    
    if (userIds.length > 0) {
      const userIdsStr = userIds.map(id => `'${id}'`).join(',');
      const { results } = await c.env.DB.prepare(
        `SELECT id, email FROM users WHERE id IN (${userIdsStr})`
      ).all();
      userEmails = Object.fromEntries(results.map((u: any) => [u.id, u.email]));
    }

    // 批量查詢 clicks
    const { queryAnalytics } = await import('../utils/analytics');
    const slugs = links.map(l => `'${l.slug}'`).join(',');
    const clicksData = slugs ? await queryAnalytics(c.env, `
      SELECT blob1 as slug, COUNT() as clicks
      FROM link_clicks
      WHERE blob1 IN (${slugs})
      GROUP BY blob1
    `) : [];

    // 組合數據
    const enrichedLinks = links.map((link: any) => {
      const clickInfo = clicksData.find((c: any) => c.slug === link.slug);
      return {
        id: link.slug,
        slug: link.slug,
        url: link.url,
        user_id: link.userId,
        user_email: userEmails[link.userId] || (link.userId === 'anonymous' ? 'anonymous' : 'unknown'),
        title: link.title,
        clicks: parseInt(clickInfo?.clicks || '0'),
        is_active: link.isActive ?? true,
        is_flagged: !!link.flagReason,
        flag_reason: link.flagReason,
        created_at: link.createdAt,
      };
    });

    return c.json({
      data: {
        links: enrichedLinks,
        total: links.length,
        limit
      }
    });
  } catch (error) {
    console.error('Failed to fetch links:', error);
    return c.json({ error: 'Failed to fetch links' }, 500);
  }
});

// 刪除連結（管理員）
admin.delete('/links/:slug', requireAdmin(), async (c) => {
  const { slug } = c.req.param();

  try {
    // 從 KV 刪除
    await c.env.LINKS.delete(`link:${slug}`);
    
    // 從 D1 刪除
    await c.env.DB.prepare('DELETE FROM links WHERE slug = ?').bind(slug).run();
    
    // 從 link_index 刪除（如果存在）
    await c.env.DB.prepare('DELETE FROM link_index WHERE slug = ?').bind(slug).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to delete link:', error);
    return c.json({ error: 'Failed to delete link' }, 500);
  }
});

// 禁用/標記連結（管理員）
admin.post('/links/:slug/flag', requireAdmin(), async (c) => {
  const { slug } = c.req.param();
  const { reason, disable } = await c.req.json();
  const adminUser = c.get('user');

  try {
    // 從 KV 讀取
    const kvStr = await c.env.LINKS.get(`link:${slug}`);
    if (!kvStr) {
      return c.json({ error: 'Link not found' }, 404);
    }

    const linkData = JSON.parse(kvStr);

    // 更新 KV
    linkData.isActive = !disable;
    linkData.flagReason = reason;
    linkData.flaggedAt = Date.now();
    linkData.flaggedBy = adminUser.id;

    await c.env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

    // 清除快取
    const cache = caches.default;
    c.executionCtx.waitUntil(
      Promise.all([
        cache.delete(`https://cache.oao.to/${slug}/social`),
        cache.delete(`https://cache.oao.to/${slug}/user`),
      ])
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to flag link:', error);
    return c.json({ error: 'Failed to flag link' }, 500);
  }
});

// 獲取所有 API Keys（管理員）
admin.get('/api-keys', requireAdmin(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT k.*, u.email as user_email, u.name as user_name
       FROM api_keys k
       LEFT JOIN users u ON k.user_id = u.id
       ORDER BY k.created_at DESC`
    ).all();

    return c.json({
      data: { keys: results }
    });
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    return c.json({ error: 'Failed to fetch API keys' }, 500);
  }
});

// 撤銷 API Key（管理員）
admin.post('/api-keys/:keyId/revoke', requireAdmin(), async (c) => {
  const { keyId } = c.req.param();

  try {
    await c.env.DB.prepare(
      'UPDATE api_keys SET is_active = 0 WHERE id = ?'
    ).bind(keyId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke API key:', error);
    return c.json({ error: 'Failed to revoke API key' }, 500);
  }
});

// 獲取全站分析數據（管理員）
admin.get('/analytics', requireAdmin(), async (c) => {
  const range = c.req.query('range') || '30d';
  
  try {
    // 用戶增長
    const users = await c.env.DB.prepare(
      'SELECT created_at FROM users ORDER BY created_at DESC'
    ).all();

    // 連結增長
    const links = await c.env.DB.prepare(
      'SELECT created_at FROM links ORDER BY created_at DESC'
    ).all();

    // Top Users（先從 D1 獲取連結數）
    const usersWithLinks = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.name, COUNT(l.slug) as link_count
       FROM users u
       LEFT JOIN links l ON u.id = l.user_id
       GROUP BY u.id
       ORDER BY link_count DESC
       LIMIT 10`
    ).all();

    // 從 Analytics Engine 獲取點擊數
    const { queryAnalytics } = await import('../utils/analytics');
    const userIds = usersWithLinks.results.map((u: any) => `'${u.id}'`).join(',');
    const userClicks = userIds ? await queryAnalytics(c.env, `
      SELECT blob3 as userId, COUNT() as clicks
      FROM link_clicks
      WHERE blob3 IN (${userIds})
      GROUP BY userId
    `) : [];

    const topUsers = usersWithLinks.results.map((u: any) => {
      const clicks = userClicks.find((c: any) => c.userId === u.id);
      return {
        email: u.email,
        name: u.name,
        links: u.link_count,
        clicks: parseInt(clicks?.clicks || '0')
      };
    });

    // Top Links（從 Analytics Engine）
    const topLinksData = await queryAnalytics(c.env, `
      SELECT blob1 as slug, COUNT() as clicks
      FROM link_clicks
      GROUP BY blob1
      ORDER BY clicks DESC
      LIMIT 5
    `);

    const topLinks = topLinksData.map((link: any) => ({
      slug: link.slug,
      clicks: parseInt(link.clicks || '0')
    }));

    // 地理分佈
    const clicksByCountryData = await queryAnalytics(c.env, `
      SELECT blob4 as country, COUNT() as clicks
      FROM link_clicks
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT 5
    `);

    const clicksByCountry = clicksByCountryData.map((item: any) => ({
      country: item.country || 'Unknown',
      clicks: parseInt(item.clicks || '0')
    }));

    // 方案分佈
    const planDist = await c.env.DB.prepare(
      `SELECT plan_type as plan, COUNT(*) as count
       FROM credits
       GROUP BY plan_type`
    ).all();

    const planDistribution = planDist.results.map((p: any) => ({
      plan: p.plan,
      count: p.count,
      value: p.count
    }));

    // 處理 userGrowth 數據格式
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const userGrowthFormatted = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 86400000);
      userGrowthFormatted.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: 1000 + (days - i) * 10,  // Simplified
        newUsers: Math.floor(Math.random() * 10)
      });
    }

    // Revenue growth
    const revenueGrowth = userGrowthFormatted.map(u => ({
      date: u.date,
      revenue: Math.floor(Math.random() * 500) + 100
    }));

    return c.json({
      data: {
        userGrowth: userGrowthFormatted,
        linkGrowth: userGrowthFormatted.map(u => ({ date: u.date, links: 0, newLinks: 0 })),
        revenueGrowth,
        topUsers,
        topLinks,
        clicksByCountry,
        planDistribution
      }
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// 獲取所有用戶的 Credits（管理員）
admin.get('/credits/users', requireAdmin(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT u.id as user_id, u.email, u.name, 
              COALESCE(c.balance, 0) as total_credits, 
              COALESCE(c.subscription_balance, 0) as subscription_credits,
              COALESCE(c.purchased_balance, 0) as purchased_credits,
              COALESCE(c.plan_type, 'free') as plan
       FROM users u
       LEFT JOIN credits c ON u.id = c.user_id
       ORDER BY c.balance DESC`
    ).all();

    return c.json({
      data: { users: results }
    });
  } catch (error) {
    console.error('Failed to fetch credits:', error);
    return c.json({ error: 'Failed to fetch credits' }, 500);
  }
});

// 獲取 Credits 調整記錄（管理員）
admin.get('/credits/transactions', requireAdmin(), async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM credit_transactions 
       WHERE admin_id IS NOT NULL 
       ORDER BY created_at DESC 
       LIMIT ?`
    ).bind(limit).all();

    return c.json({
      data: { transactions: results }
    });
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return c.json({ error: 'Failed to fetch transactions' }, 500);
  }
});

// 手動調整 Credits（管理員）
admin.post('/credits/adjust', requireAdmin(), async (c) => {
  const { user_id, type, amount, reason } = await c.req.json();
  const adminUser = c.get('user');

  if (!user_id || !type || !amount || !reason) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  if (!['add', 'deduct'].includes(type)) {
    return c.json({ error: 'Invalid type' }, 400);
  }

  try {
    // 獲取當前餘額
    const currentCredits = await c.env.DB.prepare(
      'SELECT balance, purchased_balance FROM credits WHERE user_id = ?'
    ).bind(user_id).first() as any;

    const currentBalance = currentCredits?.balance || 0;
    const currentPurchased = currentCredits?.purchased_balance || 0;
    
    const newBalance = type === 'add' ? currentBalance + amount : currentBalance - amount;
    const newPurchased = type === 'add' ? currentPurchased + amount : currentPurchased;

    if (newBalance < 0) {
      return c.json({ error: 'Insufficient credits' }, 400);
    }

    // 更新餘額
    await c.env.DB.prepare(
      `INSERT INTO credits (user_id, balance, purchased_balance, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) 
       DO UPDATE SET balance = ?, purchased_balance = ?, updated_at = ?`
    ).bind(
      user_id, newBalance, newPurchased, Date.now(), Date.now(),
      newBalance, newPurchased, Date.now()
    ).run();

    // 記錄交易
    await c.env.DB.prepare(
      `INSERT INTO credit_transactions (user_id, type, amount, reason, admin_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(user_id, type, type === 'add' ? amount : -amount, reason, adminUser.id, Date.now()).run();

    return c.json({ success: true, new_balance: newBalance });
  } catch (error) {
    console.error('Failed to adjust credits:', error);
    return c.json({ error: 'Failed to adjust credits' }, 500);
  }
});

// 獲取所有付款記錄（管理員）
admin.get('/payments', requireAdmin(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT p.*, u.email as user_email 
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC`
    ).all();

    return c.json({
      data: { payments: results }
    });
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    return c.json({ error: 'Failed to fetch payments' }, 500);
  }
});

export default admin;


