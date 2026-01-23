// Credit 管理工具

import type { Env, CreditDeduction, TransactionType } from '../types';

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

    // 1. 獲取當前 credit 狀態
    const creditResult = await env.DB.prepare(`
      SELECT 
        balance,
        subscription_balance,
        purchased_balance,
        plan_type,
        monthly_quota,
        monthly_used,
        overage_limit,
        overage_used,
        overage_rate
      FROM credits
      WHERE user_id = ?
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
    const overageLimit = creditResult.overage_limit as number;
    const overageUsed = creditResult.overage_used as number;
    const purchasedBalance = creditResult.purchased_balance as number;
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
    
    // 3. 優先使用月配額
    const remainingQuota = monthlyQuota - monthlyUsed;
    
    if (remainingQuota >= cost) {
      // 完全從月配額扣除
      await env.DB.prepare(`
        UPDATE credits
        SET monthly_used = monthly_used + ?,
            total_used = total_used + ?,
            updated_at = ?
        WHERE user_id = ?
      `).bind(cost, cost, Date.now(), userId).run();
      
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
    
    // 4. 月配額不足，檢查是否允許超額
    if (overageLimit > 0) {
      const remainingOverage = overageLimit - overageUsed;
      const neededFromOverage = cost - remainingQuota;
      
      if (remainingOverage >= neededFromOverage) {
        // 可以用超額
        await env.DB.prepare(`
          UPDATE credits
          SET monthly_used = monthly_quota,
              overage_used = overage_used + ?,
              total_used = total_used + ?,
              updated_at = ?
          WHERE user_id = ?
        `).bind(neededFromOverage, cost, Date.now(), userId).run();
        
        const transactionId = await recordTransaction(env, userId, {
          type: 'usage_overage',
          amount: -cost,
          balanceAfter: creditResult.balance as number,
          description: options.description || `使用超額（${overageUsed + neededFromOverage}/${overageLimit}）`,
          apiKeyId: options.apiKeyId,
          resourceType: options.resourceType,
          resourceId: options.resourceId,
        });
        
        return { 
          success: true, 
          balanceAfter: creditResult.balance as number,
          transactionId,
          usedOverage: true
        };
      }
    }
    
    // 5. 配額和超額都不夠，使用購買的 credits
    if (purchasedBalance < cost) {
      return { 
        success: false, 
        balanceAfter: purchasedBalance, 
        error: 'Insufficient credits' 
      };
    }
    
    const newPurchasedBalance = purchasedBalance - cost;
    const newTotalBalance = (creditResult.balance as number) - cost;
    
    await env.DB.prepare(`
      UPDATE credits
      SET balance = balance - ?,
          purchased_balance = purchased_balance - ?,
          total_used = total_used + ?,
          updated_at = ?
      WHERE user_id = ?
    `).bind(cost, cost, cost, Date.now(), userId).run();
    
    const transactionId = await recordTransaction(env, userId, {
      type: options.type || 'usage',
      amount: -cost,
      balanceAfter: newTotalBalance,
      description: options.description,
      apiKeyId: options.apiKeyId,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
    });
    
    return { 
      success: true, 
      balanceAfter: newTotalBalance,
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
      balance,
      monthly_quota,
      monthly_used,
      plan_type
    FROM credits
    WHERE user_id = ?
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

