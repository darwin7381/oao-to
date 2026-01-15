import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import UserMenu from '../components/UserMenu';

export default function NewHome() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [url, setUrl] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 檢查 OAuth 錯誤
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'access_denied') {
      setAuthError('您拒絕了授權。請重新登入以繼續使用。');
      setSearchParams({});
    } else if (error === 'auth_failed') {
      setAuthError('登入失敗，請稍後再試。');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);
  
  // 檢查登入狀態並顯示 console
  useEffect(() => {
    console.log('[NewHome] Auth status:', {
      user,
      authLoading,
      token: localStorage.getItem('token') ? 'EXISTS' : 'NONE'
    });
  }, [user, authLoading]);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    // API Worker
    const apiUrl = import.meta.env.PROD 
      ? 'https://api.oao.to/shorten'
      : 'http://localhost:8788/shorten';
    
    // 短網址 base URL（Core Worker）
    const shortUrlBase = import.meta.env.PROD
      ? 'https://oao.to'
      : 'http://localhost:8787';  // core-worker

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          customSlug: showCustom && customSlug ? customSlug : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '創建失敗');
      }

      const data = await response.json();
      // 修正 shortUrl 為正確的域名
      data.shortUrl = data.shortUrl.replace('http://localhost:55458', shortUrlBase);
      setResult(data);
      setUrl('');
      setCustomSlug('');
      setShowCustom(false);
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('✅ 已複製到剪貼簿！');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">OAO.TO</h1>
          <div className="flex gap-3 items-center">
            {user && (
              <Link to="/dashboard" className="btn btn-secondary">
                📊 我的短網址
              </Link>
            )}
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* 登入狀態提示 */}
        {user && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div className="flex-1">
                <h3 className="font-bold text-green-800">已登入</h3>
                <p className="text-sm text-green-600">
                  歡迎回來，{user.name}！您可以開始創建和管理短網址了。
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* 錯誤提示 */}
        {authError && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-red-800">登入失敗</h3>
                <p className="text-sm text-red-600">{authError}</p>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* Debug 資訊（開發用） */}
        {import.meta.env.DEV && (
          <div className="mb-6 p-3 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
            <div className="font-bold mb-1">🔧 Debug Info:</div>
            <div>登入狀態: {user ? '✅ 已登入' : '❌ 未登入'}</div>
            <div>用戶: {user ? user.email : 'N/A'}</div>
            <div>Token: {localStorage.getItem('token') ? '✅ 存在' : '❌ 不存在'}</div>
            <div>載入中: {authLoading ? 'Yes' : 'No'}</div>
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
            快速縮短你的網址
          </h1>
          <p className="text-xl text-gray-600">
            免費、快速、安全 - 基於 Cloudflare 全球網路
          </p>
        </div>

        {/* Main Input Form */}
        <div className="card max-w-3xl mx-auto mb-8">
          <form onSubmit={handleShorten} className="space-y-4">
            <div>
              <input
                type="url"
                required
                placeholder="貼上你的長網址... (例如: https://example.com/very/long/url)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full text-lg px-6 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {/* 自訂 Slug 選項（可摺疊）*/}
            {showCustom && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  自訂短網址代碼（可選）
                </label>
                <div className="flex gap-2">
                  <span className="px-4 py-2 bg-white rounded-lg border text-gray-600">
                    oao.to/
                  </span>
                  <input
                    type="text"
                    placeholder="my-custom-link"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    className="input flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  留空則自動生成隨機代碼（推薦）
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary text-lg px-8 py-4 flex-1 disabled:opacity-50"
              >
                {loading ? '⏳ 生成中...' : '🚀 縮短網址'}
              </button>
              
              {!showCustom && (
                <button
                  type="button"
                  onClick={() => setShowCustom(true)}
                  className="btn btn-secondary px-6"
                >
                  ⚙️ 自訂
                </button>
              )}
              
              {showCustom && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCustom(false);
                    setCustomSlug('');
                  }}
                  className="btn btn-secondary px-6"
                >
                  ✖️ 取消自訂
                </button>
              )}
            </div>
          </form>

          {/* Result Display */}
          {result && (
            <div className="mt-6 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-green-800">
                  ✅ 短網址創建成功！
                </h3>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-green-300 mb-3">
                <div className="flex items-center justify-between">
                  <a
                    href={result.shortUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-2xl font-bold text-blue-600 hover:text-blue-700 break-all"
                  >
                    {result.shortUrl}
                  </a>
                  <button
                    onClick={() => copyToClipboard(result.shortUrl)}
                    className="btn btn-primary ml-4 whitespace-nowrap"
                  >
                    📋 複製
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>📌 原始網址：{result.url}</p>
                <p>🔗 短代碼：{result.slug}</p>
              </div>

              <button
                onClick={() => setResult(null)}
                className="mt-4 text-sm text-blue-600 hover:text-blue-700"
              >
                ➕ 創建另一個短網址
              </button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="text-center p-6">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold mb-2">超快速度</h3>
            <p className="text-sm text-gray-600">
              全球邊緣網路，重定向延遲 &lt; 10ms
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="text-4xl mb-3">🎲</div>
            <h3 className="font-bold mb-2">隨機或自訂</h3>
            <p className="text-sm text-gray-600">
              預設隨機生成，也可自訂專屬代碼
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-bold mb-2">詳細分析</h3>
            <p className="text-sm text-gray-600">
              追蹤點擊數、地理位置、設備類型
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            想要管理你的所有短網址？查看詳細分析？
          </p>
          <Link to="/dashboard" className="btn btn-primary text-lg px-8 py-3">
            前往儀表板
          </Link>
        </div>
      </main>
    </div>
  );
}

