// 分析 API

import { Hono } from 'hono';
import { createAuthMiddleware, getUserFromContext } from '../middleware/auth';
import { queryAnalytics } from '../utils/analytics';
import type { Env } from '../types';

const analytics = new Hono<{ Bindings: Env }>();

// 🧪 開發階段：暫時移除認證（方便測試）
// 生產階段：需要重新啟用
// analytics.use('*', async (c, next) => {
//   const authMiddleware = createAuthMiddleware(c.env.JWT_SECRET);
//   return authMiddleware(c, next);
// });

// 獲取短網址分析數據
analytics.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  // const user = getUserFromContext(c);  // 暫時註解

  // 🧪 開發階段：暫時跳過所有權驗證
  // 生產階段：需要重新啟用
  // const link = await c.env.DB.prepare(
  //   'SELECT * FROM links WHERE slug = ? AND user_id = ?'
  // ).bind(slug, user.userId).first();

  // if (!link) {
  //   return c.json({ error: 'Not found or unauthorized' }, 404);
  // }

  // 🧪 開發階段：移除檢查，直接查詢
  try {
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

    // 3. 過去 7 天趨勢
    const byDay = await queryAnalytics(c.env, `
      SELECT 
        toDate(timestamp) as date,
        COUNT() as clicks
      FROM link_clicks
      WHERE blob1 = '${slug}'
        AND timestamp > NOW() - INTERVAL 7 DAY
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
  // const user = getUserFromContext(c);  // 暫時註解
  const user = { userId: 'test-user' };  // 🧪 測試用

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

    const slugs = links.results.map((l: any) => l.slug);
    const slugList = slugs.map(s => `'${s}'`).join(',');

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

