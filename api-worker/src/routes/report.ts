// 公開連結檢舉端點（無需登入）
// POST /api/report — 任何人可檢舉惡意/濫用短網址；IP rate limit 防灌
// 檢舉只落 D1 + 審計，不自動下架（避免被惡意大量檢舉當武器）；admin 在後台審核

import { Hono } from 'hono';
import type { Env, LinkData } from '../types';
import { checkApiKeyRateLimit } from '../utils/rate-limiter';

const report = new Hono<{ Bindings: Env }>();

const VALID_REASONS = ['phishing', 'malware', 'spam', 'scam', 'illegal', 'other'] as const;

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

report.post('/', async (c) => {
  // IP rate limit：5/分鐘、20/天（DO 原子計數）
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const rl = await checkApiKeyRateLimit(c.env, `report-ip:${ip}`, 5, 20);
  if (!rl.allowed) {
    return c.json({ error: 'Too many reports, please try again later' }, 429);
  }

  let body: { slug?: string; reason?: string; details?: string; email?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // slug 可傳純 slug 或完整短網址（https://oao.to/xxx）
  let slug = (body.slug || '').trim();
  const urlMatch = slug.match(/^https?:\/\/(?:www\.)?oao\.to\/([a-zA-Z0-9-_]{1,50})\/?$/);
  if (urlMatch) slug = urlMatch[1];

  if (!/^[a-zA-Z0-9-_]{1,50}$/.test(slug)) {
    return c.json({ error: 'Invalid slug or short URL' }, 400);
  }

  const reason = (body.reason || '').trim() as (typeof VALID_REASONS)[number];
  if (!VALID_REASONS.includes(reason)) {
    return c.json({ error: `reason must be one of: ${VALID_REASONS.join(', ')}` }, 400);
  }

  const details = (body.details || '').trim().slice(0, 2000) || null;
  const email = (body.email || '').trim().slice(0, 200) || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'Invalid email format' }, 400);
  }

  // 確認連結存在（slug 本來就是公開資訊，404 不構成洩漏）
  const kvStr = await c.env.LINKS.get(`link:${slug}`);
  if (!kvStr) {
    return c.json({ error: 'Link not found' }, 404);
  }
  const linkData = JSON.parse(kvStr) as LinkData;

  const now = Date.now();
  const id = `rpt_${now}_${Math.random().toString(36).slice(2, 10)}`;
  const ipHash = await sha256Hex(ip);

  // 同 IP 對同 slug 24h 內只收一次（防單人灌報告）
  const dup = await c.env.DB.prepare(
    `SELECT id FROM link_reports WHERE slug = ? AND reporter_ip_hash = ? AND created_at > ? LIMIT 1`
  ).bind(slug, ipHash, now - 24 * 60 * 60 * 1000).first();
  if (dup) {
    return c.json({ success: true, message: 'Report already received' });
  }

  await c.env.DB.prepare(
    `INSERT INTO link_reports (id, slug, url, reason, details, reporter_email, reporter_ip_hash, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(id, slug, linkData.url || null, reason, details, email, ipHash, now).run();

  console.log(`[report] New report ${id} for /${slug} (${reason})`);

  return c.json({ success: true, message: 'Report received. Our team will review it shortly.' }, 201);
});

export default report;
