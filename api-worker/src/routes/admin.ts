// 管理員 API 路由

import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { requireAdmin, requireSuperAdmin } from '../middleware/role';
import type { Env } from '../types';

const admin = new Hono<{ Bindings: Env }>();

// 所有管理員路由都需要 JWT 認證（使用 requireAuth 來正確設置 context）
admin.use('*', requireAuth);

// 獲取所有用戶（需要管理員權限）
admin.get('/users', requireAdmin(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT u.id, u.email, u.name, u.avatar, u.role, u.created_at,
             c.plan_type, c.billing_period, c.stripe_subscription_id, c.subscription_status
      FROM users u
      LEFT JOIN credits c ON c.user_id = u.id
      ORDER BY u.created_at DESC
    `).all();

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
  const adminId = c.get('userId') as string;
  const adminEmail = c.get('userEmail') as string;
  const adminRole = c.get('userRole') as string;

  // 驗證角色
  if (!['user', 'admin', 'superadmin'].includes(role)) {
    return c.json({ error: 'Invalid role' }, 400);
  }

  try {
    // 獲取舊數據
    const oldUser = await c.env.DB.prepare(
      'SELECT role FROM users WHERE id = ?'
    ).bind(userId).first();

    await c.env.DB.prepare(
      'UPDATE users SET role = ?, updated_at = ? WHERE id = ?'
    ).bind(role, Date.now(), userId).run();

    // 記錄審計日誌
    const { logAuditAction } = await import('../middleware/audit');
    await logAuditAction(
      c.env, 
      adminId, 
      adminEmail, 
      adminRole, 
      'update_user_role', 
      'user', 
      userId, 
      oldUser || { role: 'unknown' },  // 確保不是 null/undefined
      { role }, 
      c.req.raw
    );

    return c.json({ success: true, message: 'Role updated' });
  } catch (error) {
    console.error('Failed to update role:', error);
    return c.json({ error: 'Failed to update role' }, 500);
  }
});

// 獲取系統統計（需要管理員權限）
admin.get('/stats', requireAdmin(), async (c) => {
  try {
    const now = Date.now();
    const dayStart = now - 24 * 60 * 60 * 1000;
    const weekStart = now - 7 * 24 * 60 * 60 * 1000;

    const num = (r: any) => (r?.count as number) || 0;

    const [
      totalUsers, newUsersToday, newUsersWeek,
      totalLinks, newLinksToday, newLinksWeek,
      creditsAgg, usersByRole,
    ] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= ?').bind(dayStart).first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE created_at >= ?').bind(weekStart).first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM links').first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM links WHERE created_at >= ?').bind(dayStart).first(),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM links WHERE created_at >= ?').bind(weekStart).first(),
      c.env.DB.prepare(
        'SELECT COALESCE(SUM(balance),0) as remaining, COALESCE(SUM(total_used),0) as used, COALESCE(SUM(total_purchased),0) as purchased FROM credits'
      ).first() as any,
      c.env.DB.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all(),
    ]);

    const remaining = (creditsAgg?.remaining as number) || 0;
    const used = (creditsAgg?.used as number) || 0;

    // 真實數字取代先前的 placeholder（active=total、revenue=0、clicks=0 都是假的）
    const monthStart = now - 30 * 24 * 60 * 60 * 1000;
    const { queryAnalytics } = await import('../utils/analytics');
    const [activeUsers, revenueAgg, apiAgg, totalClicksData] = await Promise.all([
      // active = 有至少一條連結的用戶（可衡量的真實定義）
      c.env.DB.prepare('SELECT COUNT(DISTINCT user_id) as count FROM links WHERE user_id IS NOT NULL').first(),
      c.env.DB.prepare(
        `SELECT COALESCE(SUM(amount),0) as total,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN amount ELSE 0 END),0) as this_month,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN amount ELSE 0 END),0) as this_week
         FROM payments WHERE status IN ('completed','partially_refunded')`
      ).bind(monthStart, weekStart).first() as any,
      c.env.DB.prepare(
        `SELECT COALESCE(SUM(total_requests),0) as total,
                COALESCE(SUM(CASE WHEN date = date('now') THEN total_requests ELSE 0 END),0) as today
         FROM api_usage_stats`
      ).first() as any,
      queryAnalytics(c.env, `SELECT COUNT() as total FROM link_clicks`),
    ]);

    return c.json({
      // 巢狀結構（前端 Stats 頁使用）
      users: {
        total: num(totalUsers),
        active: num(activeUsers),
        new_today: num(newUsersToday),
        new_this_week: num(newUsersWeek),
      },
      links: {
        total: num(totalLinks),
        created_today: num(newLinksToday),
        created_this_week: num(newLinksWeek),
        total_clicks: parseInt(totalClicksData[0]?.total || '0'),
      },
      revenue: {
        total: (revenueAgg?.total as number) || 0,
        this_month: (revenueAgg?.this_month as number) || 0,
        this_week: (revenueAgg?.this_week as number) || 0,
      },
      credits: {
        total_issued: used + remaining,
        total_used: used,
        total_remaining: remaining,
      },
      api: {
        total_requests: (apiAgg?.total as number) || 0,
        requests_today: (apiAgg?.today as number) || 0,
        avg_response_time: null, // 未量測 — 顯示 N/A，不捏造
      },
      // 保留舊平面欄位相容
      totalUsers: num(totalUsers),
      totalLinks: num(totalLinks),
      usersByRole: usersByRole.results,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// 獲取所有連結（管理員）— D1 source of truth：時間倒序、真分頁、真 total
// （修掉舊版 KV list 字母序 + 上限 100 + total=頁大小的三個「怪怪的」）
admin.get('/links', requireAdmin(), async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '100'), 1000);
    const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0);
    const SLUG_RE = /^[a-zA-Z0-9_-]{1,50}$/;

    const [rows, count] = await Promise.all([
      c.env.DB.prepare(
        `SELECT l.slug, l.url, l.user_id, l.title, l.source, l.is_custom, l.is_active, l.flag_reason, l.created_at, u.email as user_email
         FROM links l LEFT JOIN users u ON u.id = l.user_id
         ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
      ).bind(limit, offset).all(),
      c.env.DB.prepare('SELECT COUNT(*) as n FROM links').first(),
    ]);
    const links = (rows.results || []) as any[];

    // 批量查詢當頁 clicks（slug 白名單過濾防 AE SQL 注入）
    const { queryAnalytics } = await import('../utils/analytics');
    const slugs = links.map(l => l.slug).filter((s: string) => SLUG_RE.test(s))
      .map((s: string) => `'${s}'`).join(',');
    const clicksData = slugs ? await queryAnalytics(c.env, `
      SELECT blob1 as slug, COUNT() as clicks
      FROM link_clicks
      WHERE blob1 IN (${slugs})
      GROUP BY blob1
    `) : [];

    const enrichedLinks = links.map((link: any) => {
      const clickInfo = clicksData.find((cd: any) => cd.slug === link.slug);
      return {
        id: link.slug,
        slug: link.slug,
        url: link.url,
        user_id: link.user_id,
        user_email: link.user_email || (link.user_id ? 'unknown' : 'anonymous'),
        title: link.title,
        source: link.source,
        is_custom: link.is_custom,
        clicks: parseInt(clickInfo?.clicks || '0'),
        is_active: (link.is_active ?? 1) !== 0,
        is_flagged: !!link.flag_reason,
        flag_reason: link.flag_reason,
        created_at: link.created_at,
      };
    });

    return c.json({
      data: {
        links: enrichedLinks,
        total: (count?.n as number) || 0,
        limit,
        offset,
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
  const userId = c.get('userId') as string;
  const userEmail = c.get('userEmail') as string;
  const userRole = c.get('userRole') as string;

  try {
    // 獲取舊數據用於審計
    const oldLink = await c.env.LINKS.get(`link:${slug}`);
    
    // 從 KV 刪除
    await c.env.LINKS.delete(`link:${slug}`);
    
    // 從 D1 刪除
    await c.env.DB.prepare('DELETE FROM links WHERE slug = ?').bind(slug).run();
    
    // 從 link_index 刪除（如果存在）
    await c.env.DB.prepare('DELETE FROM link_index WHERE slug = ?').bind(slug).run();
    
    // 記錄審計日誌（同步執行）
    try {
      const { logAuditAction } = await import('../middleware/audit');
      await logAuditAction(c.env, userId, userEmail, userRole, 'delete_link', 'link', slug, oldLink ? JSON.parse(oldLink) : null, null, c.req.raw);
    } catch (auditError) {
      console.error('[DeleteLink] Failed to log audit:', auditError);
    }
    
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
  const userId = c.get('userId') as string;
  const userEmail = c.get('userEmail') as string;
  const userRole = c.get('userRole') as string;

  try {
    // 從 KV 讀取
    const kvStr = await c.env.LINKS.get(`link:${slug}`);
    if (!kvStr) {
      return c.json({ error: 'Link not found' }, 404);
    }

    const linkData = JSON.parse(kvStr);
    const oldData = { ...linkData };

    // 更新 KV
    linkData.isActive = !disable;
    linkData.flagReason = reason;
    linkData.flaggedAt = Date.now();
    linkData.flaggedBy = userId;

    await c.env.LINKS.put(`link:${slug}`, JSON.stringify(linkData));

    // 同步 D1（admin 列表讀 D1；重定向禁用仍以 KV 為準）
    await c.env.DB.prepare(
      'UPDATE links SET is_active = ?, flag_reason = ?, updated_at = ? WHERE slug = ?'
    ).bind(disable ? 0 : 1, reason || null, Date.now(), slug).run();

    // 記錄審計日誌
    try {
      const { logAuditAction } = await import('../middleware/audit');
      await logAuditAction(
        c.env,
        userId,
        userEmail,
        userRole,
        'flag_link',
        'link', 
        slug, 
        { isActive: oldData.isActive }, 
        { isActive: linkData.isActive, reason }, 
        c.req.raw
      );
    } catch (auditError) {
      console.error('[FlagLink] Failed to log audit:', auditError);
    }

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
  const userId = c.get('userId') as string;
  const userEmail = c.get('userEmail') as string;
  const userRole = c.get('userRole') as string;

  try {
    // 獲取舊數據
    const oldKey = await c.env.DB.prepare(
      'SELECT * FROM api_keys WHERE id = ?'
    ).bind(keyId).first();

    await c.env.DB.prepare(
      'UPDATE api_keys SET is_active = 0 WHERE id = ?'
    ).bind(keyId).run();

    // 立即清除 KV 快取，否則被撤銷的 key 在快取 TTL 內仍可通過驗證
    if ((oldKey as any)?.key_hash) {
      await c.env.LINKS.delete(`apikey:cache:${(oldKey as any).key_hash}`);
    }

    // 記錄審計日誌（同步執行）
    try {
      const { logAuditAction } = await import('../middleware/audit');
      await logAuditAction(c.env, userId, userEmail, userRole, 'revoke_api_key', 'api_key', keyId, oldKey, { is_active: 0 }, c.req.raw);
    } catch (auditError) {
      console.error('[RevokeKey] Failed to log audit:', auditError);
    }

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

    // 成長曲線 — 全部真實數據（原本 users=1000+線性、newUsers/revenue=隨機數，已移除）
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const rangeStart = Date.now() - days * 86400000;

    const [payments, baseUsers, baseLinks] = await Promise.all([
      c.env.DB.prepare(
        `SELECT created_at, amount FROM payments
         WHERE status IN ('completed','partially_refunded') AND created_at >= ?`
      ).bind(rangeStart).all(),
      c.env.DB.prepare('SELECT COUNT(*) as n FROM users WHERE created_at < ?').bind(rangeStart).first(),
      c.env.DB.prepare('SELECT COUNT(*) as n FROM links WHERE created_at < ?').bind(rangeStart).first(),
    ]);

    const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);
    const newUsersByDay = new Map<string, number>();
    for (const u of users.results as any[]) {
      if ((u.created_at as number) >= rangeStart) {
        const k = dayKey(u.created_at);
        newUsersByDay.set(k, (newUsersByDay.get(k) || 0) + 1);
      }
    }
    const newLinksByDay = new Map<string, number>();
    for (const l of links.results as any[]) {
      if ((l.created_at as number) >= rangeStart) {
        const k = dayKey(l.created_at);
        newLinksByDay.set(k, (newLinksByDay.get(k) || 0) + 1);
      }
    }
    const revenueByDay = new Map<string, number>();
    for (const p of (payments.results || []) as any[]) {
      const k = dayKey(p.created_at);
      revenueByDay.set(k, (revenueByDay.get(k) || 0) + (p.amount as number));
    }

    const userGrowthFormatted = [];
    const linkGrowth = [];
    const revenueGrowth = [];
    let cumUsers = (baseUsers?.n as number) || 0;
    let cumLinks = (baseLinks?.n as number) || 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const k = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const nu = newUsersByDay.get(k) || 0;
      const nl = newLinksByDay.get(k) || 0;
      cumUsers += nu;
      cumLinks += nl;
      userGrowthFormatted.push({ date: label, users: cumUsers, newUsers: nu });
      linkGrowth.push({ date: label, links: cumLinks, newLinks: nl });
      revenueGrowth.push({ date: label, revenue: Math.round((revenueByDay.get(k) || 0) * 100) / 100 });
    }

    return c.json({
      data: {
        userGrowth: userGrowthFormatted,
        linkGrowth,
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
              COALESCE(c.purchased_balance, 0) as purchased_credits,
              COALESCE(p.monthly_credits, 100) as monthly_quota,
              COALESCE(c.monthly_used, 0) as monthly_used,
              COALESCE(c.plan_override, c.plan_type, 'free') as plan
       FROM users u
       LEFT JOIN credits c ON u.id = c.user_id
       LEFT JOIN plans p ON COALESCE(c.plan_override, c.plan_type) = p.name
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
      `SELECT 
        ct.*,
        u.email as user_email,
        u.name as user_name
       FROM credit_transactions ct
       LEFT JOIN users u ON ct.user_id = u.id
       WHERE ct.admin_id IS NOT NULL 
       ORDER BY ct.created_at DESC 
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
  const body = await c.req.json();
  const userId = body.user_id;
  const type = body.type;
  const amount = Number(body.amount);
  const reason = body.reason;

  if (!userId || !type || !amount || !reason) {
    return c.json({ error: 'Missing fields' }, 400);
  }

  // 金額上限驗證，防止（惡意或誤操作的）admin 一次發放天量 credits
  const MAX_ADJUST = 1_000_000;
  if (!Number.isFinite(amount) || Math.abs(amount) > MAX_ADJUST) {
    return c.json({ error: `Amount must be between -${MAX_ADJUST} and ${MAX_ADJUST}` }, 400);
  }

  try {
    // ✨ 使用 ensureUserCredits 確保 credits 記錄存在
    const { ensureUserCredits } = await import('../utils/ensure-credits');
    const current = await ensureUserCredits(c.env.DB, userId);
    
    const oldBalance = Number(current.balance);
    const newBalance = type === 'add' ? oldBalance + amount : oldBalance - amount;
    
    if (newBalance < 0) return c.json({ error: 'Insufficient' }, 400);
    
    const adminId = c.get('userId') as string;
    const adminEmail = c.get('userEmail') as string;
    const adminRole = c.get('userRole') as string;
    
    // 更新 balance
    await c.env.DB.prepare('UPDATE credits SET balance = ?, updated_at = ? WHERE user_id = ?').bind(newBalance, Date.now(), userId).run();
    
    // 记录到 credit_transactions（重要！前端需要显示）
    const transactionId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO credit_transactions (
        id, user_id, type, amount, balance_after, description, admin_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transactionId,
      userId,
      type === 'add' ? 'bonus' : 'penalty',
      type === 'add' ? amount : -amount,
      newBalance,
      reason,
      adminId,
      Date.now()
    ).run();
    
    try {
      const { logAuditAction } = await import('../middleware/audit');
      await logAuditAction(
        c.env,
        adminId,
        adminEmail,
        adminRole,
        'adjust_credits',
        'credit',
        userId,
        { balance: oldBalance },
        { balance: newBalance, type, amount, reason },
        c.req.raw
      );
    } catch (auditError) {
      console.error('[AdjustCredits] Failed to log audit:', auditError);
    }
    
    return c.json({ success: true, new_balance: newBalance });
  } catch (error) {
    console.error(error);
    return c.json({ error: String(error) }, 500);
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

/**
 * POST /api/admin/users/:userId/set-plan
 * 管理員直接設定用戶方案（用於測試和客服操作）
 * 只改本地 DB，不動 Stripe 訂閱
 */
admin.post('/users/:userId/set-plan', requireSuperAdmin(), async (c) => {
  try {
    const userId = c.req.param('userId');
    const { planType, billingPeriod, clearSubscription } = await c.req.json<{
      planType: 'free' | 'starter' | 'pro' | 'enterprise';
      billingPeriod?: 'monthly' | 'yearly';
      clearSubscription?: boolean;
    }>();

    if (!['free', 'starter', 'pro', 'enterprise'].includes(planType)) {
      return c.json({ error: 'Invalid plan type' }, 400);
    }

    if (billingPeriod && !['monthly', 'yearly'].includes(billingPeriod)) {
      return c.json({ error: 'Invalid billing period' }, 400);
    }

    // 查詢方案資訊
    const planInfo = await c.env.DB.prepare(`
      SELECT * FROM plans WHERE name = ?
    `).bind(planType).first();

    const monthlyQuota = planInfo?.monthly_credits || (planType === 'free' ? 100 : 0);

    // 查詢用戶當前訂閱狀態，決定操作模式：
    // - 有活躍 Stripe 訂閱：只寫 plan_override（webhook 擁有 plan_type，不互相覆寫）
    // - clearSubscription：先取消 Stripe 訂閱（否則 Stripe 會繼續扣款），再清 DB
    // - 無訂閱：直接寫 plan_type
    const current = await c.env.DB.prepare(`
      SELECT stripe_subscription_id, subscription_status FROM credits WHERE user_id = ?
    `).bind(userId).first();

    const liveStatuses = ['active', 'past_due', 'trialing', 'incomplete'];
    const hasLiveSubscription = Boolean(
      current?.stripe_subscription_id &&
      liveStatuses.includes((current?.subscription_status as string) || '')
    );

    if (clearSubscription && current?.stripe_subscription_id) {
      const { getStripe } = await import('../utils/stripe');
      try {
        await getStripe(c.env).subscriptions.cancel(current.stripe_subscription_id as string);
        console.log(`✅ Stripe subscription ${current.stripe_subscription_id} canceled by admin`);
      } catch (stripeErr) {
        const code = (stripeErr as { code?: string })?.code;
        if (code !== 'resource_missing') {
          console.error('Failed to cancel Stripe subscription:', stripeErr);
          return c.json({ error: 'Failed to cancel Stripe subscription — aborted to avoid billing drift' }, 502);
        }
      }
    }

    const overrideMode = hasLiveSubscription && !clearSubscription;
    const now = Date.now();

    // 構建更新 SQL（parameterized，值一律走 .bind()）
    const updates: string[] = [
      overrideMode ? 'plan_override = ?' : 'plan_type = ?',
      'monthly_used = 0',
      'monthly_reset_at = ?',
      "last_plan_change_type = 'admin_override'",
      'last_plan_change_at = ?',
      'updated_at = ?',
    ];
    const bindings: unknown[] = [
      planType,
      now + 30 * 24 * 60 * 60 * 1000,
      now,
      now,
    ];

    if (!overrideMode) {
      // 直接改 plan_type 時順便清掉殘留的 override / 排程狀態
      updates.push('plan_override = NULL');
      updates.push('scheduled_plan_change = NULL');
      updates.push('cancel_at_period_end = 0');
    }

    if (billingPeriod) {
      updates.push('billing_period = ?');
      bindings.push(billingPeriod);
    }

    if (clearSubscription) {
      updates.push(`stripe_subscription_id = NULL`);
      updates.push(`subscription_status = NULL`);
      updates.push(`subscription_current_period_start = NULL`);
      updates.push(`subscription_current_period_end = NULL`);
    }

    const adminId = c.get('userId') as string;
    await c.env.DB.batch([
      c.env.DB.prepare(`
        UPDATE credits SET ${updates.join(', ')} WHERE user_id = ?
      `).bind(...bindings, userId),
      c.env.DB.prepare(`
        INSERT INTO credit_transactions
        (id, user_id, type, amount, balance_after, description, metadata, created_at)
        VALUES (?, ?, 'admin', 0,
          (SELECT balance FROM credits WHERE user_id = ?),
          ?, ?, ?)
      `).bind(
        `trans_admin_${now}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userId,
        `Admin set plan to ${planType}${overrideMode ? ' (override)' : ''}`,
        JSON.stringify({ adminId, planType, billingPeriod, clearSubscription, overrideMode }),
        now
      ),
    ]);

    console.log(`✅ Admin ${adminId} set user ${userId} plan to ${planType} (${overrideMode ? 'override' : 'direct'})`);

    return c.json({
      success: true,
      message: overrideMode
        ? `Plan override set to ${planType} (Stripe subscription unchanged and still billing — use clearSubscription to cancel it)`
        : `Plan set to ${planType}`,
      plan: { type: planType, monthlyQuota, billingPeriod: billingPeriod || 'monthly', overrideMode }
    });

  } catch (error) {
    console.error('Admin set-plan error:', error);
    return c.json({ error: 'Failed to set plan' }, 500);
  }
});

// KV → D1 backfill（一次性資料修復：兩萬條歷史連結從未落 D1）。
// 分批：每次呼叫處理一頁 KV keys，回傳 cursor 由呼叫端 loop 到 complete=true。
// 冪等：INSERT OR IGNORE，重跑安全。superadmin only。
admin.post('/backfill-links', requireSuperAdmin(), async (c) => {
  const cursor = c.req.query('cursor') || undefined;
  const batch = Math.min(parseInt(c.req.query('batch') || '150'), 250);

  const list = await c.env.LINKS.list({ prefix: 'link:', limit: batch, cursor });
  let failed = 0;
  const stmts: any[] = [];
  // 平行讀 KV（runtime 自行限流併發連線），比逐筆 await 快一個數量級
  const raws = await Promise.all(list.keys.map((k) => c.env.LINKS.get(k.name)));
  for (let i = 0; i < list.keys.length; i++) {
    const key = list.keys[i];
    const raw = raws[i];
    if (!raw) { failed++; continue; }
    let d: any;
    try { d = JSON.parse(raw); } catch { failed++; continue; }
    const slug = d.slug || key.name.slice('link:'.length);
    if (!d.url || typeof d.url !== 'string') { failed++; continue; }
    stmts.push(c.env.DB.prepare(
      `INSERT OR IGNORE INTO links
       (slug, url, user_id, title, source, is_custom, is_active, flag_reason, created_at, updated_at, expires_at, password)
       VALUES (?, ?, ?, ?, 'backfill', NULL, ?, ?, ?, ?, ?, ?)`
    ).bind(
      slug,
      d.url,
      (!d.userId || d.userId === 'anonymous') ? null : d.userId,
      d.title || null,
      d.isActive === false ? 0 : 1,
      d.flagReason || null,
      d.createdAt || d.created_at || Date.now(),
      d.updatedAt || null,
      d.expiresAt || null,
      d.password || null,
    ));
  }

  let inserted = 0;
  if (stmts.length) {
    const rs = await c.env.DB.batch(stmts);
    inserted = rs.reduce((a, r) => a + (r.meta?.changes || 0), 0);
  }

  return c.json({
    processed: list.keys.length,
    inserted,
    already_present: stmts.length - inserted,
    failed,
    cursor: list.list_complete ? null : (list as any).cursor,
    complete: list.list_complete,
  });
});

export default admin;