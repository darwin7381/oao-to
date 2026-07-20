// 允許的前端 origin — CORS 與 CSRF 共用同一份權威清單，兩者不會漂移。
// 注意：Origin header 一律是裸 `scheme://host[:port]`（無結尾斜線、無 path），
// 這份清單也必須是同格式才比對得上。

export const ALLOWED_ORIGINS: string[] = [
  'https://app.oao.to',                       // 生產前端（custom domain）
  'https://3a0b408b.oao-to-app.pages.dev',    // Pages 預設網址
  'http://localhost:5173',                    // 本地 dev（Vite）
  'http://localhost:3000',
];

/** origin 是否在允許清單內 */
export function isAllowedOrigin(origin: string | undefined | null): boolean {
  return !!origin && ALLOWED_ORIGINS.includes(origin);
}
