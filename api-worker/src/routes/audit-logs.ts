// Audit Logs API
import { Hono } from 'hono';
import { createAuthMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/role';
import type { Env } from '../types';

const auditLogs = new Hono<{ Bindings: Env }>();

auditLogs.use('*', async (c, next) => {
  const middleware = createAuthMiddleware(c.env.JWT_SECRET);
  return middleware(c, next);
});

// 獲取 Audit Logs 列表
auditLogs.get('/', requireAdmin(), async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    const action = c.req.query('action');
    const userId = c.req.query('user_id');
    const resourceType = c.req.query('resource_type');

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const bindings: any[] = [];

    if (action) {
      query += ' AND action = ?';
      bindings.push(action);
    }
    if (userId) {
      query += ' AND user_id = ?';
      bindings.push(userId);
    }
    if (resourceType) {
      query += ' AND resource_type = ?';
      bindings.push(resourceType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...bindings).all();
    const total = await c.env.DB.prepare('SELECT COUNT(*) as count FROM audit_logs').first() as any;

    return c.json({
      data: {
        logs: results,
        total: total?.count || 0,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return c.json({ error: 'Failed to fetch audit logs' }, 500);
  }
});

// 獲取單個 Audit Log 詳情
auditLogs.get('/:id', requireAdmin(), async (c) => {
  const { id } = c.req.param();

  try {
    const log = await c.env.DB.prepare(
      'SELECT * FROM audit_logs WHERE id = ?'
    ).bind(id).first();

    if (!log) {
      return c.json({ error: 'Audit log not found' }, 404);
    }

    return c.json({ data: log });
  } catch (error) {
    console.error('Failed to fetch audit log:', error);
    return c.json({ error: 'Failed to fetch audit log' }, 500);
  }
});

export default auditLogs;
