// 短網址 Slug 生成器

const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * 生成隨機 slug
 * @param length 長度（預設 6）
 * @returns 隨機字串（例如：abc123、Xy9Kp2）
 */
export function generateRandomSlug(length: number = 6): string {
  let slug = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    slug += CHARSET[array[i] % CHARSET.length];
  }
  
  return slug;
}

/**
 * 檢查 slug 是否有效
 * @param slug 要檢查的 slug
 * @returns 是否有效
 */
export function isValidSlug(slug: string): boolean {
  // 只允許英數字、連字號、底線
  // 長度 1-50 字元
  return /^[a-zA-Z0-9-_]{1,50}$/.test(slug);
}

/**
 * 生成唯一的 slug（檢查 KV 是否已存在）
 * @param env Cloudflare 環境
 * @param maxAttempts 最大嘗試次數
 * @returns 唯一的 slug
 */
export async function generateUniqueSlug(
  env: { LINKS: KVNamespace },
  maxAttempts: number = 10
): Promise<string> {
  // 先試 6 位
  for (let i = 0; i < maxAttempts; i++) {
    const slug = generateRandomSlug(6);
    const existing = await env.LINKS.get(`link:${slug}`);
    if (!existing) return slug;
  }
  // 6 位衝突多 → 升到 8 位，仍要逐一驗證唯一（不可回未驗證的 slug 覆蓋他人連結）
  for (let i = 0; i < maxAttempts; i++) {
    const slug = generateRandomSlug(8);
    const existing = await env.LINKS.get(`link:${slug}`);
    if (!existing) return slug;
  }
  // 極端情況全部衝突 → 拋錯讓呼叫端回 500，而非靜默覆蓋
  throw new Error('Failed to generate a unique slug after multiple attempts');
}

