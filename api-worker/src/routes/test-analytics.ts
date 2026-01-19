// 測試 Analytics Engine 查詢的診斷工具

import { Hono } from 'hono';
import { queryAnalytics } from '../utils/analytics';
import type { Env } from '../types';

const testAnalytics = new Hono<{ Bindings: Env }>();

// 測試：查詢所有數據
testAnalytics.get('/all', async (c) => {
  try {
    // 查詢所有數據（限制 10 筆）
    const allData = await queryAnalytics(c.env, `
      SELECT *
      FROM link_clicks
      LIMIT 10
    `);

    return c.json({
      success: true,
      count: allData.length,
      data: allData,
    });
  } catch (error) {
    console.error('Test query error:', error);
    return c.json({ 
      success: false,
      error: String(error),
    }, 500);
  }
});

// 測試：查詢特定 slug 的數據
testAnalytics.get('/slug/:slug', async (c) => {
  const slug = c.req.param('slug');
  
  try {
    // 1. 查詢所有該 slug 的數據
    const rawData = await queryAnalytics(c.env, `
      SELECT *
      FROM link_clicks
      WHERE blob1 = '${slug}'
      LIMIT 10
    `);

    // 2. 查詢總數
    const count = await queryAnalytics(c.env, `
      SELECT COUNT() as total
      FROM link_clicks
      WHERE blob1 = '${slug}'
    `);

    // 3. 查詢國家分佈
    const countries = await queryAnalytics(c.env, `
      SELECT 
        blob4 as country,
        COUNT() as clicks
      FROM link_clicks
      WHERE blob1 = '${slug}'
      GROUP BY country
    `);

    return c.json({
      success: true,
      slug,
      totalCount: count[0]?.total || 0,
      countries,
      rawSample: rawData,
    });
  } catch (error) {
    console.error('Test query error:', error);
    return c.json({ 
      success: false,
      error: String(error),
    }, 500);
  }
});

// 測試：查詢最近的數據（測試時間戳）
testAnalytics.get('/recent', async (c) => {
  try {
    const recentData = await queryAnalytics(c.env, `
      SELECT 
        blob1 as slug,
        blob4 as country,
        blob8 as device,
        double1 as timestamp_raw,
        timestamp
      FROM link_clicks
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    return c.json({
      success: true,
      count: recentData.length,
      data: recentData,
    });
  } catch (error) {
    console.error('Test query error:', error);
    return c.json({ 
      success: false,
      error: String(error),
    }, 500);
  }
});

// 測試：原始 API 調用（繞過 queryAnalytics）
testAnalytics.get('/raw-api', async (c) => {
  const sql = `SELECT * FROM link_clicks LIMIT 5`;
  const API = `https://api.cloudflare.com/client/v4/accounts/${c.env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`;
  
  try {
    const response = await fetch(API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.CLOUDFLARE_API_TOKEN}`,
      },
      body: sql,
    });

    const text = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(text);
    } catch {
      jsonData = null;
    }

    return c.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      responseText: text,
      parsedData: jsonData,
    });
  } catch (error) {
    return c.json({ 
      success: false,
      error: String(error),
    }, 500);
  }
});

export default testAnalytics;

