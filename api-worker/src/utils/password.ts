// 連結密碼雜湊工具（與 core-worker 的 hashPassword 完全一致，兩個 worker 才能互通）

/** SHA-256 hex */
export async function hashPassword(pw: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 驗證連結密碼（向後相容）：
 * 舊資料存明文 → input === stored；新資料存 hash → hash(input) === stored
 */
export async function verifyLinkPassword(input: string, stored: string): Promise<boolean> {
  if (input === stored) return true;
  return (await hashPassword(input)) === stored;
}
