// 用戶帳戶管理路由（Credits 等）

import { Hono } from 'hono';
import type { Env } from '../types';
import { requireAuth } from '../middleware/auth';
import { getCreditBalance } from '../utils/credit-manager';

const router = new Hono<{ Bindings: Env }>();

/**
 * 獲取 Credit 餘額和方案資訊
 * GET /api/account/credits
 */
router.get('/credits', requireAuth, async (c) => {
  const userId = c.get('userId');
  
  const result = await c.env.DB.prepare(`
    SELECT 
      balance,
      subscription_balance,
      purchased_balance,
      total_purchased,
      total_used,
      plan_type,
      plan_renewed_at,
      monthly_quota,
      monthly_used,
      monthly_reset_at,
      overage_limit,
      overage_used,
      overage_rate
    FROM credits
    WHERE user_id = ?
  `).bind(userId).first();
  
  if (!result) {
    return c.json({ error: 'Credits account not found' }, 404);
  }
  
  const monthlyRemaining = (result.monthly_quota as number) - (result.monthly_used as number);
  const overageRemaining = (result.overage_limit as number) - (result.overage_used as number);
  
  return c.json({
    success: true,
    data: {
      balance: {
        total: result.balance,
        subscription: result.subscription_balance,
        purchased: result.purchased_balance,
      },
      plan: {
        type: result.plan_type,
        renewedAt: result.plan_renewed_at,
        monthlyQuota: result.monthly_quota,
        monthlyUsed: result.monthly_used,
        monthlyRemaining: Math.max(0, monthlyRemaining),
        monthlyResetAt: result.monthly_reset_at,
      },
      overage: {
        limit: result.overage_limit,
        used: result.overage_used,
        remaining: Math.max(0, overageRemaining),
        rate: result.overage_rate,
      },
      statistics: {
        totalPurchased: result.total_purchased,
        totalUsed: result.total_used,
      }
    }
  });
});

/**
 * 獲取 Credit 交易記錄
 * GET /api/account/transactions
 */
router.get('/transactions', requireAuth, async (c) => {
  const userId = c.get('userId');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = parseInt(c.req.query('offset') || '0');
  
  const result = await c.env.DB.prepare(`
    SELECT 
      id,
      type,
      amount,
      balance_after,
      resource_type,
      resource_id,
      description,
      api_key_id,
      created_at
    FROM credit_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(userId, limit, offset).all();
  
  const countResult = await c.env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM credit_transactions
    WHERE user_id = ?
  `).bind(userId).first();
  
  return c.json({
    success: true,
    data: {
      transactions: result.results.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        balanceAfter: tx.balance_after,
        resourceType: tx.resource_type,
        resourceId: tx.resource_id,
        description: tx.description,
        apiKeyId: tx.api_key_id,
        createdAt: tx.created_at,
      })),
      pagination: {
        limit,
        offset,
        total: countResult?.count as number || 0,
      }
    }
  });
});

/**
 * 獲取使用統計
 * GET /api/account/usage
 */
router.get('/usage', requireAuth, async (c) => {
  const userId = c.get('userId');
  const period = c.req.query('period') || '30d'; // 30d, 7d, 1d
  
  // 計算日期範圍
  let daysBack = 30;
  if (period === '7d') daysBack = 7;
  if (period === '1d') daysBack = 1;
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  // 獲取統計數據
  const statsResult = await c.env.DB.prepare(`
    SELECT 
      date,
      SUM(total_requests) as requests,
      SUM(successful_requests) as successful,
      SUM(failed_requests) as failed,
      SUM(link_creates) as creates,
      SUM(credits_used) as credits
    FROM api_usage_stats
    WHERE user_id = ? AND date >= ?
    GROUP BY date
    ORDER BY date ASC
  `).bind(userId, startDateStr).all();
  
  // 計算總計
  const totals = statsResult.results.reduce((acc: any, row: any) => ({
    requests: acc.requests + (row.requests || 0),
    successful: acc.successful + (row.successful || 0),
    failed: acc.failed + (row.failed || 0),
    creates: acc.creates + (row.creates || 0),
    credits: acc.credits + (row.credits || 0),
  }), { requests: 0, successful: 0, failed: 0, creates: 0, credits: 0 });
  
  return c.json({
    success: true,
    data: {
      period,
      daily: statsResult.results.map(row => ({
        date: row.date,
        requests: row.requests,
        successful: row.successful,
        failed: row.failed,
        creates: row.creates,
        credits: row.credits,
      })),
      totals,
      successRate: totals.requests > 0 
        ? ((totals.successful / totals.requests) * 100).toFixed(2)
        : '0.00'
    }
  });
});

export default router;


