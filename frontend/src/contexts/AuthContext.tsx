import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, ApiError } from '../lib/api';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: () => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const checkAuth = async () => {
    // 認證來源純 httpOnly cookie（JS 讀不到）。不再讀 localStorage token 來決定
    // 要不要打 /me — 一律直接打 /me，cookie 會隨 credentials:'include' 自動帶上，
    // 由後端 cookie 決定是否已登入。舊版 localStorage-only session（無 cookie）
    // 會拿到 401 → 被強制重新登入。

    // 最多嘗試 3 次：只有真的 401（未登入 / token 失效）才視為登出；
    // 其他錯誤（D1 cold start、暫時性 5xx、網路）retry，不清狀態 —
    // 這是「登入常出問題 / 無故被登出」的根因修復
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const userData = await api.getMe();
        setUser(userData);
        // 套用使用者存的語言偏好（users.locale，email 同源）。best-effort：
        // 有存偏好就以它為準（覆蓋本地偵測），沒存/失敗維持本地偵測結果
        api.getLocale().then(({ locale }) => {
          if (locale) {
            import('../i18n').then(({ default: i18n, normalizeAppLocale }) => {
              const target = normalizeAppLocale(locale);
              if (i18n.language !== target) i18n.changeLanguage(target);
            });
          }
        }).catch(() => {});
        // token 欄位保留為相容 shim：許多元件用 `if (!token)` gate 資料載入、
        // 或把 token 放進 [token] effect 依賴。認證已在 cookie，這裡放一個
        // 非機密 sentinel 讓那些 gate 在已登入時通過（真正的憑證在 httpOnly cookie）。
        setToken('cookie');
        setLoading(false);
        return;
      } catch (error) {
        const status = error instanceof ApiError ? error.status : 0;
        if (status === 401) {
          // 未登入或憑證失效：清掉舊版 localStorage token（cookie 由後端管理）
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setLoading(false);
          return;
        }
        // 暫時性錯誤：保留狀態，稍後重試
        console.warn(`[AuthContext] getMe attempt ${attempt + 1} failed (status ${status}), retrying...`);
        if (attempt < 2) await sleep(600 * (attempt + 1));
      }
    }
    // 3 次都失敗（持續性非 401 錯誤）：不登出，讓下次載入或操作重試
    console.error('[AuthContext] getMe failed after retries, keeping session for later retry');
    setLoading(false);
  };

  useEffect(() => {
    checkAuth().catch((error) => {
      console.error('[AuthContext] Unhandled error in checkAuth:', error);
      setLoading(false);
    });
  }, []);

  const login = () => {
    const apiBase = import.meta.env.PROD 
      ? 'https://api.oao.to' 
      : 'http://localhost:8788';
    window.location.href = `${apiBase}/api/auth/google`;
  };

  const logout = async () => {
    // 呼叫後端 logout 清除 httpOnly cookie（JS 無法自行刪 httpOnly cookie）。
    // 後端 POST /api/auth/logout 會 deleteCookie('token') 使其立即失效。
    // credentials:'include' + 跨站 POST → 瀏覽器帶 Origin: https://app.oao.to（在白名單）
    // 通過後端 CSRF Origin 檢查。網路失敗時仍會往下清前端狀態，不阻擋登出。
    const apiBase = import.meta.env.PROD
      ? 'https://api.oao.to'
      : 'http://localhost:8788';
    try {
      const res = await fetch(`${apiBase}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok && res.status !== 404) {
        console.warn('[AuthContext] logout endpoint returned', res.status);
      }
    } catch (err) {
      // 後端可能還沒有此路由（404）或網路失敗 — 不阻擋前端登出。
      console.warn('[AuthContext] logout request failed (backend endpoint may not exist yet):', err);
    }

    // 清除前端狀態 + 舊版 localStorage token，導回首頁。
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, logout, refreshAuth: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
