// 管理員 API 路由

import { Hono } from 'hono';
import { createAuthMiddleware } from '../middleware/auth';
import { requireAdmin, requireSuperAdmin } from '../middleware/role';
import type { Env } from '../types';

const admin = new Hono<{ Bindings: Env }>();

// 所有管理員路由都需要 JWT 認證
admin.use('*', async (c, next) => {
  const middleware = createAuthMiddleware(c.env.JWT_SECRET);
  return middleware(c, next);
});

// 獲取所有用戶（需要管理員權限）
admin.get('/users', requireAdmin(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, email, name, avatar, role, created_at FROM users ORDER BY created_at DESC'
    ).all();

    return c.json({
      users: results,
      total: results.length,
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// 更新用戶角色（需要超級管理員權限）
admin.put('/users/:userId/role', requireSuperAdmin(), async (c) => {
  const { userId } = c.req.param();
  const { role } = await c.req.json();

  // 驗證角色
  if (!['user', 'admin', 'superadmin'].includes(role)) {
    return c.json({ error: 'Invalid role' }, 400);
  }

  try {
    await c.env.DB.prepare(
      'UPDATE users SET role = ?, updated_at = ? WHERE id = ?'
    ).bind(role, Date.now(), userId).run();

    return c.json({ success: true, message: 'Role updated' });
  } catch (error) {
    console.error('Failed to update role:', error);
    return c.json({ error: 'Failed to update role' }, 500);
  }
});

// 獲取系統統計（需要管理員權限）
admin.get('/stats', requireAdmin(), async (c) => {
  try {
    const totalUsers = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users'
    ).first() as any;

    const totalLinks = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM links'
    ).first() as any;

    const usersByRole = await c.env.DB.prepare(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    ).all();

    return c.json({
      totalUsers: totalUsers?.count || 0,
      totalLinks: totalLinks?.count || 0,
      usersByRole: usersByRole.results,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

export default admin;


