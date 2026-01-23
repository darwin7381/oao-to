// 測試環境變量

import { Hono } from 'hono';
import type { Env } from '../types';

const testEnv = new Hono<{ Bindings: Env }>();

// 檢查環境變量
testEnv.get('/check', async (c) => {
  return c.json({
    hasAccountId: !!c.env.CLOUDFLARE_ACCOUNT_ID,
    hasApiToken: !!c.env.CLOUDFLARE_API_TOKEN,
    accountIdLength: c.env.CLOUDFLARE_ACCOUNT_ID?.length || 0,
    apiTokenLength: c.env.CLOUDFLARE_API_TOKEN?.length || 0,
    accountIdPrefix: c.env.CLOUDFLARE_ACCOUNT_ID?.substring(0, 8) || 'none',
    apiTokenPrefix: c.env.CLOUDFLARE_API_TOKEN?.substring(0, 10) || 'none',
  });
});

export default testEnv;


