// API Key 生成與驗證工具

export interface ApiKeyResult {
  id: string;
  key: string;
  keyPrefix: string;
  keyHash: string;
}

/**
 * 生成 API Key
 * @param env 環境（live 或 test）
 * @returns API Key 相關資訊（⚠️ key 只返回一次！）
 */
export async function generateApiKey(
  env: 'live' | 'test' = 'live'
): Promise<ApiKeyResult> {
  // 生成 UUID
  const id = crypto.randomUUID();
  
  // 生成 20 字符隨機字符串
  const randomBytes = new Uint8Array(20);
  crypto.getRandomValues(randomBytes);
  const randomPart = Array.from(randomBytes, byte => 
    byte.toString(36).padStart(2, '0')
  ).join('').substring(0, 20);
  
  // 組合完整 Key: oao_{env}_{random}
  const prefix = `oao_${env}_`;
  const key = prefix + randomPart;
  
  // 生成 SHA-256 雜湊
  const keyHash = await hashApiKey(key);
  
  return {
    id,
    key,           // ⚠️ 完整的 API Key，只在創建時返回一次！
    keyPrefix: prefix,
    keyHash,       // 存入資料庫的是這個
  };
}

/**
 * 將 API Key 轉換為 SHA-256 雜湊
 * @param key API Key 字符串
 * @returns 十六進制雜湊值
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 驗證 API Key 格式
 * @param key API Key 字符串
 * @returns 是否有效
 */
export function validateApiKeyFormat(key: string): boolean {
  // 格式: oao_{env}_{20 chars}
  const pattern = /^oao_(live|test)_[a-z0-9]{20}$/;
  return pattern.test(key);
}

/**
 * 提取 API Key 環境
 * @param key API Key 字符串
 * @returns 環境類型（live 或 test）
 */
export function extractApiKeyEnv(key: string): 'live' | 'test' | null {
  if (key.startsWith('oao_live_')) return 'live';
  if (key.startsWith('oao_test_')) return 'test';
  return null;
}


