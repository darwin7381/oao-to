// Analytics Engine 工具函數
// 複製自 shorty.dev 並改寫

import type { Env } from '../types';

export async function trackClick(
  env: Env,
  slug: string,
  url: string,
  userId: string,
  request: Request
): Promise<void> {
  const cfProperties = (request as any).cf;
  
  if (!cfProperties || !env.TRACKER) {
    console.warn('CF properties or TRACKER not available');
    return;
  }

  try {
    await env.TRACKER.writeDataPoint({
      blobs: [
        slug,                              // blob1: 短網址 slug
        url,                               // blob2: 目標網址
        userId,                            // blob3: 用戶 ID
        cfProperties.country || 'Unknown', // blob4: 國家
        cfProperties.city || 'Unknown',    // blob5: 城市
        cfProperties.continent || 'Unknown', // blob6: 洲
        cfProperties.timezone || 'Unknown',  // blob7: 時區
        request.headers.get('user-agent')?.includes('Mobile') ? 'mobile' : 'desktop', // blob8: 設備類型
      ],
      doubles: [
        Date.now(),                        // double1: 時間戳
        cfProperties.longitude || 0,       // double2: 經度
        cfProperties.latitude || 0,        // double3: 緯度
      ],
      indexes: [slug, userId],             // 索引：加速查詢
    });
  } catch (error) {
    console.error('Failed to track click:', error);
  }
}

export async function queryAnalytics(
  env: Env,
  sql: string
): Promise<any[]> {
  const API = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/analytics_engine/sql`;
  
  try {
    const response = await fetch(API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      },
      body: sql,
    });

    const jsonResponse = await response.json() as any;
    return jsonResponse.data || [];
  } catch (error) {
    console.error('Analytics query failed:', error);
    return [];
  }
}


