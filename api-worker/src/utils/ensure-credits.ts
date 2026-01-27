// Credits 自動確保機制
// 確保用戶有 credits 記錄，如果沒有則自動創建

import type { D1Database } from '@cloudflare/workers-types';

/**
 * 確保用戶有 credits 記錄
 * 如果沒有，自動創建並記錄日誌
 * 
 * @param db D1 Database
 * @param userId 用戶 ID
 * @returns credits 記錄
 */
export async function ensureUserCredits(
  db: D1Database,
  userId: string
): Promise<any> {
  // 1. 檢查是否已有 credits 記錄
  let credits = await db.prepare(
    'SELECT * FROM credits WHERE user_id = ?'
  ).bind(userId).first();

  // 2. 如果有，直接返回
  if (credits) {
    return credits;
  }

  // 3. 如果沒有，自動創建
  console.warn(`[EnsureCredits] User ${userId} missing credits record, auto-creating...`);

  const now = Date.now();
  const nextMonthStart = new Date();
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1, 1);
  nextMonthStart.setHours(0, 0, 0, 0);

  try {
    await db.prepare(
      `INSERT INTO credits (
        id, user_id, balance, purchased_balance,
        plan_type, monthly_used, monthly_reset_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      `credit_${userId}`,
      userId,
      0,                // Free plan 初始 balance = 0
      0,                // 初始 purchased_balance = 0
      'free',           // monthly_quota 从 plans 表动态获取
      0,
      nextMonthStart.getTime(),
      now
    ).run();

    console.log(`[EnsureCredits] ✅ Created credits record for user ${userId}`);

    // 重新查詢並返回
    credits = await db.prepare(
      'SELECT * FROM credits WHERE user_id = ?'
    ).bind(userId).first();

    return credits;
  } catch (error) {
    console.error(`[EnsureCredits] ❌ Failed to create credits for user ${userId}:`, error);
    throw new Error('Failed to initialize credits');
  }
}

/**
 * 安全地獲取用戶 credits
 * 如果不存在會自動創建
 */
export async function getUserCredits(
  db: D1Database,
  userId: string
): Promise<{
  balance: number;
  planType: string;
  monthlyQuota: number;
  monthlyUsed: number;
}> {
  const credits = await ensureUserCredits(db, userId);
  
  return {
    balance: Number(credits.balance),
    planType: credits.plan_type as string,
    monthlyQuota: Number(credits.monthly_quota),
    monthlyUsed: Number(credits.monthly_used),
  };
}
