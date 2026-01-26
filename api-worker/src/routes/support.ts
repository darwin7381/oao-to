// Support Tickets API
import { Hono } from 'hono';
import { createAuthMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/role';
import type { Env } from '../types';

const support = new Hono<{ Bindings: Env }>();

support.use('*', async (c, next) => {
  const middleware = createAuthMiddleware(c.env.JWT_SECRET);
  return middleware(c, next);
});

// 獲取所有 Tickets
support.get('/tickets', requireAdmin(), async (c) => {
  try {
    const status = c.req.query('status');
    const priority = c.req.query('priority');
    const assignedTo = c.req.query('assigned_to');

    let query = `
      SELECT t.*, u.email as user_email, u.name as user_name,
             a.email as assigned_to_email
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE 1=1
    `;
    const bindings: any[] = [];

    if (status) {
      query += ' AND t.status = ?';
      bindings.push(status);
    }
    if (priority) {
      query += ' AND t.priority = ?';
      bindings.push(priority);
    }
    if (assignedTo) {
      query += ' AND t.assigned_to = ?';
      bindings.push(assignedTo);
    }

    query += ' ORDER BY t.created_at DESC';

    const { results } = await c.env.DB.prepare(query).bind(...bindings).all();

    return c.json({ data: { tickets: results } });
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return c.json({ error: 'Failed to fetch tickets' }, 500);
  }
});

// 獲取單個 Ticket 詳情（含所有 messages）
support.get('/tickets/:id', requireAdmin(), async (c) => {
  const { id } = c.req.param();

  try {
    const ticket = await c.env.DB.prepare(`
      SELECT t.*, u.email as user_email, u.name as user_name,
             a.email as assigned_to_email
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users a ON t.assigned_to = a.id
      WHERE t.id = ?
    `).bind(id).first();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    const { results: messages } = await c.env.DB.prepare(`
      SELECT m.*, u.email as user_email
      FROM ticket_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC
    `).bind(id).all();

    return c.json({
      data: {
        ticket,
        messages
      }
    });
  } catch (error) {
    console.error('Failed to fetch ticket:', error);
    return c.json({ error: 'Failed to fetch ticket' }, 500);
  }
});

// 更新 Ticket
support.put('/tickets/:id', requireAdmin(), async (c) => {
  const { id } = c.req.param();
  const { status, priority, assigned_to } = await c.req.json();

  try {
    const updates: string[] = [];
    const bindings: any[] = [];

    if (status) {
      updates.push('status = ?');
      bindings.push(status);
      
      if (status === 'resolved') {
        updates.push('resolved_at = ?');
        bindings.push(Date.now());
      } else if (status === 'closed') {
        updates.push('closed_at = ?');
        bindings.push(Date.now());
      }
    }

    if (priority) {
      updates.push('priority = ?');
      bindings.push(priority);
    }

    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      bindings.push(assigned_to);
    }

    updates.push('updated_at = ?');
    bindings.push(Date.now());

    bindings.push(id);

    await c.env.DB.prepare(
      `UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...bindings).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Failed to update ticket:', error);
    return c.json({ error: 'Failed to update ticket' }, 500);
  }
});

// 回覆 Ticket
support.post('/tickets/:id/reply', requireAdmin(), async (c) => {
  const { id } = c.req.param();
  const { message } = await c.req.json();
  const userId = c.get('userId') as string;

  if (!message) {
    return c.json({ error: 'Message is required' }, 400);
  }

  try {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (id, ticket_id, user_id, user_role, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(messageId, id, userId, 'admin', message, Date.now()).run();

    await c.env.DB.prepare(
      'UPDATE support_tickets SET updated_at = ? WHERE id = ?'
    ).bind(Date.now(), id).run();

    return c.json({ success: true, message_id: messageId });
  } catch (error) {
    console.error('Failed to reply to ticket:', error);
    return c.json({ error: 'Failed to reply' }, 500);
  }
});

export default support;
