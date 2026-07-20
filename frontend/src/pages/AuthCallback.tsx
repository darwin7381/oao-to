import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();
  const [status, setStatus] = useState('處理中...');

  useEffect(() => {
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setStatus('❌ 登入失敗，請重試');
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    // cookie-only：token 由後端寫進 httpOnly cookie（JS 讀不到、不進 URL）。
    // 這裡只要 refreshAuth() → /me（cookie 隨 credentials:'include' 自動帶上）。
    setStatus('✅ 登入成功！驗證中...');
    refreshAuth()
      .then(() => {
        setStatus('✅ 跳轉中...');
        setTimeout(() => navigate('/dashboard'), 300);
      })
      .catch((err) => {
        console.error('[AuthCallback] refreshAuth failed:', err);
        setStatus('❌ 驗證失敗，請重新登入');
        setTimeout(() => navigate('/'), 2000);
      });
    // 只在掛載時執行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold mb-2">登入處理中</h2>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}

