// Plans Management API
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/role';
import type { Env } from '../types';

const plans = new Hono<{ Bindings: Env }>();

// 使用 requireAuth 而不是 createAuthMiddleware
plans.use('*', requireAuth);

// 獲取所有方案
plans.get('/', requireAdmin(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM plans ORDER BY sort_order ASC'
    ).all();

    // 獲取每個方案的訂閱數
    const plansWithStats = await Promise.all(
      results.map(async (plan: any) => {
        const subscribers = await c.env.DB.prepare(
          'SELECT COUNT(*) as count FROM credits WHERE plan_type = ?'
        ).bind(plan.name).first() as any;

        return {
          ...plan,
          features: plan.features ? JSON.parse(plan.features) : [],
          subscriber_count: subscribers?.count || 0
        };
      })
    );

    return c.json({ data: { plans: plansWithStats } });
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return c.json({ error: 'Failed to fetch plans' }, 500);
  }
});

// 更新方案
plans.put('/:id', requireAdmin(), async (c) => {
  const { id } = c.req.param();
  const updates = await c.req.json();
  const userId = c.get('userId') as string;

  try {
    // 獲取舊值（用於記錄）
    const oldPlan = await c.env.DB.prepare(
      'SELECT * FROM plans WHERE id = ?'
    ).bind(id).first() as any;

    if (!oldPlan) {
      return c.json({ error: 'Plan not found' }, 404);
    }

    // 更新方案
    const fields: string[] = [];
    const bindings: any[] = [];

    if (updates.display_name) {
      fields.push('display_name = ?');
      bindings.push(updates.display_name);
    }
    if (updates.price_monthly !== undefined) {
      fields.push('price_monthly = ?');
      bindings.push(Number(updates.price_monthly));
    }
    if (updates.price_yearly !== undefined) {
      fields.push('price_yearly = ?');
      bindings.push(Number(updates.price_yearly));
    }
    if (updates.monthly_credits !== undefined) {
      fields.push('monthly_credits = ?');
      bindings.push(Number(updates.monthly_credits));
    }
    if (updates.api_calls_per_day !== undefined) {
      fields.push('api_calls_per_day = ?');
      bindings.push(Number(updates.api_calls_per_day));
    }
    if (updates.max_api_keys !== undefined) {
      fields.push('max_api_keys = ?');
      bindings.push(Number(updates.max_api_keys));
    }
    if (updates.features) {
      fields.push('features = ?');
      bindings.push(JSON.stringify(updates.features));
    }

    if (fields.length === 0) {
      return c.json({ error: 'No fields' }, 400);
    }

    fields.push('updated_at = ?');
    bindings.push(Date.now());
    bindings.push(id);

    const sql = `UPDATE plans SET ${fields.join(', ')} WHERE id = ?`;
    await c.env.DB.prepare(sql).bind(...bindings).run();

    // 記錄審計日誌
    try {
      const { logAuditAction } = await import('../middleware/audit');
      await logAuditAction(
        c.env,
        userId,
        userEmail,
        userRole,
        'update_plan',
        'plan',
        id,
        oldPlan,
        updates,
        c.req.raw
      );
    } catch (auditError) {
      console.error('[UpdatePlan] Failed to log audit:', auditError);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to update plan:', error);
    return c.json({ error: 'Failed to update plan' }, 500);
  }
});

// 獲取方案變更歷史
plans.get('/:id/history', requireAdmin(), async (c) => {
  const { id } = c.req.param();

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT h.*, u.email as changed_by_email
      FROM plan_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.plan_id = ?
      ORDER BY h.created_at DESC
    `).bind(id).all();

    return c.json({ data: { history: results } });
  } catch (error) {
    console.error('Failed to fetch plan history:', error);
    return c.json({ error: 'Failed to fetch plan history' }, 500);
  }
});

export default plans;
