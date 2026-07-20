// Support Tickets API
import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/role';
import type { Env } from '../types';

const support = new Hono<{ Bindings: Env }>();

support.use('*', requireAuth);

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
  const body = await c.req.json();
  const message = body.message;
  const userId = c.get('userId') as string;
  const jwtPayload = c.get('jwtPayload') as any;
  const userRole = jwtPayload?.role || 'admin';

  if (!message) {
    return c.json({ error: 'Message is required' }, 400);
  }

  try {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('[Reply] Creating message:', { messageId, ticketId: id, userId, userRole });

    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (id, ticket_id, user_id, user_role, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(messageId, id, userId, userRole, message, Date.now()).run();

    await c.env.DB.prepare(
      'UPDATE support_tickets SET updated_at = ? WHERE id = ?'
    ).bind(Date.now(), id).run();

    console.log('[Reply] Success');
    return c.json({ success: true, message_id: messageId });
  } catch (error) {
    console.error('Failed to reply to ticket:', error);
    return c.json({ error: 'Failed to reply', details: String(error) }, 500);
  }
});

// ==========================================
// 用戶端 Support 路由（掛在 /api/support，只能操作自己的工單）
// ==========================================

const VALID_CATEGORIES = ['billing', 'technical', 'abuse', 'feature_request', 'other'];
const MAX_OPEN_TICKETS_PER_USER = 10;

export const userSupport = new Hono<{ Bindings: Env }>();

userSupport.use('*', requireAuth);

// 建立工單
userSupport.post('/tickets', async (c) => {
  const userId = c.get('userId') as string;

  try {
    const body = await c.req.json();
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const category = VALID_CATEGORIES.includes(body.category) ? body.category : 'other';

    if (!subject || !message) {
      return c.json({ error: 'Subject and message are required' }, 400);
    }
    if (subject.length > 200) {
      return c.json({ error: 'Subject must be less than 200 characters' }, 400);
    }
    if (message.length > 5000) {
      return c.json({ error: 'Message must be less than 5000 characters' }, 400);
    }

    // 防灌單：同用戶未結案工單上限
    const openCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM support_tickets
      WHERE user_id = ? AND status IN ('open', 'in_progress')
    `).bind(userId).first();

    if ((openCount?.count as number || 0) >= MAX_OPEN_TICKETS_PER_USER) {
      return c.json({
        error: 'Too many open tickets',
        message: `You have reached the limit of ${MAX_OPEN_TICKETS_PER_USER} open tickets. Please wait for existing tickets to be resolved.`
      }, 429);
    }

    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await c.env.DB.prepare(`
      INSERT INTO support_tickets (id, user_id, title, description, status, priority, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'open', 'medium', ?, ?, ?)
    `).bind(ticketId, userId, subject, message, category, now, now).run();

    return c.json({
      success: true,
      data: { id: ticketId, title: subject, status: 'open', category, created_at: now }
    }, 201);
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return c.json({ error: 'Failed to create ticket' }, 500);
  }
});

// 我的工單列表
userSupport.get('/tickets', async (c) => {
  const userId = c.get('userId') as string;

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT id, title, status, priority, category, created_at, updated_at, resolved_at, closed_at
      FROM support_tickets
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    return c.json({ success: true, data: { tickets: results, total: results.length } });
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return c.json({ error: 'Failed to fetch tickets' }, 500);
  }
});

// 我的工單詳情（含對話）
userSupport.get('/tickets/:id', async (c) => {
  const userId = c.get('userId') as string;
  const { id } = c.req.param();

  try {
    const ticket = await c.env.DB.prepare(`
      SELECT id, title, description, status, priority, category, created_at, updated_at, resolved_at, closed_at
      FROM support_tickets
      WHERE id = ? AND user_id = ?
    `).bind(id, userId).first();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    const { results: messages } = await c.env.DB.prepare(`
      SELECT id, user_role, message, created_at
      FROM ticket_messages
      WHERE ticket_id = ?
      ORDER BY created_at ASC
    `).bind(id).all();

    return c.json({ success: true, data: { ticket, messages } });
  } catch (error) {
    console.error('Failed to fetch ticket:', error);
    return c.json({ error: 'Failed to fetch ticket' }, 500);
  }
});

// 回覆自己的工單（resolved 會重開；closed 不可回覆）
userSupport.post('/tickets/:id/reply', async (c) => {
  const userId = c.get('userId') as string;
  const { id } = c.req.param();

  try {
    const body = await c.req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }
    if (message.length > 5000) {
      return c.json({ error: 'Message must be less than 5000 characters' }, 400);
    }

    const ticket = await c.env.DB.prepare(`
      SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?
    `).bind(id, userId).first();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }
    if (ticket.status === 'closed') {
      return c.json({ error: 'Ticket is closed', message: 'This ticket is closed. Please open a new ticket.' }, 400);
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await c.env.DB.prepare(`
      INSERT INTO ticket_messages (id, ticket_id, user_id, user_role, message, created_at)
      VALUES (?, ?, ?, 'user', ?, ?)
    `).bind(messageId, id, userId, message, now).run();

    // 用戶回覆 resolved 工單 = 問題沒解決，重開
    const newStatus = ticket.status === 'resolved' ? 'open' : ticket.status;
    await c.env.DB.prepare(`
      UPDATE support_tickets SET status = ?, updated_at = ?, resolved_at = NULL WHERE id = ?
    `).bind(newStatus, now, id).run();

    return c.json({ success: true, data: { message_id: messageId, status: newStatus } });
  } catch (error) {
    console.error('Failed to reply to ticket:', error);
    return c.json({ error: 'Failed to reply', details: String(error) }, 500);
  }
});

// ==========================================
// Email inbound 建工單（mailhandler 服務對服務，掛 /api/support/inbound）
// 驗證：X-Inbound-Token header 比對 INBOUND_TICKET_TOKEN secret（無 JWT）。
// 寄件者 email 對得上 users 表才建單；對不上回 404，mailhandler 維持只告警。
// ==========================================

export const inboundSupport = new Hono<{ Bindings: Env }>();

inboundSupport.post('/', async (c) => {
  const token = c.req.header('X-Inbound-Token');
  if (!c.env.INBOUND_TICKET_TOKEN || token !== c.env.INBOUND_TICKET_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await c.req.json();
    const fromEmail = typeof body.from_email === 'string' ? body.from_email.trim().toLowerCase() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, 200) : '';
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 5000) : '';
    const category = VALID_CATEGORIES.includes(body.category) ? body.category : 'other';

    if (!fromEmail || !message) {
      return c.json({ error: 'from_email and message are required' }, 400);
    }

    const user = await c.env.DB.prepare(`
      SELECT id FROM users WHERE lower(email) = ?
    `).bind(fromEmail).first() as { id: string } | null;

    if (!user) {
      return c.json({ error: 'unknown_sender' }, 404);
    }

    // 同一寄件者防灌單（與網頁建單同一上限）
    const openCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM support_tickets
      WHERE user_id = ? AND status IN ('open', 'in_progress')
    `).bind(user.id).first();

    if ((openCount?.count as number || 0) >= MAX_OPEN_TICKETS_PER_USER) {
      return c.json({ error: 'too_many_open_tickets' }, 429);
    }

    const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await c.env.DB.prepare(`
      INSERT INTO support_tickets (id, user_id, title, description, status, priority, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'open', 'medium', ?, ?, ?)
    `).bind(ticketId, user.id, subject || '(no subject)', message, category, now, now).run();

    return c.json({ success: true, data: { id: ticketId, user_id: user.id } }, 201);
  } catch (error) {
    console.error('Failed to create inbound ticket:', error);
    return c.json({ error: 'Failed to create ticket' }, 500);
  }
});

export default support;
