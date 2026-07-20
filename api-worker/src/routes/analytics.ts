// 分析 API

import { Hono } from 'hono';
import { requireAuth, getUserFromContext } from '../middleware/auth';
import { queryAnalytics } from '../utils/analytics';
import type { Env } from '../types';

const analytics = new Hono<{ Bindings: Env }>();

// slug 白名單：Analytics Engine SQL 不支援 parameterized query，
// 插入前一律驗證格式，阻擋 SQL 注入
const SLUG_RE = /^[a-zA-Z0-9_-]{1,50}$/;
const isSafeSlug = (s: string) => SLUG_RE.test(s);

// 所有分析端點都需要登入
analytics.use('/*', requireAuth);

// 獲取短網址分析數據
analytics.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const user = getUserFromContext(c);

  if (!isSafeSlug(slug)) {
    return c.json({ error: 'Invalid slug' }, 400);
  }

  try {
    // 0. 從 KV 獲取鏈接詳細信息（與 Dashboard 和重定向保持一致）
    const linkDataStr = await c.env.LINKS.get(`link:${slug}`);

    if (!linkDataStr) {
      return c.json({ error: 'Link not found' }, 404);
    }

    const linkData = JSON.parse(linkDataStr);

    // 所有權驗證：只有連結擁有者或管理員可查看分析
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (linkData.userId !== user.userId && !isAdmin) {
      return c.json({ error: 'Not found or unauthorized' }, 404);
    }

    // 1. 總點擊數
    const totalClicks = await queryAnalytics(c.env, `
      SELECT COUNT() as total
      FROM link_clicks
      WHERE blob1 = '${slug}'
    `);

    // 2. 按國家分組
    const byCountry = await queryAnalytics(c.env, `
      SELECT 
        blob4 as country,
        COUNT() as clicks
      FROM link_clicks
      WHERE blob1 = '${slug}'
      GROUP BY country
      ORDER BY clicks DESC
      LIMIT 10
    `);

    // 3. 過去 30 天趨勢（原 7 天太短：連結超過一週沒點擊就顯示「無流量」，看起來像壞掉）
    const byDay = await queryAnalytics(c.env, `
      SELECT
        toDate(timestamp) as date,
        COUNT() as clicks
      FROM link_clicks
      WHERE blob1 = '${slug}'
        AND timestamp > NOW() - INTERVAL 30 DAY
      GROUP BY date
      ORDER BY date
    `);

    // 4. 設備類型分佈
    const byDevice = await queryAnalytics(c.env, `
      SELECT 
        blob8 as device,
        COUNT() as clicks
      FROM link_clicks
      WHERE blob1 = '${slug}'
      GROUP BY device
    `);

    return c.json({
      slug,
      url: linkData.url || '',
      title: linkData.title || '',
      description: linkData.description || '',
      image: linkData.image || '',
      createdAt: linkData.createdAt || null,
      totalClicks: totalClicks[0]?.total || 0,
      byCountry: byCountry || [],
      byDay: byDay || [],
      byDevice: byDevice || [],
    });
  } catch (error) {
    console.error('Analytics query error:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// 獲取用戶的所有鏈接統計摘要
analytics.get('/summary/all', async (c) => {
  const user = getUserFromContext(c);

  try {
    // 獲取用戶的所有短網址
    const links = await c.env.DB.prepare(
      'SELECT slug FROM links WHERE user_id = ?'
    ).bind(user.userId).all();

    if (!links.results || links.results.length === 0) {
      return c.json({
        totalLinks: 0,
        totalClicks: 0,
        topLinks: [],
      });
    }

    // 白名單過濾後才插入 AE SQL（防注入 + defense in depth）
    const slugs = links.results.map((l: any) => l.slug).filter((s: string) => isSafeSlug(s));
    if (slugs.length === 0) {
      return c.json({ totalLinks: links.results.length, totalClicks: 0, topLinks: [] });
    }
    const slugList = slugs.map((s: string) => `'${s}'`).join(',');

    // 查詢總點擊數
    const totalClicks = await queryAnalytics(c.env, `
      SELECT COUNT() as total
      FROM link_clicks
      WHERE blob1 IN (${slugList})
    `);

    // 查詢最熱門的鏈接
    const topLinks = await queryAnalytics(c.env, `
      SELECT 
        blob1 as slug,
        COUNT() as clicks
      FROM link_clicks
      WHERE blob1 IN (${slugList})
      GROUP BY blob1
      ORDER BY clicks DESC
      LIMIT 5
    `);

    return c.json({
      totalLinks: links.results.length,
      totalClicks: totalClicks[0]?.total || 0,
      topLinks: topLinks || [],
    });
  } catch (error) {
    console.error('Summary query error:', error);
    return c.json({ error: 'Failed to fetch summary' }, 500);
  }
});

export default analytics;

