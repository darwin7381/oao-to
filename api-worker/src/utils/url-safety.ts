// URL 安全檢查（濫用防護）
// 分層檢查：協議白名單 → 自我引用 → 封鎖網域清單（D1）→ Google Safe Browsing（可選）
// Safe Browsing 未設 key 或呼叫失敗時 fail-open（不擋建立），其餘層失敗一律擋下

import type { Env } from '../types';

export interface UrlSafetyResult {
  safe: boolean;
  reason?: string;
  source?: 'protocol' | 'self_reference' | 'blocklist' | 'safe_browsing';
}

/**
 * 檢查目標 URL 是否允許建立短網址
 */
export async function checkUrlSafety(env: Env, rawUrl: string): Promise<UrlSafetyResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: 'Invalid URL format', source: 'protocol' };
  }

  // 1. 只允許 http/https（擋 javascript:/data:/file: 等）
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: 'Only http/https URLs are allowed', source: 'protocol' };
  }

  // 2. 禁止縮短自家網址（重定向迴圈 / 繞過停用）
  const host = parsed.hostname.toLowerCase();
  if (host === 'oao.to' || host.endsWith('.oao.to')) {
    return { safe: false, reason: 'Cannot shorten oao.to URLs', source: 'self_reference' };
  }

  // 3. 封鎖網域清單（含父網域比對：evil.example.com 會命中 example.com 的封鎖）
  try {
    const parts = host.split('.');
    const candidates: string[] = [];
    for (let i = 0; i < parts.length - 1; i++) {
      candidates.push(parts.slice(i).join('.'));
    }
    if (host !== '' ) candidates.unshift(host);
    const unique = [...new Set(candidates)];
    if (unique.length > 0) {
      const placeholders = unique.map(() => '?').join(',');
      const row = await env.DB.prepare(
        `SELECT domain FROM banned_domains WHERE domain IN (${placeholders}) LIMIT 1`
      ).bind(...unique).first();
      if (row) {
        return { safe: false, reason: 'This domain is not allowed', source: 'blocklist' };
      }
    }
  } catch (err) {
    // 表不存在（migration 未套）或查詢失敗 → 不擋，但記 log
    console.error('[url-safety] blocklist check failed (fail-open):', err);
  }

  // 4. Google Safe Browsing v4（設定 SAFE_BROWSING_API_KEY 才啟用；失敗 fail-open）
  if (env.SAFE_BROWSING_API_KEY) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${env.SAFE_BROWSING_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: { clientId: 'oao-to', clientVersion: '1.0.0' },
            threatInfo: {
              threatTypes: [
                'MALWARE',
                'SOCIAL_ENGINEERING',
                'UNWANTED_SOFTWARE',
                'POTENTIALLY_HARMFUL_APPLICATION',
              ],
              platformTypes: ['ANY_PLATFORM'],
              threatEntryTypes: ['URL'],
              threatEntries: [{ url: rawUrl }],
            },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timer);
      if (resp.ok) {
        const data = (await resp.json()) as { matches?: { threatType: string }[] };
        if (data.matches && data.matches.length > 0) {
          return {
            safe: false,
            reason: `URL flagged by Google Safe Browsing (${data.matches[0].threatType})`,
            source: 'safe_browsing',
          };
        }
      } else {
        console.error('[url-safety] Safe Browsing HTTP error (fail-open):', resp.status);
      }
    } catch (err) {
      console.error('[url-safety] Safe Browsing check failed (fail-open):', err);
    }
  }

  return { safe: true };
}
