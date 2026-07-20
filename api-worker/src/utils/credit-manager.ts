// Credit 管理工具

import type { Env, CreditDeduction, TransactionType } from '../types';

/**
 * 有效方案 SQL 片段（entitlement gate）：
 * - admin plan_override 最優先（webhook 永不觸碰）
 * - 訂閱處於未付款狀態 → 只給 free 權益
 * - past_due 保留權益（grace period）；incomplete 不在此列 —
 *   它只發生在「首張 invoice 未付」（fulfill gate 本來就不會開通），
 *   續費 SCA 的正確狀態是 past_due，若把 incomplete 列入會誤傷已付費用戶
 * - 其餘用 Stripe 同步的 plan_type
 */
function effectivePlanSql(prefix: string): string {
  return `CASE
    WHEN ${prefix}plan_override IS NOT NULL THEN ${prefix}plan_override
    WHEN ${prefix}subscription_status IN ('unpaid', 'paused', 'incomplete_expired') THEN 'free'
    ELSE ${prefix}plan_type
  END`;
}

/**
 * 記錄 API 使用到 Analytics Engine
 */
export async function trackApiUsage(
  env: Env,
  data: {
    userId: string;
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    creditsUsed: number;
    responseTime?: number;
  }
) {
  try {
    env.TRACKER.writeDataPoint({
      blobs: [
        data.userId,           // blob1
        data.apiKeyId,         // blob2
        data.endpoint,         // blob3
        data.method,           // blob4
      ],
      doubles: [
        data.creditsUsed,      // double1
        data.responseTime || 0,  // double2
      ],
      indexes: [
        data.statusCode.toString(),  // index1
      ],
    });
  } catch (error) {
    console.error('Failed to track API usage:', error);
    // 不阻塞主流程
  }
}

/**
 * Credit 操作成本定義
 */
export const CREDIT_COSTS = {
  // 短網址操作
  LINK_CREATE: 1,
  LINK_READ: 0,           // 讀取免費
  LINK_UPDATE: 0.5,
  LINK_DELETE: 0,         // 刪除免費
  
  // 分析數據
  ANALYTICS_BASIC: 0.1,
  ANALYTICS_DETAILED: 1,
  
  // 批量操作
  BATCH_CREATE_BASE: 5,
  BATCH_CREATE_PER_LINK: 0.8,
} as const;

/**
 * 扣除 Credits（混合制邏輯）
 * 
 * 扣款順序：
 * 1. 優先使用月配額（monthly_quota）
 * 2. 月配額用完，使用超額（如果允許）
 * 3. 超額也用完，使用購買的 credits（purchased_balance）
 * 4. 全部用完，拒絕請求
 * 
 * @param env Cloudflare 環境
 * @param userId 用戶 ID
 * @param cost 操作成本（credits）
 * @param options 附加選項
 * @returns 扣除結果
 */
export async function deductCredits(
  env: Env,
  userId: string,
  cost: number,
  options: {
    type?: TransactionType;
    resourceType?: string;
    resourceId?: string;
    description?: string;
    apiKeyId?: string;
  } = {}
): Promise<CreditDeduction> {
  try {
    // 如果成本為 0，直接返回成功（免費操作）
    if (cost === 0) {
      return { success: true, balanceAfter: 0 };
    }

    // 1. 獲取當前 credit 狀態（JOIN plans 獲取動態配額）
    // 有效方案（entitlement gate）：
    //   - admin plan_override 最優先
    //   - 訂閱處於未付款狀態（unpaid/paused/incomplete/incomplete_expired）→ 只給 free 權益
    //   - 其餘用 Stripe 同步的 plan_type（past_due 保留權益作為 grace period）
    const creditResult = await env.DB.prepare(`
      SELECT
        c.balance,
        c.purchased_balance,
        ${effectivePlanSql('c.')} as plan_type,
        c.monthly_used,
        COALESCE(p.monthly_credits, 100) as monthly_quota
      FROM credits c
      LEFT JOIN plans p ON ${effectivePlanSql('c.')} = p.name
      WHERE c.user_id = ?
    `).bind(userId).first();

    if (!creditResult) {
      return {
        success: false,
        balanceAfter: 0,
        error: 'Credit account not found'
      };
    }

    const monthlyQuota = creditResult.monthly_quota as number;
    const monthlyUsed = creditResult.monthly_used as number;
    const planType = creditResult.plan_type as string;

    // 2. Enterprise 用戶無限制
    if (planType === 'enterprise') {
      const transactionId = await recordTransaction(env, userId, {
        type: 'usage_quota',
        amount: -cost,
        balanceAfter: creditResult.balance as number,
        description: options.description || 'Enterprise unlimited usage',
        apiKeyId: options.apiKeyId,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
      });

      return {
        success: true,
        balanceAfter: creditResult.balance as number,
        transactionId,
        usedQuota: true
      };
    }

    // 3. 優先使用月配額 — 條件式 UPDATE（原子 check-and-update）：
    // 並發請求各自重算條件，超出配額的那個 changes = 0，不可能超用
    const quotaResult = await env.DB.prepare(`
      UPDATE credits
      SET monthly_used = monthly_used + ?,
          total_used = total_used + ?,
          updated_at = ?
      WHERE user_id = ?
        AND monthly_used + ? <= (
          SELECT COALESCE(p.monthly_credits, 100) FROM plans p
          WHERE p.name = ${effectivePlanSql('credits.')}
        )
    `).bind(cost, cost, Date.now(), userId, cost).run();

    if ((quotaResult.meta?.changes ?? 0) === 1) {
      const transactionId = await recordTransaction(env, userId, {
        type: 'usage_quota',
        amount: -cost,
        balanceAfter: creditResult.balance as number,
        description: options.description || `使用月配額（${monthlyUsed + cost}/${monthlyQuota}）`,
        apiKeyId: options.apiKeyId,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
      });

      return {
        success: true,
        balanceAfter: creditResult.balance as number,
        transactionId,
        usedQuota: true
      };
    }

    // 4. 月配額不足，使用永久 credits（Pool B）— 同樣條件式 UPDATE，
    // balance >= cost 在 UPDATE 內驗證，並發時不可能扣成負數
    const balanceResult = await env.DB.prepare(`
      UPDATE credits
      SET balance = balance - ?,
          total_used = total_used + ?,
          updated_at = ?
      WHERE user_id = ? AND balance >= ?
    `).bind(cost, cost, Date.now(), userId, cost).run();

    if ((balanceResult.meta?.changes ?? 0) !== 1) {
      return {
        success: false,
        balanceAfter: creditResult.balance as number,
        error: 'Insufficient credits'
      };
    }

    const afterRow = await env.DB.prepare(`
      SELECT balance FROM credits WHERE user_id = ?
    `).bind(userId).first();
    const newBalance = (afterRow?.balance as number) ?? 0;

    const transactionId = await recordTransaction(env, userId, {
      type: options.type || 'usage',
      amount: -cost,
      balanceAfter: newBalance,
      description: options.description,
      apiKeyId: options.apiKeyId,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
    });

    return {
      success: true,
      balanceAfter: newBalance,
      transactionId
    };

  } catch (error) {
    console.error('Credit deduction error:', error);
    return {
      success: false,
      balanceAfter: 0,
      error: 'Internal error during credit deduction'
    };
  }
}

/**
 * 增加 Credits
 */
export async function addCredits(
  env: Env,
  userId: string,
  amount: number,
  options: {
    type: TransactionType;
    description?: string;
    metadata?: Record<string, any>;
  }
): Promise<{ success: boolean; balanceAfter: number; transactionId?: string }> {
  try {
    // 更新餘額
    const result = await env.DB.prepare(`
      UPDATE credits
      SET balance = balance + ?,
          purchased_balance = purchased_balance + ?,
          total_purchased = total_purchased + ?,
          updated_at = ?
      WHERE user_id = ?
      RETURNING balance
    `).bind(amount, amount, amount, Date.now(), userId).first();
    
    if (!result) {
      return { success: false, balanceAfter: 0 };
    }
    
    // 記錄交易
    const transactionId = await recordTransaction(env, userId, {
      type: options.type,
      amount: amount,
      balanceAfter: result.balance as number,
      description: options.description,
      metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
    });
    
    return {
      success: true,
      balanceAfter: result.balance as number,
      transactionId
    };
    
  } catch (error) {
    console.error('Add credits error:', error);
    return { success: false, balanceAfter: 0 };
  }
}

/**
 * 記錄 Credit 交易
 */
async function recordTransaction(
  env: Env,
  userId: string,
  data: {
    type: TransactionType;
    amount: number;
    balanceAfter: number;
    description?: string;
    apiKeyId?: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: string;
  }
): Promise<string> {
  const transactionId = crypto.randomUUID();
  
  await env.DB.prepare(`
    INSERT INTO credit_transactions (
      id, user_id, type, amount, balance_after,
      resource_type, resource_id, description, metadata, api_key_id,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    transactionId,
    userId,
    data.type,
    data.amount,
    data.balanceAfter,
    data.resourceType || null,
    data.resourceId || null,
    data.description || null,
    data.metadata || null,
    data.apiKeyId || null,
    Date.now()
  ).run();
  
  return transactionId;
}

/**
 * 獲取用戶 Credit 餘額
 */
export async function getCreditBalance(
  env: Env,
  userId: string
): Promise<{
  balance: number;
  monthlyQuota: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  planType: string;
} | null> {
  const result = await env.DB.prepare(`
    SELECT
      c.balance,
      COALESCE(p.monthly_credits, 100) as monthly_quota,
      c.monthly_used,
      ${effectivePlanSql('c.')} as plan_type
    FROM credits c
    LEFT JOIN plans p ON ${effectivePlanSql('c.')} = p.name
    WHERE c.user_id = ?
  `).bind(userId).first();

  if (!result) return null;

  return {
    balance: result.balance as number,
    monthlyQuota: result.monthly_quota as number,
    monthlyUsed: result.monthly_used as number,
    monthlyRemaining: (result.monthly_quota as number) - (result.monthly_used as number),
    planType: result.plan_type as string,
  };
}

